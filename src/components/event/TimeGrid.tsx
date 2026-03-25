import { useState, useMemo } from 'react'
import { slotRange, normalizeSlotRange } from '../../lib/slots'
import type { Event, Selection } from '../../lib/types'
import DayColumn from './DayColumn'
import TimeLabels from '../ui/TimeLabels'

type TapMode = 'idle' | 'selecting_end' | 'deselecting_end'

interface TapState {
  mode: TapMode
  anchorDate: string | null
  anchorSlot: number | null
}

interface Props {
  event: Event
  mySelections: Selection[]
  onAddSlots: (date: string, slots: number[]) => void
  onRemoveSlots: (date: string, slots: number[]) => void
}

export default function TimeGrid({ event, mySelections, onAddSlots, onRemoveSlots }: Props) {
  const [tapState, setTapState] = useState<TapState>({ mode: 'idle', anchorDate: null, anchorSlot: null })
  const [hover, setHover] = useState<{ date: string | null; slot: number | null }>({ date: null, slot: null })

  const slots = useMemo(() => slotRange(event.earliest_time, event.latest_time), [event.earliest_time, event.latest_time])
  const dateToIndex = useMemo(() => {
    const map = new Map<string, number>()
    event.dates.forEach((d, i) => map.set(d, i))
    return map
  }, [event.dates])

  const selectedByDate = useMemo(() => {
    const map = new Map<string, Set<number>>()
    for (const s of mySelections) {
      if (!map.has(s.date)) map.set(s.date, new Set())
      map.get(s.date)!.add(s.slot)
    }
    return map
  }, [mySelections])

  function getAffectedDates(endDate: string): string[] {
    const a = dateToIndex.get(tapState.anchorDate!)
    const b = dateToIndex.get(endDate)
    if (a === undefined || b === undefined) return []
    const [lo, hi] = a <= b ? [a, b] : [b, a]
    return event.dates.slice(lo, hi + 1)
  }

  const previewMap = useMemo<Map<string, Set<number>>>(() => {
    const map = new Map<string, Set<number>>()
    if (tapState.mode === 'idle' || tapState.anchorSlot === null || tapState.anchorDate === null) return map
    if (hover.slot === null || hover.date === null) return map
    const a = dateToIndex.get(tapState.anchorDate)
    const b = dateToIndex.get(hover.date)
    if (a === undefined || b === undefined) return map
    const [dLo, dHi] = a <= b ? [a, b] : [b, a]
    const [sLo, sHi] = normalizeSlotRange(tapState.anchorSlot, hover.slot)
    const previewSet = new Set(slotRange(sLo, sHi + 1))
    for (const d of event.dates.slice(dLo, dHi + 1)) map.set(d, previewSet)
    return map
  }, [tapState, hover, dateToIndex, event.dates])

  function handleSlotTap(date: string, slot: number) {
    if (tapState.mode === 'idle') {
      const selected = selectedByDate.get(date) ?? new Set<number>()
      const mode: TapMode = selected.has(slot) ? 'deselecting_end' : 'selecting_end'
      setTapState({ mode, anchorDate: date, anchorSlot: slot })
      return
    }

    const affected = getAffectedDates(date)
    const [lo, hi] = normalizeSlotRange(tapState.anchorSlot!, slot)
    const rangeSlots = slotRange(lo, hi + 1)

    for (const d of affected) {
      if (tapState.mode === 'selecting_end') {
        onAddSlots(d, rangeSlots)
      } else {
        onRemoveSlots(d, rangeSlots)
      }
    }

    setTapState({ mode: 'idle', anchorDate: null, anchorSlot: null })
    setHover({ date: null, slot: null })
  }

  function handleSlotHover(date: string, slot: number) {
    if (tapState.mode !== 'idle') {
      setHover({ date, slot })
    }
  }

  return (
    <div>
      {tapState.mode !== 'idle' && (
        <div className={`mb-2 text-sm font-medium ${tapState.mode === 'selecting_end' ? 'text-emerald-600' : 'text-orange-500'}`}>
          {tapState.mode === 'selecting_end' ? '點擊結束時間以選取' : '點擊結束時間以取消選取'}
        </div>
      )}

      <div className="overflow-x-auto overscroll-x-contain select-none">
        <div className="flex gap-0.5">
          <TimeLabels slots={slots} />

          {event.dates.map((date) => (
            <DayColumn
              key={date}
              date={date}
              slots={slots}
              selectedSlots={selectedByDate.get(date) ?? new Set()}
              anchorSlot={tapState.anchorDate === date ? tapState.anchorSlot : null}
              previewSlots={previewMap.get(date) ?? new Set()}
              isDeselecting={tapState.mode === 'deselecting_end'}
              onSlotTap={(slot) => handleSlotTap(date, slot)}
              onSlotHover={(slot) => handleSlotHover(date, slot)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
