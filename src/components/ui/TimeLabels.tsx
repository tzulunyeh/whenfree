import { slotToTime } from '../../lib/slots'

interface Props {
  slots: number[]
}

export default function TimeLabels({ slots }: Props) {
  return (
    <div className="flex flex-col min-w-[40px] shrink-0">
      <div className="h-[52px]" />
      {slots.map((slot) => (
        <div key={slot} className="h-7 flex items-start justify-end pr-1">
          {slot % 2 === 0 ? (
            <span className="text-[10px] text-gray-400 leading-none">{slotToTime(slot)}</span>
          ) : null}
        </div>
      ))}
    </div>
  )
}
