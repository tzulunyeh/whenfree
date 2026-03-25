interface Props {
  date: string
  slot: number
  selected: boolean
  isAnchor: boolean
  isPreview: boolean
  isDeselecting: boolean
}

export default function TimeSlotCell({ date, slot, selected, isAnchor, isPreview, isDeselecting }: Props) {
  let bg = 'bg-gray-100'
  if (isAnchor) bg = isDeselecting ? 'bg-orange-400 animate-pulse' : 'bg-emerald-400 animate-pulse'
  else if (isPreview) bg = isDeselecting ? 'bg-orange-200' : 'bg-emerald-200'
  else if (selected) bg = 'bg-emerald-500'

  return (
    <div
      data-date={date}
      data-slot={slot}
      className={`h-7 border-b border-gray-200 ${bg}`}
    />
  )
}
