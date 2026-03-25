import { useState, useMemo } from 'react'
import { slotRange, normalizeSlotRange } from '../../lib/slots'
import type { Event, Selection } from '../../lib/types'
import DayColumn from './DayColumn'
import TimeLabels from '../ui/TimeLabels'

type SelectMode = 'selecting' | 'deselecting'

interface DragState {
  mode: SelectMode
  anchorDate: string
  anchorSlot: number
}

interface Props {
  event: Event
  mySelections: Selection[]
  onAddSlots: (date: string, slots: number[]) => void
  onRemoveSlots: (date: string, slots: number[]) => void
}

export default function TimeGrid({ event, mySelections, onAddSlots, onRemoveSlots }: Props) {
  const [dragState, setDragState] = useState<DragState | null>(null)
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

  function getCellFromPoint(x: number, y: number): { date: string; slot: number } | null {
    const el = document.elementFromPoint(x, y)
    const cell = el?.closest('[data-date][data-slot]') as HTMLElement | null
    if (!cell) return null
    const date = cell.dataset.date!
    const slot = Number(cell.dataset.slot)
    if (!date || isNaN(slot)) return null
    return { date, slot }
  }

  const previewMap = useMemo<Map<string, Set<number>>>(() => {
    const map = new Map<string, Set<number>>()
    if (!dragState || hover.slot === null || hover.date === null) return map
    const a = dateToIndex.get(dragState.anchorDate)
    const b = dateToIndex.get(hover.date)
    if (a === undefined || b === undefined) return map
    const [dLo, dHi] = a <= b ? [a, b] : [b, a]
    const [sLo, sHi] = normalizeSlotRange(dragState.anchorSlot, hover.slot)
    const previewSet = new Set(slotRange(sLo, sHi + 1))
    for (const d of event.dates.slice(dLo, dHi + 1)) map.set(d, previewSet)
    return map
  }, [dragState, hover, dateToIndex, event.dates])

  function commitSelection(endDate: string, endSlot: number) {
    if (!dragState) return
    const a = dateToIndex.get(dragState.anchorDate)
    const b = dateToIndex.get(endDate)
    if (a === undefined || b === undefined) return
    const [dLo, dHi] = a <= b ? [a, b] : [b, a]
    const affected = event.dates.slice(dLo, dHi + 1)
    const [lo, hi] = normalizeSlotRange(dragState.anchorSlot, endSlot)
    const rangeSlots = slotRange(lo, hi + 1)
    for (const d of affected) {
      if (dragState.mode === 'selecting') onAddSlots(d, rangeSlots)
      else onRemoveSlots(d, rangeSlots)
    }
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const cell = getCellFromPoint(e.clientX, e.clientY)
    if (!cell) return
    const selected = selectedByDate.get(cell.date) ?? new Set<number>()
    const mode: SelectMode = selected.has(cell.slot) ? 'deselecting' : 'selecting'
    setDragState({ mode, anchorDate: cell.date, anchorSlot: cell.slot })
    setHover({ date: cell.date, slot: cell.slot })
    e.currentTarget.setPointerCapture(e.pointerId)
    e.preventDefault()
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragState) return
    const cell = getCellFromPoint(e.clientX, e.clientY)
    if (cell) setHover({ date: cell.date, slot: cell.slot })
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (!dragState) return
    const cell = getCellFromPoint(e.clientX, e.clientY)
    if (cell) commitSelection(cell.date, cell.slot)
    setDragState(null)
    setHover({ date: null, slot: null })
  }

  return (
    <div>
      {dragState && (
        <div className={`mb-2 text-sm font-medium ${dragState.mode === 'selecting' ? 'text-emerald-600' : 'text-orange-500'}`}>
          {dragState.mode === 'selecting' ? '拖曳至結束時間' : '拖曳至結束時間以取消'}
        </div>
      )}

      <div
        className="overflow-x-auto overscroll-x-contain select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => { setDragState(null); setHover({ date: null, slot: null }) }}
      >
        <div className="flex gap-0.5">
          <TimeLabels slots={slots} />
          {event.dates.map((date) => (
            <DayColumn
              key={date}
              date={date}
              slots={slots}
              selectedSlots={selectedByDate.get(date) ?? new Set()}
              anchorSlot={dragState?.anchorDate === date ? dragState.anchorSlot : null}
              previewSlots={previewMap.get(date) ?? new Set()}
              isDeselecting={dragState?.mode === 'deselecting' === true}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
