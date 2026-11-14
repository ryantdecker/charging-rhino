import { computed, ref } from 'vue'

export type DayPart = 'dawn' | 'morning' | 'midday' | 'afternoon' | 'sunset' | 'night'

export const dayParts: DayPart[] = ['dawn', 'morning', 'midday', 'afternoon', 'sunset', 'night']

export const dayPartLabel: Record<DayPart, string> = {
  dawn: 'Dawn',
  morning: 'Morning',
  midday: 'Midday',
  afternoon: 'Afternoon',
  sunset: 'Sunset',
  night: 'Night',
}

export function dayPartAt(date = new Date()): DayPart {
  const hour = date.getHours()
  if (hour < 5) return 'night'
  if (hour < 7) return 'dawn'
  if (hour < 10) return 'morning'
  if (hour < 14) return 'midday'
  if (hour < 17) return 'afternoon'
  if (hour < 21) return 'sunset'
  return 'night'
}

export function greetingFor(part: DayPart): string {
  if (part === 'dawn' || part === 'morning') return 'Good morning.'
  if (part === 'midday' || part === 'afternoon') return 'Good afternoon.'
  if (part === 'sunset') return 'Good evening.'
  return 'Good night.'
}

export const bannerSrc: Record<DayPart, string> = {
  dawn: '/banner-dawn.jpg',
  morning: '/banner-morning.jpg',
  midday: '/banner-midday.jpg',
  afternoon: '/banner-afternoon.jpg',
  sunset: '/banner-sunset.jpg',
  night: '/banner-night.jpg',
}

/** Clock-based part (updates every minute). */
export const currentDayPart = ref<DayPart>(dayPartAt())

/** Preview override — null means follow the clock. */
export const dayPartOverride = ref<DayPart | null>(null)

export const activeDayPart = computed(() => dayPartOverride.value ?? currentDayPart.value)

let started = false
export function watchDayPart(): void {
  if (started || typeof window === 'undefined') return
  started = true
  window.setInterval(() => {
    currentDayPart.value = dayPartAt()
  }, 60_000)
}
