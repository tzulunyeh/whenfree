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
        if (err) {
          // PGRST116 = no rows returned (not found)
          const isNotFound = err.code === 'PGRST116'
          setError(isNotFound ? '找不到活動' : '網路錯誤，請重試')
          setEvent(null)
        } else if (!data) {
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
