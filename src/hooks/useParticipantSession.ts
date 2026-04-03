import { useState, useEffect, useCallback } from 'react'
import { STORAGE_SESSION_KEY } from '../lib/constants'
import type { ParticipantSession } from '../lib/types'

export function useParticipantSession(eventId: string) {
  const key = STORAGE_SESSION_KEY(eventId)

  const load = useCallback((): ParticipantSession | null => {
    if (!eventId) return null
    try {
      const raw = localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as ParticipantSession) : null
    } catch {
      return null
    }
  }, [eventId, key])

  const [session, setSession] = useState<ParticipantSession | null>(load)

  // Reload session when eventId changes
  useEffect(() => {
    setSession(load())
  }, [load])

  function saveSession(s: ParticipantSession) {
    localStorage.setItem(key, JSON.stringify(s))
    setSession(s)
  }

  const clearSession = useCallback(() => {
    localStorage.removeItem(key)
    setSession(null)
  }, [key])

  return { session, saveSession, clearSession }
}
