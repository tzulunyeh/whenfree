import { useEffect, useRef, useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import type { Selection } from '../lib/types'
import { REALTIME_DISCONNECT_MSG } from '../lib/constants'

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

  useEffect(() => {
    if (!eventId) return
    let cancelled = false

    supabase
      .from('selections')
      .select('*')
      .eq('event_id', eventId)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) toast.error('載入時間選擇失敗')
        setState(prev => ({
          ...prev,
          selections: (data as Selection[]) ?? [],
          loading: false
        }))
      })

    return () => { cancelled = true }
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
          // Dedupe by id to handle multi-tab sync for same account
          setState((prev) => ({ 
            ...prev, 
            selections: prev.selections.some((s) => s.id === row.id) ? prev.selections : [...prev.selections, row]
          }))
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'selections', filter: `event_id=eq.${eventId}` },
        (payload) => {
          const row = payload.old as { id: string }
          setState((prev) => ({ ...prev, selections: prev.selections.filter((s) => s.id !== row.id) }))
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          toast.error(REALTIME_DISCONNECT_MSG)
        }
      })

    return () => { supabase.removeChannel(channel) }
  }, [eventId])

  const addSlots = useCallback(async (date: string, slots: number[]) => {
    if (!participantId || slots.length === 0) return
    const uniqueSlots = [...new Set(slots)]

    const rows = uniqueSlots.map((slot) => ({
      participant_id: participantId,
      event_id: eventId,
      date,
      slot,
    }))

    const tempIds = uniqueSlots.map((slot) => `temp-${date}-${slot}`)
    const optimistic: Selection[] = rows.map((r, i) => ({ ...r, id: tempIds[i] }))
    setState((prev) => {
      const existing = new Set(
        prev.selections.filter((s) => s.participant_id === participantId && s.date === date).map((s) => s.slot)
      )
      return { ...prev, selections: [...prev.selections, ...optimistic.filter((o) => !existing.has(o.slot))] }
    })

    const { data, error } = await supabase
      .from('selections')
      .upsert(rows, { onConflict: 'participant_id,date,slot', ignoreDuplicates: true })
      .select()

    if (error) {
      setState((prev) => ({ ...prev, selections: prev.selections.filter((s) => !tempIds.includes(s.id)) }))
      toast.error('儲存失敗，請重試')
      return
    }

    if (data && data.length > 0) {
      // Normal upsert: replace temp entries with real data
      setState((prev) => ({
        ...prev,
        selections: [
          ...prev.selections.filter((s) => !tempIds.includes(s.id)),
          ...(data as Selection[]),
        ]
      }))
    } else {
      // Empty array = ignoreDuplicates skipped, re-fetch real IDs to replace temp
      const { data: synced, error: syncError } = await supabase
        .from('selections')
        .select('*')
        .eq('event_id', eventId)
        .eq('participant_id', participantId)
        .eq('date', date)
        .in('slot', uniqueSlots)

      if (syncError) {
        setState((prev) => ({ ...prev, selections: prev.selections.filter((s) => !tempIds.includes(s.id)) }))
        toast.error('同步失敗，請重試')
        return
      }

      if (synced && synced.length > 0) {
        setState((prev) => {
          const withoutTemp = prev.selections.filter((s) => !tempIds.includes(s.id))
          // Dedupe by id to avoid duplicates in drag scenarios
          const existingIds = new Set(withoutTemp.map((s) => s.id))
          const newSelections = (synced as Selection[]).filter((s) => !existingIds.has(s.id))
          return { ...prev, selections: [...withoutTemp, ...newSelections] }
        })
      } else {
        // Re-fetch succeeded but returned empty array, clear temp and show error
        setState((prev) => ({ ...prev, selections: prev.selections.filter((s) => !tempIds.includes(s.id)) }))
        toast.error('資料同步異常，請重新整理')
      }
    }
  }, [eventId, participantId])

  const removeSlots = useCallback(async (date: string, slots: number[]) => {
    if (!participantId || slots.length === 0) return

    const toRemove = selectionsRef.current.filter(
      (s) => s.participant_id === participantId && s.date === date && slots.includes(s.slot)
    )
    const idsToRemove = toRemove.map((s) => s.id)

    setState((prev) => ({ ...prev, selections: prev.selections.filter((s) => !idsToRemove.includes(s.id)) }))

    const { error } = await supabase
      .from('selections')
      .delete()
      .in('id', idsToRemove)

    if (error) {
      setState((prev) => ({ ...prev, selections: [...prev.selections, ...toRemove] }))
      toast.error('取消失敗，請重試')
    }
  }, [participantId])

  const removeByParticipantId = useCallback((pid: string): Selection[] => {
    // Use ref snapshot to get stable removed items before state update
    const removed = selectionsRef.current.filter((s) => s.participant_id === pid)
    setState((prev) => ({ ...prev, selections: prev.selections.filter((s) => s.participant_id !== pid) }))
    return removed
  }, [])

  const restoreSelections = useCallback((items: Selection[]) => {
    if (items.length === 0) return
    setState((prev) => {
      const existingIds = new Set(prev.selections.map((s) => s.id))
      const toAdd = items.filter((s) => !existingIds.has(s.id))
      return { ...prev, selections: [...prev.selections, ...toAdd] }
    })
  }, [])

  return { selections: state.selections, loading: state.loading, addSlots, removeSlots, removeByParticipantId, restoreSelections }
}
