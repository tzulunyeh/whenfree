import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Event } from '../lib/types'

export function useEvent(slug: string) {
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    supabase
      .from('events')
      .select('*')
      .eq('slug', slug)
      .single()
      .then(({ data, error: err }) => {
        if (cancelled) return
        if (err || !data) {
          setError('找不到活動')
        } else {
          setEvent(data as Event)
        }
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [slug])

  return { event, loading, error }
}
