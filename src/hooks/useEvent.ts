import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Event } from '../lib/types'

const EVENT_SELECT_COLUMNS = 'id,slug,name,dates,earliest_time,latest_time,quick_segments,admin_only_creator,created_at'

export function useEvent(slug: string) {
  const [state, setState] = useState<{
    event: Event | null
    loading: boolean
    error: string | null
    lastSlug: string
  }>({
    event: null,
    loading: true,
    error: null,
    lastSlug: slug
  })

  // Reset when slug changes
  if (state.lastSlug !== slug) {
    setState({ event: null, loading: true, error: null, lastSlug: slug })
  }

  useEffect(() => {
    let cancelled = false

    supabase
      .from('events')
      .select(EVENT_SELECT_COLUMNS)
      .eq('slug', slug)
      .single()
      .then(({ data, error: err }) => {
        if (cancelled) return
        if (err) {
          // PGRST116 = no rows returned (not found)
          const isNotFound = err.code === 'PGRST116'
          setState(prev => ({
            ...prev,
            error: isNotFound ? '找不到活動' : '網路錯誤，請重試',
            event: null,
            loading: false
          }))
        } else if (!data) {
          setState(prev => ({ ...prev, error: '找不到活動', event: null, loading: false }))
        } else {
          setState(prev => ({ ...prev, event: data as Event, error: null, loading: false }))
        }
      })

    return () => { cancelled = true }
  }, [slug])

  return { event: state.event, loading: state.loading, error: state.error }
}
