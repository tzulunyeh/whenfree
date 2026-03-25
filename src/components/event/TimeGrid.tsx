import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { slotRange, normalizeSlotRange } from '../../lib/slots'
import type { Event, Selection } from '../../lib/types'
import DayColumn from './DayColumn'
import TimeLabels from '../ui/TimeLabels'

type SelectMode = 'selecting' | 'deselecting'

const EMPTY_SET = new Set<number>()

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
  const gridRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<DragState | null>(null)
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

  // Refs so native touch handlers always see current values without re-registering listeners
  const selectedByDateRef = useRef(selectedByDate)
  selectedByDateRef.current = selectedByDate

  const dateToIndexRef = useRef(dateToIndex)
  dateToIndexRef.current = dateToIndex

  const eventDatesRef = useRef(event.dates)
  eventDatesRef.current = event.dates

  const onAddSlotsRef = useRef(onAddSlots)
  onAddSlotsRef.current = onAddSlots

  const onRemoveSlotsRef = useRef(onRemoveSlots)
  onRemoveSlotsRef.current = onRemoveSlots

  const clearDrag = useCallback(() => {
    dragRef.current = null
    setDragState(null)
    setHover({ date: null, slot: null })
  }, [])

  // Stable because all dependencies are accessed through refs
  const doCommit = useCallback((ds: DragState, endDate: string, endSlot: number) => {
    const a = dateToIndexRef.current.get(ds.anchorDate)
    const b = dateToIndexRef.current.get(endDate)
    if (a === undefined || b === undefined) return
    const [dLo, dHi] = a <= b ? [a, b] : [b, a]
    const affected = eventDatesRef.current.slice(dLo, dHi + 1)
    const [lo, hi] = normalizeSlotRange(ds.anchorSlot, endSlot)
    const rangeSlots = slotRange(lo, hi + 1)
    for (const d of affected) {
      if (ds.mode === 'selecting') onAddSlotsRef.current(d, rangeSlots)
      else onRemoveSlotsRef.current(d, rangeSlots)
    }
  }, [])

  // Touch events — registered once at mount; { passive: false } required for iOS Safari
  useEffect(() => {
    const el = gridRef.current
    if (!el) return

    function onTouchStart(e: TouchEvent) {
      const t = e.touches[0]
      const cell = getCellFromPoint(t.clientX, t.clientY)
      if (!cell) return
      e.preventDefault()
      const selected = selectedByDateRef.current.get(cell.date) ?? EMPTY_SET
      const mode: SelectMode = selected.has(cell.slot) ? 'deselecting' : 'selecting'
      const state: DragState = { mode, anchorDate: cell.date, anchorSlot: cell.slot }
      dragRef.current = state
      setDragState(state)
      setHover({ date: cell.date, slot: cell.slot })
    }

    function onTouchMove(e: TouchEvent) {
      if (!dragRef.current) return
      e.preventDefault()
      const t = e.touches[0]
      const cell = getCellFromPoint(t.clientX, t.clientY)
      if (cell) setHover({ date: cell.date, slot: cell.slot })
    }

    function onTouchEnd(e: TouchEvent) {
      const ds = dragRef.current
      if (!ds) return
      const t = e.changedTouches[0]
      const cell = getCellFromPoint(t.clientX, t.clientY)
      if (cell) doCommit(ds, cell.date, cell.slot)
      clearDrag()
    }

    function onTouchCancel() { clearDrag() }

    el.addEventListener('touchstart', onTouchStart, { passive: false })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd)
    el.addEventListener('touchcancel', onTouchCancel)
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchCancel)
    }
  }, [])

  // Mouse events for desktop
  function handleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    if (dragRef.current) return // touch already handling
    const cell = getCellFromPoint(e.clientX, e.clientY)
    if (!cell) return
    const selected = selectedByDate.get(cell.date) ?? EMPTY_SET
    const mode: SelectMode = selected.has(cell.slot) ? 'deselecting' : 'selecting'
    const state: DragState = { mode, anchorDate: cell.date, anchorSlot: cell.slot }
    dragRef.current = state
    setDragState(state)
    setHover({ date: cell.date, slot: cell.slot })
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!dragRef.current) return
    const cell = getCellFromPoint(e.clientX, e.clientY)
    if (cell) setHover({ date: cell.date, slot: cell.slot })
  }

  function handleMouseUp(e: React.MouseEvent) {
    const ds = dragRef.current
    if (!ds) return
    const cell = getCellFromPoint(e.clientX, e.clientY)
    if (cell) doCommit(ds, cell.date, cell.slot)
    clearDrag()
  }

  return (
    <div>
      <div
        ref={gridRef}
        className="overflow-x-auto overscroll-x-contain select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={clearDrag}
      >
        <div className="flex gap-0.5">
          <TimeLabels slots={slots} />
          {event.dates.map((date) => (
            <DayColumn
              key={date}
              date={date}
              slots={slots}
              selectedSlots={selectedByDate.get(date) ?? EMPTY_SET}
              anchorSlot={dragState?.anchorDate === date ? dragState.anchorSlot : null}
              previewSlots={previewMap.get(date) ?? EMPTY_SET}
              isDeselecting={dragState?.mode === 'deselecting' === true}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
