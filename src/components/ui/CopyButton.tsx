import { useState, useEffect } from 'react'

interface Props {
  text: string
}

export default function CopyButton({ text }: Props) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(timer)
  }, [copied])

  async function handleCopy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
  }

  return (
    <button
      onClick={handleCopy}
      className="text-xs px-2 py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 active:bg-gray-100 transition-colors shrink-0"
    >
      {copied ? '已複製' : '複製'}
    </button>
  )
}
