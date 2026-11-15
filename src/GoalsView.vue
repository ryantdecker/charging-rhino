<script setup lang="ts">
import { computed, ref } from 'vue'
import { addGoal, addMilestone, board, removeGoal, toggleMilestone } from './store'
import type { Goal } from './types'

const filter = ref<'all' | 'active' | 'completed'>('all')
const detailTab = ref<'journey' | 'progress'>('journey')
const adding = ref(false)
const name = ref('')
const context = ref('')
const openId = ref<string | null>(null)
const milestoneDraft = ref('')
const menuOpen = ref(false)

const visible = computed(() =>
  board.goals.filter((goal) => (filter.value === 'all' ? true : goal.status === filter.value)),
)
const open = computed(() => board.goals.find((goal) => goal.id === openId.value) ?? null)

function percent(goal: Goal): number {
  if (goal.milestones.length === 0) return 0
  return Math.round((goal.milestones.filter((item) => item.done).length / goal.milestones.length) * 100)
}

function stage(goal: Goal): 'Start' | 'Build' | 'Push' | 'Achieve' {
  const done = goal.milestones.filter((item) => item.done).length
  const total = goal.milestones.length
  if (goal.status === 'completed' || (total > 0 && done === total)) return 'Achieve'
  if (done === 0) return 'Start'
  if (done / total < 0.5) return 'Build'
  return 'Push'
}

function doneCount(goal: Goal): number {
  return goal.milestones.filter((item) => item.done).length
}

function openCount(goal: Goal): number {
  return goal.milestones.filter((item) => !item.done).length
}

function currentMilestoneIndex(goal: Goal): number {
  const index = goal.milestones.findIndex((item) => !item.done)
  return index === -1 ? Math.max(0, goal.milestones.length - 1) : index
}

/** Cumulative % after each milestone — used for the progress chart. */
function progressPoints(goal: Goal): { x: number; y: number; label: string; pct: number }[] {
  const total = Math.max(goal.milestones.length, 1)
  const points = [{ x: 0, y: 100, label: 'Start', pct: 0 }]
  goal.milestones.forEach((milestone, index) => {
    const doneSoFar = goal.milestones.slice(0, index + 1).filter((item) => item.done).length
    const pct = Math.round((doneSoFar / total) * 100)
    const x = ((index + 1) / total) * 100
    const y = 100 - pct
    points.push({ x, y, label: milestone.title, pct })
  })
  return points
}

function chartPolyline(goal: Goal): string {
  return progressPoints(goal)
    .map((point) => `${point.x},${point.y}`)
    .join(' ')
}

function chartLatest(goal: Goal) {
  const points = progressPoints(goal)
  return points[points.length - 1]
}

async function create() {
  const goal = await addGoal(name.value, context.value)
  name.value = ''
  context.value = ''
  adding.value = false
  if (goal) {
    openId.value = goal.id
    detailTab.value = 'journey'
  }
}

function createMilestone(goal: Goal) {
  const title = milestoneDraft.value.trim()
  if (!title) return
  addMilestone(goal.id, title)
  milestoneDraft.value = ''
}

function openGoal(id: string) {
  openId.value = id
  detailTab.value = 'journey'
  menuOpen.value = false
}

function closeGoal() {
  openId.value = null
  menuOpen.value = false
}

function destroyGoal(id: string) {
  removeGoal(id)
  closeGoal()
}
</script>

<template>
  <section v-if="!open" class="goals-overview" aria-labelledby="goals-title">
    <p class="kicker">Goals</p>
    <div class="project-head">
      <h2 id="goals-title" class="display">The summits.</h2>
      <button v-if="!adding" class="solid" type="button" @click="adding = true">+ Add goal</button>
    </div>
    <form v-if="adding" class="composer adder" @submit.prevent="create">
      <input v-model="name" aria-label="Goal name" placeholder="Goal" required />
      <input v-model="context" aria-label="Context" placeholder="Date, target, or timeframe" />
      <button class="solid" type="submit">Add</button>
    </form>
    <div class="mode" role="group" aria-label="Filter goals">
      <button type="button" :aria-pressed="filter === 'all'" @click="filter = 'all'">All</button>
      <button type="button" :aria-pressed="filter === 'active'" @click="filter = 'active'">Active</button>
      <button type="button" :aria-pressed="filter === 'completed'" @click="filter = 'completed'">Completed</button>
    </div>
    <p v-if="visible.length === 0" class="empty">No goals on this filter yet.</p>
    <div v-else class="goal-grid">
      <button
        v-for="goal in visible"
        :key="goal.id"
        class="goal-card"
        type="button"
        :data-stage="stage(goal).toLowerCase()"
        @click="openGoal(goal.id)"
      >
        <div class="goal-card-art" aria-hidden="true">
          <img src="/journey.png" alt="" />
        </div>
        <div class="goal-card-body">
          <strong>{{ goal.name }}</strong>
          <span v-if="goal.context">{{ goal.context }}</span>
          <span class="bar" :class="{ orange: percent(goal) > 0 && percent(goal) < 100 }" :aria-label="`${percent(goal)} percent`">
            <i :style="{ width: `${percent(goal)}%` }"></i>
          </span>
          <small>{{ stage(goal) }} · {{ percent(goal) }}%</small>
        </div>
      </button>
    </div>
  </section>

  <section v-else class="goal-detail" aria-labelledby="journey-title">
    <header class="goal-detail-bar">
      <button class="texty goal-back" type="button" @click="closeGoal">← All goals</button>
      <div class="goal-detail-menu">
        <button
          class="texty"
          type="button"
          :aria-expanded="menuOpen"
          aria-label="Goal options"
          @click="menuOpen = !menuOpen"
        >
          ···
        </button>
        <div v-if="menuOpen" class="goal-menu" role="menu">
          <button type="button" role="menuitem" @click="destroyGoal(open.id)">Remove goal</button>
        </div>
      </div>
    </header>

    <h2 id="journey-title" class="display goal-detail-title">{{ open.name }}</h2>
    <p v-if="open.context" class="meta goal-detail-context">{{ open.context }}</p>

    <div class="mode goal-tabs" role="tablist" aria-label="Goal views">
      <button
        type="button"
        role="tab"
        :aria-selected="detailTab === 'journey'"
        @click="detailTab = 'journey'"
      >
        Journey
      </button>
      <button
        type="button"
        role="tab"
        :aria-selected="detailTab === 'progress'"
        @click="detailTab = 'progress'"
      >
        Progress
      </button>
    </div>

    <div v-if="detailTab === 'journey'" class="goal-journey" role="tabpanel">
      <div class="journey-hero" :data-stage="stage(open).toLowerCase()">
        <img class="journey-scene" src="/journey.png" alt="Low-poly rhino on the path toward the summit" />
        <article class="journey-card">
          <p class="kicker">{{ stage(open) }}</p>
          <p class="percent">{{ percent(open) }}% <span>Complete</span></p>
          <span class="bar orange" :aria-label="`${percent(open)} percent complete`">
            <i :style="{ width: `${percent(open)}%` }"></i>
          </span>
          <p class="meta">
            <template v-if="open.milestones.length">
              {{ doneCount(open) }} of {{ open.milestones.length }} milestones
            </template>
            <template v-else>No milestones yet</template>
          </p>
        </article>
      </div>

      <dl class="facts">
        <div>
          <dt>Done</dt>
          <dd>{{ doneCount(open) }}</dd>
        </div>
        <div>
          <dt>Open</dt>
          <dd>{{ openCount(open) }}</dd>
        </div>
        <div>
          <dt>Stage</dt>
          <dd>{{ stage(open) }}</dd>
        </div>
      </dl>

      <h3 class="goal-section-title">Milestones</h3>
      <ul class="milestones">
        <li
          v-for="(milestone, index) in open.milestones"
          :key="milestone.id"
          :class="{ done: milestone.done, current: !milestone.done && index === currentMilestoneIndex(open) }"
        >
          <button class="check" type="button" @click="toggleMilestone(open.id, milestone.id)">
            <i></i>
            <span class="visually-hidden">{{ milestone.done ? 'Mark open' : 'Mark done' }}</span>
          </button>
          <span>{{ milestone.title }}</span>
        </li>
      </ul>
      <p v-if="!open.milestones.length" class="empty">Break the summit into milestones below.</p>
      <form class="composer adder" @submit.prevent="createMilestone(open)">
        <input v-model="milestoneDraft" aria-label="New milestone" placeholder="Add a milestone" />
        <button class="solid" type="submit">Add</button>
      </form>
    </div>

    <div v-else class="goal-progress" role="tabpanel">
      <div class="chart-card goal-chart">
        <svg
          class="chart"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          role="img"
          :aria-label="`${percent(open)} percent complete`"
        >
          <polyline
            :points="chartPolyline(open)"
            fill="none"
            stroke="#008CFF"
            stroke-width="2.5"
            stroke-linejoin="round"
            stroke-linecap="round"
            vector-effect="non-scaling-stroke"
          />
          <circle
            :cx="chartLatest(open).x"
            :cy="chartLatest(open).y"
            r="3.5"
            fill="#FF8A00"
            vector-effect="non-scaling-stroke"
          />
        </svg>
        <p class="goal-chart-callout" aria-hidden="true">{{ percent(open) }}%</p>
        <p class="meta">
          <template v-if="open.milestones.length">
            {{ doneCount(open) }} of {{ open.milestones.length }} milestones complete
          </template>
          <template v-else>Add milestones to chart the climb.</template>
        </p>
      </div>

      <h3 class="goal-section-title">
        Milestones
        <template v-if="open.milestones.length">
          ({{ doneCount(open) }} of {{ open.milestones.length }} complete)
        </template>
      </h3>
      <ul class="milestones">
        <li
          v-for="(milestone, index) in open.milestones"
          :key="milestone.id"
          :class="{ done: milestone.done, current: !milestone.done && index === currentMilestoneIndex(open) }"
        >
          <button class="check" type="button" @click="toggleMilestone(open.id, milestone.id)">
            <i></i>
            <span class="visually-hidden">{{ milestone.done ? 'Mark open' : 'Mark done' }}</span>
          </button>
          <span>{{ milestone.title }}</span>
        </li>
      </ul>
      <p v-if="!open.milestones.length" class="empty">No milestones yet. Add one on Journey.</p>
      <form class="composer adder" @submit.prevent="createMilestone(open)">
        <input v-model="milestoneDraft" aria-label="New milestone" placeholder="Add a milestone" />
        <button class="solid" type="submit">Add</button>
      </form>
    </div>
  </section>
</template>
