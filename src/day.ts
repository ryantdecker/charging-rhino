import type { DayItem } from './types'

/** Local calendar date as YYYY-MM-DD. */
export function todayIso(now = new Date()): string {
  const month = `${now.getMonth() + 1}`.padStart(2, '0')
  const day = `${now.getDate()}`.padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
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
    .sort((a, b) => Number(a.done) - Number(b.done) || a.order - b.order || a.title.localeCompare(b.title))
}
