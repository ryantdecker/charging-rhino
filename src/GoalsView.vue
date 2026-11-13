<script setup lang="ts">
import { computed, ref } from 'vue'
import { addGoal, addMilestone, board, removeGoal, toggleMilestone } from './store'
import type { Goal } from './types'

const filter = ref<'all' | 'active' | 'completed'>('all')
const adding = ref(false)
const name = ref('')
const context = ref('')
const openId = ref<string | null>(null)
const milestoneDraft = ref('')

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

async function create() {
  const goal = await addGoal(name.value, context.value)
  name.value = ''
  context.value = ''
  adding.value = false
  if (goal) openId.value = goal.id
}

function createMilestone(goal: Goal) {
  const title = milestoneDraft.value.trim()
  if (!title) return
  addMilestone(goal.id, title)
  milestoneDraft.value = ''
}
</script>

<template>
  <section v-if="!open" aria-labelledby="goals-title">
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
      <button v-for="goal in visible" :key="goal.id" class="goal-card" type="button" @click="openId = goal.id">
        <strong>{{ goal.name }}</strong>
        <span v-if="goal.context">{{ goal.context }}</span>
        <span class="bar" :aria-label="`${percent(goal)} percent`"><i :style="{ width: `${percent(goal)}%` }"></i></span>
        <small>{{ stage(goal) }} · {{ percent(goal) }}%</small>
      </button>
    </div>
  </section>

  <section v-else aria-labelledby="journey-title">
    <div class="actions">
      <button class="texty" type="button" @click="openId = null">All goals</button>
      <button class="texty" type="button" @click="removeGoal(open.id); openId = null">Remove goal</button>
    </div>
    <p class="kicker">{{ stage(open) }}</p>
    <h2 id="journey-title" class="display">{{ open.name }}</h2>
    <p v-if="open.context" class="lede">{{ open.context }}</p>
    <img class="journey" src="/journey.png" alt="Low-poly rhino climbing toward the summit" />
    <p class="percent">{{ percent(open) }}%</p>
    <div class="bar orange" :aria-label="`${percent(open)} percent complete`"><i :style="{ width: `${percent(open)}%` }"></i></div>
    <p class="meta">
      <template v-if="open.milestones.length">{{ open.milestones.filter((item) => item.done).length }} of {{ open.milestones.length }} milestones</template>
      <template v-else>No milestones yet</template>
    </p>
    <dl class="facts">
      <div>
        <dt>Done</dt>
        <dd>{{ open.milestones.filter((item) => item.done).length }}</dd>
      </div>
      <div>
        <dt>Open</dt>
        <dd>{{ open.milestones.filter((item) => !item.done).length }}</dd>
      </div>
      <div>
        <dt>Stage</dt>
        <dd>{{ stage(open) }}</dd>
      </div>
    </dl>
    <ul class="milestones">
      <li v-for="milestone in open.milestones" :key="milestone.id" :class="{ done: milestone.done }">
        <button class="check" type="button" @click="toggleMilestone(open.id, milestone.id)">
          <i></i> {{ milestone.done ? 'Done' : 'Mark done' }}
        </button>
        <span>{{ milestone.title }}</span>
      </li>
    </ul>
    <form class="composer adder" @submit.prevent="createMilestone(open)">
      <input v-model="milestoneDraft" aria-label="New milestone" placeholder="Add a milestone" />
      <button class="solid" type="submit">Add</button>
    </form>
  </section>
</template>
