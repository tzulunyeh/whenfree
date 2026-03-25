import { formatDateLabel } from '../../lib/slots'
import TimeSlotCell from './TimeSlotCell'

interface Props {
  date: string
  slots: number[]
  selectedSlots: Set<number>
  anchorSlot: number | null
  previewSlots: Set<number>
  isDeselecting: boolean
  onSlotTap: (slot: number) => void
  onSlotHover: (slot: number) => void
}

export default function DayColumn({
  date, slots, selectedSlots, anchorSlot, previewSlots, isDeselecting, onSlotTap, onSlotHover,
}: Props) {
  const { dayLabel, dateLabel } = formatDateLabel(date)

  return (
    <div className="flex flex-col min-w-[52px]">
      <div className="text-center py-1 border-b border-gray-200 sticky top-0 bg-white z-10">
        <div className="text-xs text-gray-500">{dayLabel}</div>
        <div className="text-sm font-medium text-gray-800">{dateLabel}</div>
      </div>
      {slots.map((slot) => (
        <TimeSlotCell
          key={slot}
          selected={selectedSlots.has(slot)}
          isAnchor={anchorSlot === slot}
          isPreview={previewSlots.has(slot)}
          isDeselecting={isDeselecting}
          onTap={() => onSlotTap(slot)}
          onHover={() => onSlotHover(slot)}
        />
      ))}
    </div>
  )
}
