import { format, parseISO } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { SLOTS_PER_DAY } from './constants'

export function formatDateLabel(date: string): { dayLabel: string; dateLabel: string } {
  const parsed = parseISO(date)
  return {
    dayLabel: format(parsed, 'EEE', { locale: zhTW }),
    dateLabel: format(parsed, 'M/d'),
  }
}

export const ALL_SLOTS = Array.from({ length: SLOTS_PER_DAY }, (_, i) => i)

export function slotToTime(slot: number): string {
  const h = Math.floor(slot / 2)
  const m = slot % 2 === 0 ? '00' : '30'
  return `${h.toString().padStart(2, '0')}:${m}`
}

export function timeToSlot(h: number, m: number): number {
  return h * 2 + (m >= 30 ? 1 : 0)
}

export function slotRange(start: number, end: number): number[] {
  const slots: number[] = []
  for (let i = start; i < end; i++) {
    slots.push(i)
  }
  return slots
}

export function normalizeSlotRange(a: number, b: number): [number, number] {
  return [Math.min(a, b), Math.max(a, b)]
}
