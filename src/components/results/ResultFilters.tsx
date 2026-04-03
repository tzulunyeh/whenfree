interface Props {
  minDurationSlots: number
  onMinDurationChange: (slots: number) => void
  minAttendance: number
  onMinAttendanceChange: (n: number) => void
  totalParticipants: number
  participants: { id: string; name: string }[]
  excludedParticipantIds: string[]
  onToggleExcludedParticipant: (participantId: string) => void
}

const DURATION_OPTIONS = [
  { slots: 1, label: '30分' },
  { slots: 2, label: '1小時' },
  { slots: 3, label: '1.5小時' },
  { slots: 4, label: '2小時' },
  { slots: 5, label: '2.5小時' },
  { slots: 6, label: '3小時' },
]

export default function ResultFilters({
  minDurationSlots, onMinDurationChange,
  minAttendance, onMinAttendanceChange,
  totalParticipants, participants, excludedParticipantIds, onToggleExcludedParticipant,
}: Props) {
  const currentDurationIndex = DURATION_OPTIONS.findIndex((d) => d.slots === minDurationSlots)
  const excludedSet = new Set(excludedParticipantIds)

  return (
    <div className="space-y-4">
      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="text-sm font-medium text-gray-700">最短時段長度</label>
          <span className="text-sm font-semibold text-emerald-600">
            {DURATION_OPTIONS[Math.max(0, currentDurationIndex)]?.label ?? '30分'}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={DURATION_OPTIONS.length - 1}
          value={Math.max(0, currentDurationIndex)}
          onChange={(e) => onMinDurationChange(DURATION_OPTIONS[Number(e.target.value)].slots)}
          className="w-full accent-emerald-500"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-0.5">
          <span>30分</span><span>3小時</span>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="text-sm font-medium text-gray-700">最少出席人數</label>
          <span className="text-sm font-semibold text-emerald-600">
            {minAttendance === totalParticipants ? `${minAttendance}人（全員）` : `${minAttendance}人`}
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={Math.max(1, totalParticipants)}
          value={minAttendance}
          onChange={(e) => onMinAttendanceChange(Number(e.target.value))}
          className="w-full accent-emerald-500"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-0.5">
          <span>1人</span><span>{totalParticipants}人（全員）</span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">排除成員（不納入計算）</label>
          <span className="text-xs text-gray-500">
            已排除 {excludedParticipantIds.length} 人
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {participants.map((p) => {
            const excluded = excludedSet.has(p.id)
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={excluded}
                onClick={() => onToggleExcludedParticipant(p.id)}
                className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                  excluded
                    ? 'bg-orange-100 border-orange-300 text-orange-700'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {p.name}
              </button>
            )
          })}
        </div>
        <p className="text-xs text-gray-500">
          最少出席人數以未排除的 {totalParticipants} 人計算
        </p>
      </div>
    </div>
  )
}
