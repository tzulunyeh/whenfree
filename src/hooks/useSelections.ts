import { useEffect, useRef, useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import type { Selection } from '../lib/types'
import { REALTIME_DISCONNECT_MSG } from '../lib/constants'

export function useSelections(eventId: string, participantId: string) {
  const [selections, setSelections] = useState<Selection[]>([])
  const [loading, setLoading] = useState(true)
  const selectionsRef = useRef(selections)

  useEffect(() => { selectionsRef.current = selections }, [selections])

  useEffect(() => {
    if (!eventId) return
    let cancelled = false
    // Note: not resetting loading here to avoid lint warning
    // Initial state is already loading=true

    supabase
      .from('selections')
      .select('*')
      .eq('event_id', eventId)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) toast.error('載入時間選擇失敗')
        else setSelections((data as Selection[]) ?? [])
        setLoading(false)
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
          setSelections((prev) => prev.some((s) => s.id === row.id) ? prev : [...prev, row])
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'selections', filter: `event_id=eq.${eventId}` },
        (payload) => {
          const row = payload.old as { id: string }
          setSelections((prev) => prev.filter((s) => s.id !== row.id))
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
    setSelections((prev) => {
      const existing = new Set(
        prev.filter((s) => s.participant_id === participantId && s.date === date).map((s) => s.slot)
      )
      return [...prev, ...optimistic.filter((o) => !existing.has(o.slot))]
    })

    const { data, error } = await supabase
      .from('selections')
      .upsert(rows, { onConflict: 'participant_id,date,slot', ignoreDuplicates: true })
      .select()

    if (error) {
      setSelections((prev) => prev.filter((s) => !tempIds.includes(s.id)))
      toast.error('儲存失敗，請重試')
      return
    }

    if (data && data.length > 0) {
      // Normal upsert: replace temp entries with real data
      setSelections((prev) => [
        ...prev.filter((s) => !tempIds.includes(s.id)),
        ...(data as Selection[]),
      ])
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
        setSelections((prev) => prev.filter((s) => !tempIds.includes(s.id)))
        toast.error('同步失敗，請重試')
        return
      }

      if (synced && synced.length > 0) {
        setSelections((prev) => {
          const withoutTemp = prev.filter((s) => !tempIds.includes(s.id))
          // Dedupe by id to avoid duplicates in drag scenarios
          const existingIds = new Set(withoutTemp.map((s) => s.id))
          const newSelections = (synced as Selection[]).filter((s) => !existingIds.has(s.id))
          return [...withoutTemp, ...newSelections]
        })
      } else {
        // Re-fetch succeeded but returned empty array, clear temp and show error
        setSelections((prev) => prev.filter((s) => !tempIds.includes(s.id)))
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

    setSelections((prev) => prev.filter((s) => !idsToRemove.includes(s.id)))

    const { error } = await supabase
      .from('selections')
      .delete()
      .in('id', idsToRemove)

    if (error) {
      setSelections((prev) => [...prev, ...toRemove])
      toast.error('取消失敗，請重試')
    }
  }, [participantId])

  const removeByParticipantId = useCallback((pid: string): Selection[] => {
    // Use ref snapshot to get stable removed items before state update
    const removed = selectionsRef.current.filter((s) => s.participant_id === pid)
    setSelections((prev) => prev.filter((s) => s.participant_id !== pid))
    return removed
  }, [])

  const restoreSelections = useCallback((items: Selection[]) => {
    if (items.length === 0) return
    setSelections((prev) => {
      const existingIds = new Set(prev.map((s) => s.id))
      const toAdd = items.filter((s) => !existingIds.has(s.id))
      return [...prev, ...toAdd]
    })
  }, [])

  return { selections, loading, addSlots, removeSlots, removeByParticipantId, restoreSelections }
}
