import { useMemo } from 'react'
import { slotToTime, ALL_SLOTS, ALL_END_SLOTS } from '../../lib/slots'

interface Props {
  earliestSlot: number
  latestSlot: number
  onEarliestChange: (slot: number) => void
  onLatestChange: (slot: number) => void
}

export default function TimeRangeSelector({ earliestSlot, latestSlot, onEarliestChange, onLatestChange }: Props) {
  const earliestOptions = useMemo(() => ALL_SLOTS.filter((s) => s < latestSlot), [latestSlot])
  const latestOptions = useMemo(() => ALL_END_SLOTS.filter((s) => s > earliestSlot), [earliestSlot])

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">每日時間範圍</label>
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1">最早</label>
          <select
            value={earliestSlot}
            onChange={(e) => onEarliestChange(Number(e.target.value))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {earliestOptions.map((s) => (
              <option key={s} value={s}>{slotToTime(s)}</option>
            ))}
          </select>
        </div>
        <span className="text-gray-400 mt-4">–</span>
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1">最晚</label>
          <select
            value={latestSlot}
            onChange={(e) => onLatestChange(Number(e.target.value))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {latestOptions.map((s) => (
              <option key={s} value={s}>{slotToTime(s)}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
