<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { isDayIso, parseDayIso, todayIso } from './day'
import { board } from './store'

const props = defineProps<{ focusDate?: string }>()
const emit = defineEmits<{ 'open-day': [date: string] }>()

const today = todayIso()
const cursor = ref(parseDayIso(isDayIso(props.focusDate) ? props.focusDate! : today))

watch(
  () => props.focusDate,
  (value) => {
    if (isDayIso(value)) cursor.value = parseDayIso(value)
  },
)

const label = computed(() => cursor.value.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }))

function iso(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

const events = computed(() => {
  const map = new Map<string, string[]>()
  const add = (day: string, line: string) => {
    const list = map.get(day) ?? []
    list.push(line)
    map.set(day, list)
  }
  for (const task of board.tasks) {
    if (task.doneAt) {
      const project = board.projects.find((item) => item.id === task.projectId)
      add(task.doneAt.slice(0, 10), `${project?.name ?? 'Task'}: ${task.title}`)
    }
  }
  for (const project of board.projects) {
    if (project.lastTouched) add(project.lastTouched, `${project.name} touched`)
  }
  for (const item of board.dayItems) {
    add(item.plannedFor, item.title)
  }
  return map
})

const cells = computed(() => {
  const year = cursor.value.getFullYear()
  const month = cursor.value.getMonth()
  const first = new Date(year, month, 1)
  const start = new Date(first)
  start.setDate(1 - first.getDay())
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    const day = iso(date)
    return {
      day,
      number: date.getDate(),
      outside: date.getMonth() !== month,
      today: day === today,
      count: events.value.get(day)?.length ?? 0,
    }
  })
})

function shift(amount: number) {
  const next = new Date(cursor.value)
  next.setMonth(next.getMonth() + amount)
  cursor.value = next
}
</script>

<template>
  <section aria-labelledby="calendar-title">
    <div class="project-head">
      <h2 id="calendar-title" class="display">{{ label }}</h2>
      <div class="actions">
        <button class="texty" type="button" @click="shift(-1)">Previous</button>
        <button class="texty" type="button" @click="shift(1)">Next</button>
      </div>
    </div>
    <p class="lede">Open a day to plan it.</p>
    <div class="weekdays" aria-hidden="true">
      <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
    </div>
    <div class="month" role="grid" aria-label="Month">
      <button
        v-for="cell in cells"
        :key="cell.day"
        type="button"
        role="gridcell"
        :class="{ outside: cell.outside, marked: cell.count > 0, today: cell.today }"
        :aria-label="`Open ${cell.day}, ${cell.count} items`"
        @click="emit('open-day', cell.day)"
      >
        {{ cell.number }}
        <i v-if="cell.count"></i>
      </button>
    </div>
  </section>
</template>
