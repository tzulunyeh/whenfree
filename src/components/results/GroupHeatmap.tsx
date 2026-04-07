import { useState, useMemo } from 'react'
import { formatDateLabel, slotToTime, slotRange } from '../../lib/slots'
import type { Event, Selection, Participant } from '../../lib/types'
import Avatar from '../ui/Avatar'
import TimeLabels from '../ui/TimeLabels'

const HEATMAP_COLORS = [
  'bg-gray-100',
  'bg-emerald-100',
  'bg-emerald-200',
  'bg-emerald-300',
  'bg-emerald-400',
  'bg-emerald-600',
] as const

interface Props {
  event: Event
  selections: Selection[]
  participants: Participant[]
}

export default function GroupHeatmap({ event, selections, participants }: Props) {
  const [hover, setHover] = useState<{ date: string | null; slot: number | null }>({ date: null, slot: null })

  const totalParticipants = participants.length
  const slots = useMemo(() => slotRange(event.earliest_time, event.latest_time), [event.earliest_time, event.latest_time])

  const participantById = useMemo(() => {
    const map = new Map<string, Participant>()
    for (const p of participants) map.set(p.id, p)
    return map
  }, [participants])

  // Precompute per-cell maps to avoid N+1 per render
  const { countMap, attendeesMap } = useMemo(() => {
    const counts = new Map<string, number>()
    const attendees = new Map<string, Participant[]>()
    const seenSelectionTuples = new Set<string>()

    for (const s of selections) {
      const tupleKey = `${s.participant_id}\0${s.date}\0${s.slot}`
      if (seenSelectionTuples.has(tupleKey)) continue
      seenSelectionTuples.add(tupleKey)

      const key = `${s.date}-${s.slot}`
      counts.set(key, (counts.get(key) ?? 0) + 1)
      const list = attendees.get(key) ?? []
      const p = participantById.get(s.participant_id)
      if (p && !list.some((item) => item.id === p.id)) list.push(p)
      attendees.set(key, list)
    }
    return { countMap: counts, attendeesMap: attendees }
  }, [selections, participantById])

  function countToColor(count: number): string {
    if (count === 0 || totalParticipants === 0) return HEATMAP_COLORS[0]
    const ratio = count / totalParticipants
    if (ratio >= 1)    return HEATMAP_COLORS[5]
    if (ratio >= 0.75) return HEATMAP_COLORS[4]
    if (ratio >= 0.5)  return HEATMAP_COLORS[3]
    if (ratio >= 0.25) return HEATMAP_COLORS[2]
    return HEATMAP_COLORS[1]
  }

  const hoverKey = hover.date != null && hover.slot != null ? `${hover.date}-${hover.slot}` : null

  return (
    <div>
      <div className="overflow-x-auto overscroll-x-contain select-none">
        <div className="flex gap-0.5">
          <TimeLabels slots={slots} />

          {event.dates.map((date) => {
            const { dayLabel, dateLabel } = formatDateLabel(date)
            return (
              <div key={date} className="flex flex-col min-w-[52px]">
                <div className="h-[52px] flex flex-col justify-center text-center border-b border-gray-200 sticky top-0 bg-white z-10">
                  <div className="text-xs text-gray-500">{dayLabel}</div>
                  <div className="text-sm font-medium text-gray-800">{dateLabel}</div>
                </div>
                {slots.map((slot) => {
                  const key = `${date}-${slot}`
                  const count = countMap.get(key) ?? 0
                  const isHovered = hoverKey === key
                  return (
                    <div
                      key={slot}
                      className={`h-7 border-b border-gray-200 cursor-default ${countToColor(count)} ${isHovered ? 'ring-2 ring-inset ring-blue-400' : ''}`}
                      onPointerEnter={() => setHover({ date, slot })}
                      onPointerLeave={() => setHover({ date: null, slot: null })}
                    >
                      {count > 0 && (
                        <span className="flex h-full items-center justify-center text-[10px] font-medium text-emerald-900 opacity-70">
                          {count}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {hoverKey != null && (
        <div className="mt-3 p-3 bg-gray-50 rounded-xl text-sm">
          <p className="font-medium text-gray-700">
            {formatDateLabel(hover.date!).dateLabel} {slotToTime(hover.slot!)}
          </p>
          {(() => {
            const attendees = attendeesMap.get(hoverKey) ?? []
            if (attendees.length === 0) return <p className="text-gray-400">無人可參加</p>
            return (
              <div className="flex gap-1 mt-1 flex-wrap">
                {attendees.map((p) => (
                  <div key={p.id} className="flex items-center gap-1">
                    <Avatar seed={p.avatar_seed} size={20} />
                    <span className="text-gray-600">{p.name}</span>
                  </div>
                ))}
              </div>
            )
          })()}
        </div>
      )}

      <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
        <span>0人</span>
        <div className="flex gap-0.5">
          {HEATMAP_COLORS.map((c) => (
            <div key={c} className={`w-4 h-4 rounded-sm ${c}`} />
          ))}
        </div>
        <span>全員</span>
      </div>
    </div>
  )
}
