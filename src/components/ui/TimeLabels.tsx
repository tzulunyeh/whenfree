import { slotToTime } from '../../lib/slots'

interface Props {
  slots: number[]
}

export default function TimeLabels({ slots }: Props) {
  return (
    <div className="flex flex-col min-w-[40px] shrink-0">
      <div className="h-[52px]" />
      {slots.map((slot) => (
        <div key={slot} className="h-7 relative">
          {slot % 2 === 0 && (
            <span className="absolute -top-[5px] right-1 text-[10px] text-gray-400 leading-none">
              {slotToTime(slot)}
            </span>
          )}
        </div>
      ))}
      <div className="relative h-0">
        <span className="absolute -top-[5px] right-1 text-[10px] text-gray-400 leading-none">
          {slotToTime(slots[slots.length - 1] + 1)}
        </span>
      </div>
    </div>
  )
}
