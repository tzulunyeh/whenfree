import type { Event, Selection } from '../../lib/types'
import { slotToTime, slotRange } from '../../lib/slots'

interface Props {
  event: Event
  mySelections: Selection[]
  onAddSlots: (date: string, slots: number[]) => void
  onRemoveSlots: (date: string, slots: number[]) => void
}

export default function QuickSelectButtons({ event, mySelections, onAddSlots, onRemoveSlots }: Props) {
  if (event.quick_segments.length === 0) return null

  function handleSegmentToggle(start: number, end: number) {
    const effectiveStart = Math.max(start, event.earliest_time)
    const effectiveEnd = Math.min(end, event.latest_time)
    if (effectiveStart >= effectiveEnd) return
    const segSlots = slotRange(effectiveStart, effectiveEnd)
    const slotsByDate = new Map<string, Set<number>>()
    for (const s of mySelections) {
      if (!slotsByDate.has(s.date)) slotsByDate.set(s.date, new Set())
      slotsByDate.get(s.date)!.add(s.slot)
    }
    const allSelected = event.dates.every((date) => {
      const myDateSlots = slotsByDate.get(date) ?? new Set()
      return segSlots.every((slot) => myDateSlots.has(slot))
    })

    event.dates.forEach((date) => {
      if (allSelected) {
        onRemoveSlots(date, segSlots)
      } else {
        onAddSlots(date, segSlots)
      }
    })
  }

  return (
    <div className="flex flex-wrap gap-2 mb-3">
      {event.quick_segments.map((seg, i) => (
        <button
          key={i}
          type="button"
          onClick={() => handleSegmentToggle(seg.start, seg.end)}
          className="px-3 py-1.5 text-sm rounded-full border border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 transition-colors"
        >
          {seg.name} {slotToTime(seg.start)}–{slotToTime(seg.end)}
        </button>
      ))}
    </div>
  )
}
