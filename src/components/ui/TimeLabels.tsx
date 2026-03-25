import { slotToTime } from '../../lib/slots'

const HEADER_H = 52  // matches h-[52px] spacer in DayColumn header
const CELL_H = 28    // matches h-7 per slot cell

interface Props {
  slots: number[]
}

export default function TimeLabels({ slots }: Props) {
  const startSlot = slots[0]
  const hourBoundaries = [
    ...slots.filter(s => s % 2 === 0),
    slots[slots.length - 1] + 1,
  ]
  const totalH = HEADER_H + slots.length * CELL_H

  return (
    <div className="min-w-[40px] shrink-0 relative" style={{ height: totalH }}>
      {hourBoundaries.map((slot) => (
        <span
          key={slot}
          className="absolute right-1 text-[10px] text-gray-400 leading-none"
          style={{ top: HEADER_H + (slot - startSlot) * CELL_H - 5 }}
        >
          {slotToTime(slot)}
        </span>
      ))}
    </div>
  )
}
