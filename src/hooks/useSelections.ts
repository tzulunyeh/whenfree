import { useEffect, useRef, useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import type { Selection } from '../lib/types'
import { REALTIME_DISCONNECT_MSG } from '../lib/constants'

export function useSelections(eventId: string, participantId: string) {
  const [selections, setSelections] = useState<Selection[]>([])
  const [loading, setLoading] = useState(true)
  const selectionsRef = useRef(selections)
  selectionsRef.current = selections

  useEffect(() => {
    if (!eventId) return
    let cancelled = false
    setLoading(true)

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
          if (row.participant_id === participantId) return
          setSelections((prev) => [...prev, row])
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'selections', filter: `event_id=eq.${eventId}` },
        (payload) => {
          const row = payload.old as { id: string; participant_id: string }
          if (row.participant_id === participantId) return
          setSelections((prev) => prev.filter((s) => s.id !== row.id))
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          toast.error(REALTIME_DISCONNECT_MSG)
        }
      })

    return () => { supabase.removeChannel(channel) }
  }, [eventId, participantId])

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

    if (data) {
      setSelections((prev) => [
        ...prev.filter((s) => !tempIds.includes(s.id)),
        ...(data as Selection[]),
      ])
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
  }, [eventId, participantId])

  return { selections, loading, addSlots, removeSlots }
}
