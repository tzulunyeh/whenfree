import { useCallback, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import type { Participant } from '../lib/types'
import { REALTIME_DISCONNECT_MSG } from '../lib/constants'

const PARTICIPANT_SELECT_COLUMNS = 'id,event_id,name,avatar_seed,created_at'

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

  const reconnectTimerRef = useRef<number | null>(null)
  const [channelVersion, setChannelVersion] = useState(0)

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimerRef.current !== null) return
    reconnectTimerRef.current = window.setTimeout(() => {
      reconnectTimerRef.current = null
      setChannelVersion((prev) => prev + 1)
    }, 1500)
  }, [])

  const loadParticipants = useCallback(async () => {
    if (!eventId) return

    const { data, error } = await supabase
      .from('participants')
      .select(PARTICIPANT_SELECT_COLUMNS)
      .eq('event_id', eventId)

    if (error) {
      toast.error('載入參與者失敗')
      setState((prev) => (
        prev.lastEventId !== eventId
          ? prev
          : { ...prev, participants: [], loading: false }
      ))
      return
    }

    setState((prev) => (
      prev.lastEventId !== eventId
        ? prev
        : { ...prev, participants: (data as Participant[]) ?? [], loading: false }
    ))
  }, [eventId])

  useEffect(() => {
    if (!eventId) return
    let cancelled = false

    supabase
      .from('participants')
      .select(PARTICIPANT_SELECT_COLUMNS)
      .eq('event_id', eventId)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          toast.error('載入參與者失敗')
          setState((prev) => (
            prev.lastEventId !== eventId
              ? prev
              : { ...prev, participants: [], loading: false }
          ))
          return
        }
        setState((prev) => (
          prev.lastEventId !== eventId
            ? prev
            : { ...prev, participants: (data as Participant[]) ?? [], loading: false }
        ))
      })

    return () => {
      cancelled = true
    }
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
            if (prev.lastEventId !== eventId) return prev
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
          setState((prev) => (
            prev.lastEventId !== eventId
              ? prev
              : { ...prev, participants: prev.participants.filter((p) => p.id !== old.id) }
          ))
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          void loadParticipants()
          return
        }

        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          toast.error(REALTIME_DISCONNECT_MSG)
          void loadParticipants()
          scheduleReconnect()
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [eventId, channelVersion, loadParticipants, scheduleReconnect])

  useEffect(() => {
    return () => {
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
    }
  }, [])

  async function deleteParticipant(id: string, onRollback?: () => void) {
    let removed: Participant | undefined
    setState((prev) => {
      if (prev.lastEventId !== eventId) return prev
      removed = prev.participants.find((p) => p.id === id)
      return { ...prev, participants: prev.participants.filter((p) => p.id !== id) }
    })

    const { error } = await supabase.from('participants').delete().eq('id', id)
    if (error) {
      toast.error('刪除失敗')
      const recovered = removed
      if (recovered) {
        setState((prev) => (
          prev.lastEventId !== eventId
            ? prev
            : { ...prev, participants: [...prev.participants, recovered] }
        ))
      }
      onRollback?.()
    }
  }

  function addParticipant(p: Participant) {
    setState((prev) => {
      if (prev.lastEventId !== eventId) return prev
      if (prev.participants.some((x) => x.id === p.id)) return prev
      return { ...prev, participants: [...prev.participants, p] }
    })
  }

  return { participants: state.participants, loading: state.loading, deleteParticipant, addParticipant }
}
