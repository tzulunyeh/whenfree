interface Props {
  selected: boolean
  isAnchor: boolean
  isPreview: boolean
  isDeselecting: boolean
  onTap: () => void
  onHover: () => void
}

export default function TimeSlotCell({ selected, isAnchor, isPreview, isDeselecting, onTap, onHover }: Props) {
  let bg = 'bg-gray-100 active:bg-gray-200'
  if (isAnchor) bg = isDeselecting ? 'bg-orange-400 animate-pulse' : 'bg-emerald-400 animate-pulse'
  else if (isPreview) bg = isDeselecting ? 'bg-orange-200' : 'bg-emerald-200'
  else if (selected) bg = 'bg-emerald-500'

  return (
    <div
      className={`h-7 border-b border-gray-200 cursor-pointer touch-none ${bg}`}
      onPointerDown={(e) => { e.preventDefault(); onTap() }}
      onPointerEnter={onHover}
    />
  )
}
