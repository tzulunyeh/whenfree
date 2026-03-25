// DB row types
export interface Event {
  id: string
  slug: string
  name: string
  dates: string[]           // ISO date strings, sorted
  earliest_time: number     // slot index 0-47
  latest_time: number       // slot index 0-47, exclusive
  quick_segments: QuickSegment[]
  admin_only_creator: boolean
  creator_token: string
  created_at: string
}

export interface QuickSegment {
  name: string
  start: number  // slot index
  end: number    // slot index, exclusive
}

export interface Participant {
  id: string
  event_id: string
  name: string
  avatar_seed: string
  created_at: string
}

export interface Selection {
  id: string
  participant_id: string
  event_id: string
  date: string    // ISO date string "YYYY-MM-DD"
  slot: number    // 0-47
}

// App state types
export interface ParticipantSession {
  participantId: string
  name: string
  avatarSeed: string
}

export interface MatchedTimeSlot {
  date: string
  startSlot: number
  endSlot: number      // exclusive
  attendees: Set<string>   // participant ids
  absentees: string[]      // participant names
}
