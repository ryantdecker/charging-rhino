import { ref } from 'vue'

export type DayPart = 'morning' | 'day' | 'evening' | 'night'

export function dayPartAt(date = new Date()): DayPart {
  const hour = date.getHours()
  if (hour < 5) return 'night'
  if (hour < 10) return 'morning'
  if (hour < 17) return 'day'
  if (hour < 21) return 'evening'
  return 'night'
}

export function greetingFor(part: DayPart): string {
  if (part === 'morning') return 'Good morning.'
  if (part === 'day') return 'Good afternoon.'
  if (part === 'evening') return 'Good evening.'
  return 'Good night.'
}

export const bannerSrc: Record<DayPart, string> = {
  morning: '/banner-morning.jpg',
  day: '/banner-day.jpg',
  evening: '/banner-evening.jpg',
  night: '/banner-night.jpg',
}

export const currentDayPart = ref<DayPart>(dayPartAt())

let started = false
export function watchDayPart(): void {
  if (started || typeof window === 'undefined') return
  started = true
  window.setInterval(() => {
    currentDayPart.value = dayPartAt()
  }, 60_000)
}
