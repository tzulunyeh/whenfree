import { useEffect, useRef, useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import type { Selection } from '../lib/types'
import { REALTIME_DISCONNECT_MSG } from '../lib/constants'

const SELECTION_KEY_SEPARATOR = '\0'
const RECONNECT_DELAY_MS = 1500

function selectionTupleKey(selection: Pick<Selection, 'participant_id' | 'date' | 'slot'>): string {
  return `${selection.participant_id}${SELECTION_KEY_SEPARATOR}${selection.date}${SELECTION_KEY_SEPARATOR}${selection.slot}`
}

function mergeSelectionsByTuple(existing: Selection[], incoming: Selection[]): Selection[] {
  const byTuple = new Map<string, Selection>()
  for (const item of existing) {
    byTuple.set(selectionTupleKey(item), item)
  }
  for (const item of incoming) {
    byTuple.set(selectionTupleKey(item), item)
  }
  return [...byTuple.values()]
}

export function useSelections(eventId: string, participantId: string) {
  const [state, setState] = useState<{
    selections: Selection[]
    loading: boolean
    lastEventId: string
  }>({
    selections: [],
    loading: true,
    lastEventId: eventId
  })
  const selectionsRef = useRef(state.selections)

  useEffect(() => { selectionsRef.current = state.selections }, [state.selections])

  // Reset when eventId changes
  if (state.lastEventId !== eventId) {
    setState({ selections: [], loading: true, lastEventId: eventId })
  }

  const reconnectTimerRef = useRef<number | null>(null)
  const [channelVersion, setChannelVersion] = useState(0)

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimerRef.current !== null) return
    reconnectTimerRef.current = window.setTimeout(() => {
      reconnectTimerRef.current = null
      setChannelVersion((prev) => prev + 1)
    }, RECONNECT_DELAY_MS)
  }, [])

  const loadAllSelections = useCallback(async () => {
    if (!eventId) return

    const all: Selection[] = []
    let from = 0
    const PAGE_SIZE = 1000

    while (true) {
      const to = from + PAGE_SIZE - 1
      const { data, error } = await supabase
        .from('selections')
        .select('*')
        .eq('event_id', eventId)
        .order('id', { ascending: true })
        .range(from, to)

      if (error) {
        toast.error('載入時間選擇失敗')
        setState((prev) => (
          prev.lastEventId !== eventId
            ? prev
            : { ...prev, selections: [], loading: false }
        ))
        return
      }

      const batch = (data as Selection[]) ?? []
      all.push(...batch)

      if (batch.length < PAGE_SIZE) break
      from += PAGE_SIZE
    }

    setState((prev) => (
      prev.lastEventId !== eventId
        ? prev
        : { ...prev, selections: mergeSelectionsByTuple([], all), loading: false }
    ))
  }, [eventId])

  useEffect(() => {
    if (!eventId) return
    let cancelled = false
    const PAGE_SIZE = 1000

    async function initialLoadSelections() {
      const all: Selection[] = []
      let from = 0

      while (true) {
        const to = from + PAGE_SIZE - 1
        const { data, error } = await supabase
          .from('selections')
          .select('*')
          .eq('event_id', eventId)
          .order('id', { ascending: true })
          .range(from, to)

        if (cancelled) return

        if (error) {
          toast.error('載入時間選擇失敗')
          setState((prev) => (
            prev.lastEventId !== eventId
              ? prev
              : { ...prev, selections: [], loading: false }
          ))
          return
        }

        const batch = (data as Selection[]) ?? []
        all.push(...batch)

        if (batch.length < PAGE_SIZE) break
        from += PAGE_SIZE
      }

      if (cancelled) return
      setState((prev) => (
        prev.lastEventId !== eventId
          ? prev
          : { ...prev, selections: mergeSelectionsByTuple([], all), loading: false }
      ))
    }

    void initialLoadSelections()

    return () => {
      cancelled = true
    }
  }, [eventId])

  useEffect(() => {
    if (!eventId) return

    const channel = supabase
      .channel(`selections:${eventId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'selections', filter: `event_id=eq.${eventId}` },
        (payload) => {
          const row = payload.new as Selection
          setState((prev) => (
            prev.lastEventId !== eventId
              ? prev
              : { ...prev, selections: mergeSelectionsByTuple(prev.selections, [row]) }
          ))
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'selections', filter: `event_id=eq.${eventId}` },
        (payload) => {
          const row = payload.old as { id: string }
          setState((prev) => (
            prev.lastEventId !== eventId
              ? prev
              : { ...prev, selections: prev.selections.filter((s) => s.id !== row.id) }
          ))
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          void loadAllSelections()
          return
        }

        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          toast.error(REALTIME_DISCONNECT_MSG)
          void loadAllSelections()
          scheduleReconnect()
        }
      })

    return () => { supabase.removeChannel(channel) }
  }, [eventId, channelVersion, loadAllSelections, scheduleReconnect])

  useEffect(() => {
    return () => {
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
    }
  }, [])

  const addSlotsAcrossDates = useCallback(async (dates: string[], slots: number[]) => {
    if (!participantId || dates.length === 0 || slots.length === 0) return

    const uniqueDates = [...new Set(dates)]
    const uniqueSlots = [...new Set(slots)]

    const rows = uniqueDates.flatMap((date) =>
      uniqueSlots.map((slot) => ({
        participant_id: participantId,
        event_id: eventId,
        date,
        slot,
      }))
    )

    const optimisticRequestId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const tempIds = rows.map((row, index) => `temp-${optimisticRequestId}-${row.date}-${row.slot}-${index}`)
    const optimistic: Selection[] = rows.map((row, index) => ({ ...row, id: tempIds[index] }))

    setState((prev) => {
      if (prev.lastEventId !== eventId) return prev
      return { ...prev, selections: mergeSelectionsByTuple(prev.selections, optimistic) }
    })

    const { data, error } = await supabase
      .from('selections')
      .upsert(rows, { onConflict: 'participant_id,date,slot', ignoreDuplicates: true })
      .select()

    if (error) {
      setState((prev) => (
        prev.lastEventId !== eventId
          ? prev
          : { ...prev, selections: prev.selections.filter((s) => !tempIds.includes(s.id)) }
      ))
      toast.error('儲存失敗，請重試')
      return
    }

    if (data && data.length > 0) {
      const insertedSelections = data as Selection[]
      setState((prev) => {
        if (prev.lastEventId !== eventId) return prev
        return {
          ...prev,
          selections: mergeSelectionsByTuple(
            prev.selections.filter((s) => !tempIds.includes(s.id)),
            insertedSelections
          ),
        }
      })
      return
    }

    const { data: synced, error: syncError } = await supabase
      .from('selections')
      .select('*')
      .eq('event_id', eventId)
      .eq('participant_id', participantId)
      .in('date', uniqueDates)
      .in('slot', uniqueSlots)

    if (syncError) {
      setState((prev) => (
        prev.lastEventId !== eventId
          ? prev
          : { ...prev, selections: prev.selections.filter((s) => !tempIds.includes(s.id)) }
      ))
      toast.error('同步失敗，請重試')
      return
    }

    if (synced && synced.length > 0) {
      const syncedSelections = synced as Selection[]
      setState((prev) => {
        if (prev.lastEventId !== eventId) return prev
        return {
          ...prev,
          selections: mergeSelectionsByTuple(
            prev.selections.filter((s) => !tempIds.includes(s.id)),
            syncedSelections
          ),
        }
      })
      return
    }

    setState((prev) => (
      prev.lastEventId !== eventId
        ? prev
        : { ...prev, selections: prev.selections.filter((s) => !tempIds.includes(s.id)) }
    ))
    toast.error('資料同步異常，請重新整理')
  }, [eventId, participantId])

  const addSlots = useCallback((date: string, slots: number[]) => {
    void addSlotsAcrossDates([date], slots)
  }, [addSlotsAcrossDates])

  const removeSlotsAcrossDates = useCallback(async (dates: string[], slots: number[]) => {
    if (!participantId || dates.length === 0 || slots.length === 0) return

    const uniqueDates = [...new Set(dates)]
    const uniqueSlots = [...new Set(slots)]

    const datesSet = new Set(uniqueDates)
    const slotsSet = new Set(uniqueSlots)

    const toRemove = selectionsRef.current.filter(
      (s) => s.participant_id === participantId && datesSet.has(s.date) && slotsSet.has(s.slot)
    )
    if (toRemove.length === 0) return

    const idsToRemove = toRemove.map((s) => s.id)

    setState((prev) => (
      prev.lastEventId !== eventId
        ? prev
        : { ...prev, selections: prev.selections.filter((s) => !idsToRemove.includes(s.id)) }
    ))

    const { error } = await supabase
      .from('selections')
      .delete()
      .in('id', idsToRemove)

    if (error) {
      setState((prev) => (
        prev.lastEventId !== eventId
          ? prev
          : { ...prev, selections: mergeSelectionsByTuple(prev.selections, toRemove) }
      ))
      toast.error('取消失敗，請重試')
    }
  }, [eventId, participantId])

  const removeSlots = useCallback((date: string, slots: number[]) => {
    void removeSlotsAcrossDates([date], slots)
  }, [removeSlotsAcrossDates])

  const removeByParticipantId = useCallback((pid: string): Selection[] => {
    const removed = selectionsRef.current.filter((s) => s.participant_id === pid)
    setState((prev) => (
      prev.lastEventId !== eventId
        ? prev
        : { ...prev, selections: prev.selections.filter((s) => s.participant_id !== pid) }
    ))
    return removed
  }, [eventId])

  const restoreSelections = useCallback((items: Selection[]) => {
    if (items.length === 0) return
    setState((prev) => {
      if (prev.lastEventId !== eventId) return prev
      return { ...prev, selections: mergeSelectionsByTuple(prev.selections, items) }
    })
  }, [eventId])

  return {
    selections: state.selections,
    loading: state.loading,
    addSlots,
    removeSlots,
    addSlotsAcrossDates,
    removeSlotsAcrossDates,
    removeByParticipantId,
    restoreSelections,
  }
}
