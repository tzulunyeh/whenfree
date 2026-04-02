import { useState, useMemo, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useParams } from 'react-router-dom'
import { useEvent } from '../hooks/useEvent'
import { useParticipantSession } from '../hooks/useParticipantSession'
import { useSelections } from '../hooks/useSelections'
import { useParticipants } from '../hooks/useParticipants'
import ParticipantLogin from '../components/event/ParticipantLogin'
import TimeGrid from '../components/event/TimeGrid'
import QuickSelectButtons from '../components/event/QuickSelectButtons'
import GroupHeatmap from '../components/results/GroupHeatmap'
import ResultFilters from '../components/results/ResultFilters'
import FilteredSlotList from '../components/results/FilteredSlotList'
import Avatar from '../components/ui/Avatar'
import type { ParticipantSession } from '../lib/types'

export default function EventPage() {
  const { slug } = useParams<{ slug: string }>()
  const { event, loading, error } = useEvent(slug!)
  const { session, saveSession, clearSession } = useParticipantSession(event?.id ?? '')
  const { selections, addSlots, removeSlots } = useSelections(event?.id ?? '', session?.participantId ?? '')
  const { participants, loading: participantsLoading, deleteParticipant } = useParticipants(event?.id ?? '')

  const [minDurationSlots, setMinDurationSlots] = useState(4)
  const [minAttendance, setMinAttendance] = useState<number | null>(null) // null = 全員（跟著人數走）

  const totalParticipants = Math.max(1, participants.length)
  const safeMinAttendance = minAttendance === null ? totalParticipants : Math.min(minAttendance, totalParticipants)

  useEffect(() => {
    if (event?.name) document.title = event.name
    return () => { document.title = 'WhenFree' }
  }, [event?.name])

  useEffect(() => {
    if (!participantsLoading && session && participants.length > 0 && !participants.some(p => p.id === session.participantId)) {
      clearSession()
      toast('你的名字已被移除，請重新加入', { icon: 'ℹ️' })
    }
  }, [participants, session, participantsLoading])

  const mySelections = useMemo(
    () => selections.filter((s) => s.participant_id === session?.participantId),
    [selections, session?.participantId]
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">載入中…</p>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">找不到活動</p>
      </div>
    )
  }

  if (!session) {
    return <ParticipantLogin eventId={event.id} eventName={event.name} participants={participants} onLogin={(s: ParticipantSession) => saveSession(s)} />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h1 className="text-xl font-bold text-gray-900">{event.name}</h1>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              <Avatar seed={session.avatarSeed} size={28} />
              <span className="text-sm text-gray-600">{session.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">{participants.length} 人參與</span>
              <button
                onClick={clearSession}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                切換名字
              </button>
            </div>
          </div>
        </div>

        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h2 className="text-base font-semibold text-gray-800 mb-3">我的時間</h2>
          <QuickSelectButtons
            event={event}
            mySelections={mySelections}
            onAddSlots={addSlots}
            onRemoveSlots={removeSlots}
          />
          <TimeGrid
            event={event}
            mySelections={mySelections}
            onAddSlots={addSlots}
            onRemoveSlots={removeSlots}
          />
        </section>

        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
          <h2 className="text-base font-semibold text-gray-800">團隊結果</h2>

          {participants.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {participants.map((p) => (
                <div key={p.id} className="relative group flex flex-col items-center gap-0.5">
                  <Avatar seed={p.avatar_seed} size={28} />
                  <span className="text-[10px] text-gray-500 max-w-[36px] truncate">{p.name}</span>
                  <button
                    onClick={() => {
                      if (window.confirm(`確定要移除「${p.name}」的所有時段？此操作無法復原。`)) {
                        deleteParticipant(p.id)
                      }
                    }}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-400 hover:bg-red-500 text-white rounded-full text-[10px] leading-none opacity-30 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    aria-label={`移除 ${p.name}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <GroupHeatmap
            event={event}
            selections={selections}
            participants={participants}
          />

          <div className="border-t border-gray-100 pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">篩選符合時段</h3>
            <ResultFilters
              minDurationSlots={minDurationSlots}
              onMinDurationChange={setMinDurationSlots}
              minAttendance={safeMinAttendance}
              onMinAttendanceChange={(n) => setMinAttendance(n >= totalParticipants ? null : n)}
              totalParticipants={totalParticipants}
            />
          </div>

          <FilteredSlotList
            event={event}
            selections={selections}
            participants={participants}
            minDurationSlots={minDurationSlots}
            minAttendance={safeMinAttendance}
          />
        </section>
      </div>
    </div>
  )
}
