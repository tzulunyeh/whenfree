import { useState, useMemo } from 'react'
import {
  format, addMonths, subMonths,
  startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, isSameDay, isBefore, startOfDay, isWithinInterval,
} from 'date-fns'
import { zhTW } from 'date-fns/locale'

interface Props {
  selected: Date[]
  onChange: (dates: Date[]) => void
}

const WEEK_DAYS = ['日', '一', '二', '三', '四', '五', '六']
const today = startOfDay(new Date())

export default function DatePicker({ selected, onChange }: Props) {
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()))
  const [anchor, setAnchor] = useState<Date | null>(null)
  const [hoverDate, setHoverDate] = useState<Date | null>(null)

  const days = eachDayOfInterval({ start: startOfMonth(viewMonth), end: endOfMonth(viewMonth) })
  const startOffset = getDay(days[0])

  const selectedSet = useMemo(
    () => new Set(selected.map((d) => format(d, 'yyyy-MM-dd'))),
    [selected]
  )

  function isPast(day: Date) {
    return isBefore(day, today)
  }

  function isSelected(day: Date) {
    return selectedSet.has(format(day, 'yyyy-MM-dd'))
  }

  function isInPreview(day: Date): boolean {
    if (!anchor || !hoverDate || isPast(day)) return false
    const [lo, hi] = anchor <= hoverDate ? [anchor, hoverDate] : [hoverDate, anchor]
    return isWithinInterval(day, { start: lo, end: hi })
  }

  function handleDayClick(day: Date) {
    if (isPast(day)) return

    if (!anchor) {
      setAnchor(day)
      return
    }

    const [lo, hi] = anchor <= day ? [anchor, day] : [day, anchor]
    const range = eachDayOfInterval({ start: lo, end: hi }).filter((d) => !isPast(d))

    const allSelected = range.every((d) => isSelected(d))
    let next: Date[]
    if (allSelected) {
      next = selected.filter((s) => !range.some((d) => isSameDay(s, d)))
    } else {
      const existing = selected.filter((s) => !range.some((d) => isSameDay(s, d)))
      next = [...existing, ...range]
    }

    onChange(next.sort((a, b) => a.getTime() - b.getTime()))
    setAnchor(null)
    setHoverDate(null)
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">選擇日期（可多選）</label>

      <div className="border border-gray-200 rounded-xl p-3 bg-white">
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={() => setViewMonth((m) => subMonths(m, 1))}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 text-lg"
          >
            ‹
          </button>
          <span className="text-sm font-medium text-gray-800">
            {format(viewMonth, 'yyyy年 M月', { locale: zhTW })}
          </span>
          <button
            type="button"
            onClick={() => setViewMonth((m) => addMonths(m, 1))}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 text-lg"
          >
            ›
          </button>
        </div>

        <div className="grid grid-cols-7 mb-1">
          {WEEK_DAYS.map((d) => (
            <div key={d} className="text-center text-xs text-gray-400 py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {Array.from({ length: startOffset }).map((_, i) => (
            <div key={`pad-${i}`} />
          ))}
          {days.map((day) => {
            const past = isPast(day)
            const sel = isSelected(day)
            const isAnchor = anchor != null && isSameDay(day, anchor)
            const preview = isInPreview(day)

            let cellClass = 'h-9 w-full rounded-full text-sm flex items-center justify-center transition-colors select-none '

            if (past) {
              cellClass += 'text-gray-300 cursor-default'
            } else if (isAnchor) {
              cellClass += 'bg-emerald-400 text-white font-medium animate-pulse cursor-pointer'
            } else if (sel) {
              cellClass += 'bg-emerald-500 text-white font-medium cursor-pointer'
            } else if (preview) {
              cellClass += 'bg-emerald-100 text-emerald-800 cursor-pointer'
            } else {
              cellClass += 'text-gray-700 hover:bg-gray-100 cursor-pointer'
            }

            return (
              <div
                key={day.toISOString()}
                className={cellClass}
                onPointerDown={() => handleDayClick(day)}
                onPointerEnter={() => { if (anchor) setHoverDate(day) }}
              >
                {format(day, 'd')}
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex items-center justify-between min-h-[1.25rem]">
        {anchor ? (
          <p className="text-xs text-emerald-600 font-medium">點擊結束日期以選取範圍</p>
        ) : selected.length > 0 ? (
          <p className="text-xs text-gray-500">已選 {selected.length} 天</p>
        ) : (
          <span />
        )}
        {selected.length > 0 && !anchor && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-xs text-red-400 hover:text-red-600"
          >
            清除全部
          </button>
        )}
      </div>
    </div>
  )
}
