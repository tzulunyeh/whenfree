import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
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
  const { selections, addSlots, removeSlots, removeByParticipantId, restoreSelections } = useSelections(event?.id ?? '', session?.participantId ?? '')
  const { participants, loading: participantsLoading, deleteParticipant, addParticipant } = useParticipants(event?.id ?? '')

  const [minDurationSlots, setMinDurationSlots] = useState(4)
  const [minAttendance, setMinAttendance] = useState<number | null>(null) // null = everyone (follows participant count)
  const [excludedParticipantIds, setExcludedParticipantIds] = useState<string[]>([])

  const validParticipantIdSet = useMemo(() => new Set(participants.map((p) => p.id)), [participants])
  const normalizedExcludedParticipantIds = useMemo(
    () => excludedParticipantIds.filter((id) => validParticipantIdSet.has(id)),
    [excludedParticipantIds, validParticipantIdSet]
  )
  const excludedSet = useMemo(() => new Set(normalizedExcludedParticipantIds), [normalizedExcludedParticipantIds])
  const includedParticipantsCount = useMemo(
    () => participants.filter((p) => !excludedSet.has(p.id)).length,
    [participants, excludedSet]
  )
  const safeMinAttendance = useMemo(() => {
    if (includedParticipantsCount === 0) return 1
    if (minAttendance === null) return includedParticipantsCount
    return Math.min(minAttendance, includedParticipantsCount)
  }, [minAttendance, includedParticipantsCount])

  const toggleExcludedParticipant = useCallback((participantId: string) => {
    setExcludedParticipantIds((prev) =>
      prev.includes(participantId)
        ? prev.filter((id) => id !== participantId)
        : [...prev, participantId]
    )
  }, [])

  useEffect(() => {
    if (event?.name) document.title = event.name
    return () => { document.title = 'WhenFree' }
  }, [event?.name])

  const wasSeenInList = useRef(false)
  const wasSeenSessionId = useRef<string | null>(null)

  useEffect(() => {
    if (!session) { 
      wasSeenInList.current = false
      wasSeenSessionId.current = null
      return 
    }
    if (participantsLoading) return

    const inList = participants.some(p => p.id === session.participantId)

    if (inList) {
      // Only mark as seen if this is still the same session
      if (wasSeenSessionId.current === session.participantId || wasSeenSessionId.current === null) {
        wasSeenInList.current = true
        wasSeenSessionId.current = session.participantId
      }
    } else if (wasSeenInList.current && wasSeenSessionId.current === session.participantId) {
      // Only clear if this session was previously seen
      clearSession()
      toast('你的名字已被移除，請重新加入', { icon: 'ℹ️' })
    }
  }, [participants, session, participantsLoading, clearSession])

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
    return (
      <ParticipantLogin
        eventId={event.id}
        eventName={event.name}
        participants={participants}
        onLogin={(s: ParticipantSession) => {
          saveSession(s)
          addParticipant({ id: s.participantId, event_id: event.id, name: s.name, avatar_seed: s.avatarSeed, created_at: new Date().toISOString() })
        }}
      />
    )
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
                        const removedSelections = removeByParticipantId(p.id)
                        deleteParticipant(p.id, () => restoreSelections(removedSelections))
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
              onMinAttendanceChange={(n) => setMinAttendance(n >= Math.max(1, includedParticipantsCount) ? null : n)}
              totalParticipants={includedParticipantsCount}
              participants={participants}
              excludedParticipantIds={normalizedExcludedParticipantIds}
              onToggleExcludedParticipant={toggleExcludedParticipant}
            />
          </div>

          <FilteredSlotList
            event={event}
            selections={selections}
            participants={participants}
            excludedParticipantIds={normalizedExcludedParticipantIds}
            minDurationSlots={minDurationSlots}
            minAttendance={safeMinAttendance}
          />
        </section>
      </div>
    </div>
  )
}
