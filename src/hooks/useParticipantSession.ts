import { useState } from 'react'
import { STORAGE_SESSION_KEY } from '../lib/constants'
import type { ParticipantSession } from '../lib/types'

export function useParticipantSession(eventId: string) {
  const key = STORAGE_SESSION_KEY(eventId)

  function load(): ParticipantSession | null {
    try {
      const raw = localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as ParticipantSession) : null
    } catch {
      return null
    }
  }

  const [session, setSession] = useState<ParticipantSession | null>(load)

  function saveSession(s: ParticipantSession) {
    localStorage.setItem(key, JSON.stringify(s))
    setSession(s)
  }

  function clearSession() {
    localStorage.removeItem(key)
    setSession(null)
  }

  return { session, saveSession, clearSession }
}
