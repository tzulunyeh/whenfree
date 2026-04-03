import { formatDateLabel, slotToTime } from './slots'
import type { Selection, Participant, MatchedTimeSlot } from './types'

export function findMatchingSlots(
  dates: string[],
  selections: Selection[],
  participants: Participant[],
  earliestTime: number,
  latestTime: number,
  minDurationSlots: number,
  minAttendance: number
): MatchedTimeSlot[] {
  const results: MatchedTimeSlot[] = []

  // Precompute selections lookup: O(|selections|) instead of O(dates×slots×|selections|)
  const selectionsByKey = new Map<string, Set<string>>()
  for (const s of selections) {
    const key = `${s.date}\0${s.slot}`
    if (!selectionsByKey.has(key)) selectionsByKey.set(key, new Set())
    selectionsByKey.get(key)!.add(s.participant_id)
  }

  for (const date of dates) {
    let runStart: number | null = null
    let runAttendees: Set<string> | null = null

    function flushRun(endSlot: number) {
      if (runStart === null || runAttendees === null) return
      if (endSlot - runStart >= minDurationSlots) {
        const absentees = participants
          .filter((p) => !runAttendees!.has(p.id))
          .map((p) => p.name)
        results.push({
          date,
          startSlot: runStart,
          endSlot,
          attendees: new Set(runAttendees),
          absentees,
        })
      }
      runStart = null
      runAttendees = null
    }

    for (let slot = earliestTime; slot < latestTime; slot++) {
      const attendees = selectionsByKey.get(`${date}\0${slot}`) ?? new Set<string>()
      if (attendees.size >= minAttendance) {
        if (runStart === null) {
          // Start a new run
          runStart = slot
          runAttendees = new Set(attendees)
        } else {
          // Continue run: intersect attendees (keep only those present in both)
          for (const id of runAttendees!) {
            if (!attendees.has(id)) runAttendees!.delete(id)
          }
          // If intersection drops below minAttendance, flush and restart
          if (runAttendees!.size < minAttendance) {
            flushRun(slot)
            runStart = slot
            runAttendees = new Set(attendees)
          }
          // Note: we don't flush when someone joins - they just aren't part of this run's attendees
        }
      } else {
        flushRun(slot)
      }
    }
    flushRun(latestTime)
  }

  return results
}


export type SlotGroup = {
  absenteeCount: number
  slots: MatchedTimeSlot[]
}

export function groupSlots(slots: MatchedTimeSlot[]): SlotGroup[] {
  const map = new Map<number, SlotGroup>()
  for (const slot of slots) {
    const count = slot.absentees.length
    if (!map.has(count)) map.set(count, { absenteeCount: count, slots: [] })
    map.get(count)!.slots.push(slot)
  }
  return [...map.values()].sort((a, b) => a.absenteeCount - b.absenteeCount)
}

export function formatSlotLine(slot: MatchedTimeSlot): string {
  const { dayLabel, dateLabel } = formatDateLabel(slot.date)
  return `${dayLabel} ${dateLabel} ${slotToTime(slot.startSlot)}–${slotToTime(slot.endSlot)}`
}
