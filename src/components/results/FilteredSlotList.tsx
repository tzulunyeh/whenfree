import { useMemo } from 'react'
import { findMatchingSlots, groupSlots, formatSlotLine } from '../../lib/filterSlots'
import type { Event, Selection, Participant } from '../../lib/types'
import CopyButton from '../ui/CopyButton'

interface Props {
  event: Event
  selections: Selection[]
  participants: Participant[]
  excludedParticipantIds: string[]
  minDurationSlots: number
  minAttendance: number
}

export default function FilteredSlotList({
  event, selections, participants, excludedParticipantIds, minDurationSlots, minAttendance
}: Props) {
  const { dates, earliest_time, latest_time } = event
  const includedCount = useMemo(
    () => participants.filter((p) => !new Set(excludedParticipantIds).has(p.id)).length,
    [participants, excludedParticipantIds]
  )
  const groups = useMemo(() => {
    const excludedSet = new Set(excludedParticipantIds)
    const includedParticipants = participants.filter((p) => !excludedSet.has(p.id))
    const includedSelections = selections.filter((s) => !excludedSet.has(s.participant_id))
    const slots = findMatchingSlots(
      dates,
      includedSelections,
      includedParticipants,
      earliest_time,
      latest_time,
      minDurationSlots,
      minAttendance
    )
    return groupSlots(slots)
  }, [dates, selections, participants, excludedParticipantIds, earliest_time, latest_time, minDurationSlots, minAttendance])

  if (participants.length === 0) {
    return <p className="text-sm text-gray-400">等待參與者填寫…</p>
  }

  if (includedCount === 0) {
    return <p className="text-sm text-gray-400">請至少保留 1 位成員參與計算</p>
  }

  if (groups.length === 0) {
    return <p className="text-sm text-gray-400">沒有符合條件的時段，試試放寬篩選條件</p>
  }

  return (
    <div className="space-y-3">
      {groups.map((group) => {
        const isAllPresent = group.absenteeCount === 0
        const formattedLines = group.slots.map(formatSlotLine)
        const copyText = group.slots
          .map((s, i) => s.absentees.length > 0 ? `${formattedLines[i]}（缺：${s.absentees.join('、')}）` : formattedLines[i])
          .join('\n')
        return (
          <div
            key={group.absenteeCount}
            className={`p-3 rounded-xl space-y-1.5 ${
              isAllPresent ? 'bg-emerald-50 border border-emerald-100' : 'bg-gray-50 border border-gray-100'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className={`text-xs font-semibold ${isAllPresent ? 'text-emerald-700' : 'text-orange-600'}`}>
                {isAllPresent ? '全員出席' : `缺 ${group.absenteeCount} 人`}
              </span>
              <CopyButton text={copyText} />
            </div>
            {group.slots.map((slot, j) => (
              <div key={`${slot.date}-${slot.startSlot}`}>
                <div className={`text-sm ${isAllPresent ? 'text-emerald-800' : 'text-gray-700'}`}>
                  {formattedLines[j]}
                </div>
                {slot.absentees.length > 0 && (
                  <div className="text-xs text-orange-500">缺：{slot.absentees.join('、')}</div>
                )}
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
