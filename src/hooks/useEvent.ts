import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Event } from '../lib/types'

export function useEvent(slug: string) {
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    // Note: not resetting loading/error here to avoid lint warning
    // Initial state is already loading=true

    supabase
      .from('events')
      .select('*')
      .eq('slug', slug)
      .single()
      .then(({ data, error: err }) => {
        if (cancelled) return
        if (err || !data) {
          setError('找不到活動')
          setEvent(null)
        } else {
          setEvent(data as Event)
          setError(null)
        }
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [slug])

  return { event, loading, error }
}
