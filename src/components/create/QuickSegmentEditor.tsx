import { useMemo } from 'react'
import type { QuickSegment } from '../../lib/types'
import { slotToTime, slotRange } from '../../lib/slots'

interface Props {
  segments: QuickSegment[]
  onChange: (segments: QuickSegment[]) => void
  earliestSlot: number
  latestSlot: number
}

export default function QuickSegmentEditor({ segments, onChange, earliestSlot, latestSlot }: Props) {
  function addSegment() {
    onChange([...segments, { name: '', start: earliestSlot, end: latestSlot }])
  }

  function removeSegment(index: number) {
    onChange(segments.filter((_, i) => i !== index))
  }

  function updateSegment(index: number, patch: Partial<QuickSegment>) {
    onChange(segments.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  }

  const slotOptions = useMemo(() => slotRange(earliestSlot, latestSlot + 1), [earliestSlot, latestSlot])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">快捷區段（可選）</span>
        <button
          type="button"
          onClick={addSegment}
          className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
        >
          + 新增
        </button>
      </div>

      {segments.length === 0 && (
        <p className="text-xs text-gray-400">例如「晚上 18:00–22:00」，讓參與者一鍵選取</p>
      )}

      {segments.map((seg, i) => (
        <div key={i} className="flex gap-2 items-center">
          <input
            type="text"
            placeholder="名稱，例如晚上"
            maxLength={20}
            value={seg.name}
            onChange={(e) => updateSegment(i, { name: e.target.value })}
            className="flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <select
            value={seg.start}
            onChange={(e) => updateSegment(i, { start: Number(e.target.value) })}
            className="border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {slotOptions.map((s) => (
              <option key={s} value={s}>{slotToTime(s)}</option>
            ))}
          </select>
          <span className="text-gray-400 text-sm">–</span>
          <select
            value={seg.end}
            onChange={(e) => updateSegment(i, { end: Number(e.target.value) })}
            className="border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {slotOptions.filter((s) => s > seg.start).map((s) => (
              <option key={s} value={s}>{slotToTime(s)}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => removeSegment(i)}
            className="text-red-400 hover:text-red-500 text-lg leading-none px-1"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
