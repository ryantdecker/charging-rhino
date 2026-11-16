import type { DayItem } from './types'

/** Local calendar date as YYYY-MM-DD. */
export function todayIso(now = new Date()): string {
  const month = `${now.getMonth() + 1}`.padStart(2, '0')
  const day = `${now.getDate()}`.padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

export function isDayIso(value: string | null | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(y, (m ?? 1) - 1, d ?? 1)
  return todayIso(date) === value
}

/** Normalize to HH:MM or null. */
export function asTime(value: string | null | undefined): string | null {
  const raw = String(value ?? '').trim()
  if (!raw) return null
  const match = /^(\d{1,2}):(\d{2})$/.exec(raw)
  if (!match) return null
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour > 23 || minute > 59) return null
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

export function formatTimeLabel(value: string | null | undefined): string {
  const time = asTime(value)
  if (!time) return ''
  const [h, m] = time.split(':').map(Number)
  const date = new Date()
  date.setHours(h, m, 0, 0)
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export function parseDayIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export function shiftDayIso(iso: string, amount: number): string {
  const date = parseDayIso(iso)
  date.setDate(date.getDate() + amount)
  return todayIso(date)
}

/** Sunday-start week containing the given day. */
export function weekDaysContaining(iso: string): string[] {
  const date = parseDayIso(iso)
  date.setDate(date.getDate() - date.getDay())
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(date)
    day.setDate(date.getDate() + index)
    return todayIso(day)
  })
}

export function formatWeekLabel(iso: string): string {
  const days = weekDaysContaining(iso)
  const start = parseDayIso(days[0])
  const end = parseDayIso(days[6])
  const startLabel = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const endLabel = end.toLocaleDateString('en-US', {
    month: start.getMonth() === end.getMonth() ? undefined : 'short',
    day: 'numeric',
    year: 'numeric',
  })
  return `${startLabel} – ${endLabel}`
}

export function formatDayLabel(iso: string, now = new Date()): string {
  if (iso === todayIso(now)) return 'Today'
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, (m ?? 1) - 1, d ?? 1)
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (iso === todayIso(yesterday)) return 'Yesterday'
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

export function formatDayHeading(iso: string, now = new Date()): string {
  if (iso === todayIso(now)) return 'Today'
  const date = parseDayIso(iso)
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

/**
 * Move unfinished items from earlier dates onto `today`.
 * Returns true if anything changed.
 */
export function rollDayItems(items: DayItem[], today = todayIso()): boolean {
  const openPast = items
    .filter((item) => !item.done && item.plannedFor < today)
    .sort((a, b) => a.plannedFor.localeCompare(b.plannedFor) || a.order - b.order)

  if (openPast.length === 0) return false

  const alreadyToday = items
    .filter((item) => item.plannedFor === today)
    .sort((a, b) => a.order - b.order)

  // Carried items keep relative order and sit ahead of items already on today.
  openPast.forEach((item, index) => {
    item.plannedFor = today
    item.order = index
  })
  alreadyToday.forEach((item, index) => {
    item.order = openPast.length + index
  })
  return true
}

export function dayItemsFor(items: DayItem[], date: string): DayItem[] {
  return items
    .filter((item) => item.plannedFor === date)
    .sort((a, b) => {
      if (a.done !== b.done) return Number(a.done) - Number(b.done)
      const aTime = a.time ?? ''
      const bTime = b.time ?? ''
      if (aTime && bTime && aTime !== bTime) return aTime.localeCompare(bTime)
      if (aTime && !bTime) return -1
      if (!aTime && bTime) return 1
      return a.order - b.order || a.title.localeCompare(b.title)
    })
}
