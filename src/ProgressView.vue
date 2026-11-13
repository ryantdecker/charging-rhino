<script setup lang="ts">
import { computed } from 'vue'
import { board, openProjects } from './store'

const weeks = computed(() => {
  const start = new Date()
  start.setHours(12, 0, 0, 0)
  start.setDate(start.getDate() - start.getDay() - 7 * 7)
  return Array.from({ length: 8 }, (_, index) => {
    const from = new Date(start)
    from.setDate(start.getDate() + index * 7)
    const to = new Date(from)
    to.setDate(from.getDate() + 7)
    const count = board.tasks.filter((task) => {
      if (!task.doneAt) return false
      const when = new Date(task.doneAt)
      return when >= from && when < to
    }).length
    return {
      label: from.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      count,
    }
  })
})

const peak = computed(() => Math.max(1, ...weeks.value.map((week) => week.count)))

const points = computed(() =>
  weeks.value
    .map((week, index) => {
      const x = 16 + index * (360 / 7)
      const y = 150 - (week.count / peak.value) * 120
      return `${x},${y}`
    })
    .join(' '),
)

const last = computed(() => {
  const index = weeks.value.length - 1
  return {
    x: 16 + index * (360 / 7),
    y: 150 - (weeks.value[index].count / peak.value) * 120,
    count: weeks.value[index].count,
  }
})

const projects = computed(() =>
  openProjects().map((project) => {
    const tasks = board.tasks.filter((task) => task.projectId === project.id)
    const done = tasks.filter((task) => task.status === 'done').length
    const total = tasks.length
    return { project, done, total, percent: total ? Math.round((done / total) * 100) : 0 }
  }),
)
</script>

<template>
  <section aria-labelledby="progress-title">
    <p class="kicker">Progress</p>
    <h2 id="progress-title" class="display">What got finished.</h2>
    <p class="lede">Completed tasks by week. The latest week is marked in orange.</p>
    <div class="chart-card">
      <svg class="chart" viewBox="0 0 400 180" role="img" :aria-label="`Latest week: ${last.count} completed`">
        <polyline :points="points" fill="none" stroke="#008CFF" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" />
        <circle :cx="last.x" :cy="last.y" r="6" fill="#FF8A00" />
      </svg>
      <p class="meta">{{ last.count }} completed in the week of {{ weeks[weeks.length - 1].label }}</p>
    </div>
    <div class="stack">
      <article v-for="row in projects" :key="row.project.id" class="row progress-row">
        <div class="who">
          <strong>{{ row.project.name }}</strong>
          <p class="meta">{{ row.done }} of {{ row.total }} done</p>
          <span class="bar"><i :style="{ width: `${row.percent}%` }"></i></span>
        </div>
      </article>
    </div>
  </section>
</template>
