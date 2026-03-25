import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import type { Participant } from '../lib/types'
import { REALTIME_DISCONNECT_MSG } from '../lib/constants'

export function useParticipants(eventId: string) {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!eventId) return
    let cancelled = false
    setLoading(true)

    supabase
      .from('participants')
      .select('*')
      .eq('event_id', eventId)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) toast.error('載入參與者失敗')
        else setParticipants((data as Participant[]) ?? [])
        setLoading(false)
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
          setParticipants((prev) => {
            const newP = payload.new as Participant
            if (prev.some((p) => p.id === newP.id)) return prev
            return [...prev, newP]
          })
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          toast.error(REALTIME_DISCONNECT_MSG)
        }
      })

    return () => { supabase.removeChannel(channel) }
  }, [eventId])

  return { participants, loading }
}
