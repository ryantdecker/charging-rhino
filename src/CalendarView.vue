<script setup lang="ts">
import { computed, ref } from 'vue'
import { board } from './store'

const cursor = ref(new Date())
const selected = ref<string | null>(null)

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
      count: events.value.get(day)?.length ?? 0,
    }
  })
})

const selectedLines = computed(() => (selected.value ? events.value.get(selected.value) ?? [] : []))

function shift(amount: number) {
  const next = new Date(cursor.value)
  next.setMonth(next.getMonth() + amount)
  cursor.value = next
  selected.value = null
}
</script>

<template>
  <section aria-labelledby="calendar-title">
    <p class="kicker">Calendar</p>
    <div class="project-head">
      <h2 id="calendar-title" class="display">{{ label }}</h2>
      <div class="actions">
        <button class="texty" type="button" @click="shift(-1)">Previous</button>
        <button class="texty" type="button" @click="shift(1)">Next</button>
      </div>
    </div>
    <div class="weekdays" aria-hidden="true">
      <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
    </div>
    <div class="month" role="grid" aria-label="Month">
      <button
        v-for="cell in cells"
        :key="cell.day"
        type="button"
        role="gridcell"
        :class="{ outside: cell.outside, marked: cell.count > 0 }"
        :aria-pressed="selected === cell.day"
        :aria-label="`${cell.day}, ${cell.count} items`"
        @click="selected = cell.day"
      >
        {{ cell.number }}
        <i v-if="cell.count"></i>
      </button>
    </div>
    <ul v-if="selected" class="day-list">
      <li v-if="selectedLines.length === 0">Nothing recorded on {{ selected }}.</li>
      <li v-for="line in selectedLines" :key="line">{{ line }}</li>
    </ul>
  </section>
</template>
