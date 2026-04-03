import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import type { Participant } from '../lib/types'
import { REALTIME_DISCONNECT_MSG } from '../lib/constants'

export function useParticipants(eventId: string) {
  const [state, setState] = useState<{
    participants: Participant[]
    loading: boolean
    lastEventId: string
  }>({
    participants: [],
    loading: true,
    lastEventId: eventId
  })

  // Reset when eventId changes
  if (state.lastEventId !== eventId) {
    setState({ participants: [], loading: true, lastEventId: eventId })
  }

  useEffect(() => {
    if (!eventId) return
    let cancelled = false

    supabase
      .from('participants')
      .select('*')
      .eq('event_id', eventId)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) toast.error('載入參與者失敗')
        setState(prev => ({
          ...prev,
          participants: (data as Participant[]) ?? [],
          loading: false
        }))
      })

    return () => { cancelled = true }
  }, [eventId])

  useEffect(() => {
    if (!eventId) return

    const channel = supabase
      .channel(`participants:${eventId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'participants', filter: `event_id=eq.${eventId}` },
        (payload) => {
          setState((prev) => {
            const newP = payload.new as Participant
            if (prev.participants.some((p) => p.id === newP.id)) return prev
            return { ...prev, participants: [...prev.participants, newP] }
          })
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'participants', filter: `event_id=eq.${eventId}` },
        (payload) => {
          const old = payload.old as { id: string }
          setState((prev) => ({ ...prev, participants: prev.participants.filter((p) => p.id !== old.id) }))
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          toast.error(REALTIME_DISCONNECT_MSG)
        }
      })

    return () => { supabase.removeChannel(channel) }
  }, [eventId])

  async function deleteParticipant(id: string, onRollback?: () => void) {
    let removed: Participant | undefined
    setState((prev) => {
      removed = prev.participants.find((p) => p.id === id)
      return { ...prev, participants: prev.participants.filter((p) => p.id !== id) }
    })
    const { error } = await supabase.from('participants').delete().eq('id', id)
    if (error) {
      toast.error('刪除失敗')
      if (removed) setState((prev) => ({ ...prev, participants: [...prev.participants, removed!] }))
      onRollback?.()
    }
  }

  function addParticipant(p: Participant) {
    setState((prev) => ({
      ...prev,
      participants: prev.participants.some((x) => x.id === p.id) ? prev.participants : [...prev.participants, p]
    }))
  }

  return { participants: state.participants, loading: state.loading, deleteParticipant, addParticipant }
}
