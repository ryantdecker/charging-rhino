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

const chart = {
  left: 36,
  right: 16,
  top: 18,
  bottom: 36,
  width: 400,
  height: 200,
}

const plotWidth = chart.width - chart.left - chart.right
const plotHeight = chart.height - chart.top - chart.bottom

function xAt(index: number): number {
  return chart.left + (index * plotWidth) / 7
}

function yAt(count: number): number {
  return chart.top + plotHeight - (count / peak.value) * plotHeight
}

const points = computed(() =>
  weeks.value.map((week, index) => `${xAt(index)},${yAt(week.count)}`).join(' '),
)

const last = computed(() => {
  const index = weeks.value.length - 1
  const week = weeks.value[index]
  return {
    x: xAt(index),
    y: yAt(week.count),
    count: week.count,
    label: week.label,
  }
})

const yTicks = computed(() => {
  const max = peak.value
  if (max <= 1) return [0, 1]
  if (max <= 4) return Array.from({ length: max + 1 }, (_, i) => i)
  const step = Math.ceil(max / 4)
  const ticks: number[] = []
  for (let value = 0; value <= max; value += step) ticks.push(value)
  if (ticks[ticks.length - 1] !== max) ticks.push(max)
  return ticks
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
      <svg
        class="chart"
        :viewBox="`0 0 ${chart.width} ${chart.height}`"
        role="img"
        :aria-label="`Completed tasks by week. Latest week of ${last.label}: ${last.count} completed.`"
      >
        <text
          class="chart-axis-title"
          :x="12"
          :y="chart.top + plotHeight / 2"
          :transform="`rotate(-90 12 ${chart.top + plotHeight / 2})`"
        >
          Tasks done
        </text>

        <line
          class="chart-grid"
          v-for="tick in yTicks"
          :key="`grid-${tick}`"
          :x1="chart.left"
          :x2="chart.width - chart.right"
          :y1="yAt(tick)"
          :y2="yAt(tick)"
        />

        <g v-for="tick in yTicks" :key="`y-${tick}`">
          <text class="chart-label" :x="chart.left - 8" :y="yAt(tick) + 4" text-anchor="end">
            {{ tick }}
          </text>
        </g>

        <polyline
          :points="points"
          fill="none"
          stroke="#008CFF"
          stroke-width="3"
          stroke-linejoin="round"
          stroke-linecap="round"
        />
        <circle :cx="last.x" :cy="last.y" r="6" fill="#FF8A00" />
        <text class="chart-callout" :x="last.x" :y="last.y - 12" text-anchor="middle">
          {{ last.count }}
        </text>

        <g v-for="(week, index) in weeks" :key="week.label">
          <text
            class="chart-label chart-label-x"
            :x="xAt(index)"
            :y="chart.height - 10"
            text-anchor="middle"
          >
            {{ week.label }}
          </text>
        </g>
      </svg>
      <p class="meta">
        {{ last.count }} completed in the week of {{ last.label }}
        · peak week {{ peak }}
      </p>
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
