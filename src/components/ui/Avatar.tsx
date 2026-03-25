interface Props {
  seed: string
  size?: number
  className?: string
}

export default function Avatar({ seed, size = 40, className = '' }: Props) {
  const url = `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`
  return (
    <img
      src={url}
      width={size}
      height={size}
      alt=""
      className={`rounded-full bg-gray-100 ${className}`}
    />
  )
}
