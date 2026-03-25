import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { nanoid } from 'nanoid'
import { supabase } from '../../lib/supabase'
import type { QuickSegment } from '../../lib/types'
import { timeToSlot } from '../../lib/slots'
import DatePicker from './DatePicker'
import TimeRangeSelector from './TimeRangeSelector'
import QuickSegmentEditor from './QuickSegmentEditor'
import CopyButton from '../ui/CopyButton'

export default function CreateEventForm() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [dates, setDates] = useState<Date[]>([])
  const [earliestSlot, setEarliestSlot] = useState(timeToSlot(12, 0))
  const [latestSlot, setLatestSlot] = useState(timeToSlot(22, 0))
  const [segments, setSegments] = useState<QuickSegment[]>([
    { name: '晚上', start: timeToSlot(18, 0), end: timeToSlot(22, 0) },
  ])
  const [adminOnlyCreator, setAdminOnlyCreator] = useState(false)
  const [loading, setLoading] = useState(false)
  const [createdSlug, setCreatedSlug] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return toast.error('請填入活動名稱')
    if (dates.length === 0) return toast.error('請選擇至少一個日期')

    setLoading(true)
    try {
      const slug = nanoid(8)
      const { error } = await supabase.from('events').insert({
        slug,
        name: name.trim(),
        dates: dates.map((d) => format(d, 'yyyy-MM-dd')),
        earliest_time: earliestSlot,
        latest_time: latestSlot,
        quick_segments: segments,
        admin_only_creator: adminOnlyCreator,
      })
      if (error) throw error
      setCreatedSlug(slug)
    } catch (err) {
      console.error(err)
      toast.error('建立失敗，請稍後再試')
    } finally {
      setLoading(false)
    }
  }

  if (createdSlug) {
    const shareUrl = `${window.location.origin}/${createdSlug}`
    return (
      <div className="space-y-6 text-center">
        <div>
          <div className="text-4xl mb-3">🎉</div>
          <h2 className="text-lg font-semibold text-gray-900">活動建立成功！</h2>
          <p className="text-sm text-gray-500 mt-1">複製連結後分享給參與者</p>
        </div>
        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
          <span className="text-sm text-gray-700 truncate flex-1 text-left">{shareUrl}</span>
          <CopyButton text={shareUrl} />
        </div>
        <button
          type="button"
          onClick={() => navigate(`/${createdSlug}`)}
          className="w-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition-colors"
        >
          繼續，填寫我的時間
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">活動名稱</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例如：期末聚餐時間"
          maxLength={80}
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <DatePicker selected={dates} onChange={setDates} />

      <TimeRangeSelector
        earliestSlot={earliestSlot}
        latestSlot={latestSlot}
        onEarliestChange={setEarliestSlot}
        onLatestChange={setLatestSlot}
      />

      <QuickSegmentEditor
        segments={segments}
        onChange={setSegments}
        earliestSlot={earliestSlot}
        latestSlot={latestSlot}
      />

      <div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={adminOnlyCreator}
            onChange={(e) => setAdminOnlyCreator(e.target.checked)}
            className="w-4 h-4 accent-emerald-500"
          />
          <span className="text-sm text-gray-700">只有我（建立者）可以管理活動</span>
        </label>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60"
      >
        {loading ? '建立中…' : '建立活動'}
      </button>
    </form>
  )
}
