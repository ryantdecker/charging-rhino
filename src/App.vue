<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import CalendarView from './CalendarView.vue'
import CaptureSheet from './CaptureSheet.vue'
import DayBanner from './DayBanner.vue'
import GoalsView from './GoalsView.vue'
import ProgressView from './ProgressView.vue'
import SettingsView from './SettingsView.vue'
import SplashLogin from './SplashLogin.vue'
import TaskView from './TaskView.vue'
import { currentDayPart, greetingFor, watchDayPart } from './dayPart'
import {
  addProject,
  addTask,
  authRequired,
  board,
  hydrate,
  loadError,
  login,
  logout,
  moveProjectTo,
  placeTask,
  openCount,
  openProjects,
  ready,
  resetBoard,
  saveNotes,
  setProjectStatus,
  setProjectTags,
  setTaskStatus,
  shelvedProjects,
  tasksFor,
  toggleTask,
  watchBoard,
} from './store'
import type { Horizon, Lane, Project, Task } from './types'

const selectedId = ref<string | null>(null)
const addingProject = ref(false)
const projectDraft = ref('')
const taskDraft = ref('')
const taskLane = ref<Lane>('now')
const showDone = ref(false)
const projectFilter = ref('')
const editingTaskId = ref<string | null>(null)
const draggingId = ref<string | null>(null)
const draggingTaskId = ref<string | null>(null)
const overLane = ref<Lane | null>(null)
const overTaskId = ref<string | null>(null)
let taskWasDragged = false
const capturing = ref(false)
const view = ref<'home' | 'tasks' | 'goals' | 'calendar' | 'progress' | 'settings'>('home')
const horizon = ref<Horizon>('month')
const activeTags = ref<string[]>([])
const tagDraft = ref('')
const loginError = ref('')
const loggingIn = ref(false)
const previewSplash = ref(
  typeof location !== 'undefined' && new URLSearchParams(location.search).has('splash'),
)
const showSplash = computed(() => previewSplash.value || (authRequired.value && !ready.value))
let horizonSeeded = false
const horizons = [
  { id: 'day' as const, label: 'Day' },
  { id: 'week' as const, label: 'Week' },
  { id: 'month' as const, label: 'Month' },
]
const horizonLanes: Record<Horizon, Lane[]> = {
  day: ['now'],
  week: ['now', 'next'],
  month: ['now', 'next', 'later'],
}
const horizonCopy: Record<Horizon, string> = {
  day: 'Today',
  week: 'This week',
  month: 'This month',
}
const nav = [
  { id: 'home', label: 'Home' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'goals', label: 'Goals' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'progress', label: 'Progress' },
  { id: 'settings', label: 'Settings' },
] as const

const today = new Date().toLocaleDateString('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
})

const allTags = computed(() => [...board.prefs.tags].sort((a, b) => a.localeCompare(b)))

const chosenTags = computed(() =>
  activeTags.value.filter((tag) => allTags.value.some((item) => item.toLowerCase() === tag.toLowerCase())),
)

function tagged(project: Project): boolean {
  if (!chosenTags.value.length) return true
  const tags = (project.tags ?? []).map((tag) => tag.toLowerCase())
  return chosenTags.value.some((tag) => tags.includes(tag.toLowerCase()))
}

function periodStart(value: Horizon): number {
  const now = new Date()
  if (value === 'day') return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  if (value === 'week') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    start.setDate(start.getDate() - start.getDay())
    return start.getTime()
  }
  return new Date(now.getFullYear(), now.getMonth(), 1).getTime()
}

function scopedOpen(projectId: string): Task[] {
  const lanes = horizonLanes[horizon.value]
  return tasksFor(projectId).filter((task) => lanes.includes(task.lane))
}

const charge = computed(() =>
  openProjects()
    .filter((project) => tagged(project) && (horizon.value === 'month' || scopedOpen(project.id).length > 0))
    .map((project) => ({
      project,
      index: openProjects().findIndex((item) => item.id === project.id),
      top: scopedOpen(project.id)[0],
      open: scopedOpen(project.id).length,
    })),
)

const rangeDone = computed(() => {
  const start = periodStart(horizon.value)
  const ids = new Set(openProjects().filter(tagged).map((project) => project.id))
  return board.tasks.filter((task) => {
    if (task.status !== 'done' || !task.doneAt || !ids.has(task.projectId)) return false
    const when = Date.parse(task.doneAt)
    return Number.isFinite(when) && when >= start
  }).length
})

const rangeOpen = computed(() =>
  openProjects()
    .filter(tagged)
    .reduce((total, project) => total + scopedOpen(project.id).length, 0),
)

const rangePercent = computed(() => {
  const total = rangeDone.value + rangeOpen.value
  return total ? Math.round((rangeDone.value / total) * 100) : 0
})

const selected = computed(() => board.projects.find((project) => project.id === selectedId.value) ?? null)
const showSide = computed(() => ready.value && !loadError.value)
const greeting = computed(() => greetingFor(currentDayPart.value))

const lanes: Lane[] = ['now', 'next', 'later']

function matchesProjectFilter(task: Task): boolean {
  const q = projectFilter.value.trim().toLowerCase()
  if (!q) return true
  return task.title.toLowerCase().includes(q) || (task.note ?? '').toLowerCase().includes(q)
}

function laneTasks(projectId: string, lane: Lane): Task[] {
  return tasksFor(projectId, lane).filter(matchesProjectFilter)
}

function show(next: (typeof nav)[number]['id']) {
  view.value = next
  if (next !== 'tasks') selectedId.value = null
}

function selectProject(id: string) {
  view.value = 'tasks'
  selectedId.value = id
  showDone.value = false
  projectFilter.value = ''
  editingTaskId.value = null
}

function openTask(id: string) {
  if (taskWasDragged) {
    taskWasDragged = false
    return
  }
  editingTaskId.value = id
}

async function createProject() {
  const name = projectDraft.value
  projectDraft.value = ''
  addingProject.value = false
  const project = await addProject(name)
  if (project) selectProject(project.id)
}

async function createTask(project: Project) {
  const title = taskDraft.value.trim()
  if (!title) return
  taskDraft.value = ''
  const id = await addTask(project.id, title, taskLane.value)
  if (id) editingTaskId.value = id
}

async function addItem() {
  const project = selected.value ?? openProjects()[0]
  if (!project) {
    addingProject.value = true
    return
  }
  view.value = 'tasks'
  selectedId.value = project.id
  showDone.value = false
  projectFilter.value = ''
  const id = await addTask(project.id, 'Untitled', 'now')
  editingTaskId.value = id
}

function startAddProject() {
  addingProject.value = true
  view.value = 'tasks'
  selectedId.value = null
}

function onDragStart(id: string, event: DragEvent) {
  const origin = event.target as HTMLElement | null
  if (origin?.closest('button, a, input, textarea, select')) {
    event.preventDefault()
    return
  }
  draggingId.value = id
  event.dataTransfer?.setData('text/plain', id)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}

function toggleTag(tag: string) {
  const key = tag.toLowerCase()
  activeTags.value = activeTags.value.some((item) => item.toLowerCase() === key)
    ? activeTags.value.filter((item) => item.toLowerCase() !== key)
    : [...activeTags.value, tag]
}

function addTag() {
  const project = selected.value
  if (!project) return
  const tag = tagDraft.value.trim().replace(/\s+/g, ' ')
  tagDraft.value = ''
  if (!tag) return
  const tags = [...(project.tags ?? [])]
  if (tags.some((item) => item.toLowerCase() === tag.toLowerCase())) return
  tags.push(tag)
  setProjectTags(project.id, tags)
}

function removeTag(tag: string) {
  const project = selected.value
  if (!project) return
  setProjectTags(
    project.id,
    (project.tags ?? []).filter((item) => item.toLowerCase() !== tag.toLowerCase()),
  )
}

function onTaskDragStart(id: string, event: DragEvent) {
  const origin = event.target as HTMLElement | null
  if (origin?.closest('button, a, input, textarea, select')) {
    event.preventDefault()
    return
  }
  taskWasDragged = true
  draggingTaskId.value = id
  event.dataTransfer?.setData('text/plain', id)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}

function onTaskDrop(beforeId: string) {
  const id = draggingTaskId.value
  clearTaskDrag()
  if (!id || id === beforeId) return
  const target = board.tasks.find((task) => task.id === beforeId)
  if (!target) return
  placeTask(id, target.lane, beforeId)
}

function onLaneDrop(lane: Lane) {
  const id = draggingTaskId.value
  clearTaskDrag()
  if (!id) return
  const item = board.tasks.find((task) => task.id === id)
  if (!item) return
  placeTask(id, lane, null)
}

function onLaneLeave(lane: Lane, event: DragEvent) {
  const next = event.relatedTarget as Node | null
  if (next && (event.currentTarget as Node).contains(next)) return
  if (overLane.value === lane) overLane.value = null
}

function clearTaskDrag() {
  draggingTaskId.value = null
  overLane.value = null
  overTaskId.value = null
  window.setTimeout(() => {
    taskWasDragged = false
  }, 0)
}

function onDrop(targetId: string) {
  const id = draggingId.value
  draggingId.value = null
  if (id) moveProjectTo(id, targetId)
}


async function submitLogin(password: string) {
  loggingIn.value = true
  loginError.value = ''
  try {
    await login(password)
    if (!horizonSeeded) {
      horizon.value = board.prefs.defaultHorizon
      horizonSeeded = true
    }
    watchBoard()
  } catch (error) {
    loginError.value = error instanceof Error ? error.message : 'Could not sign in.'
  } finally {
    loggingIn.value = false
  }
}

async function confirmSignOut() {
  if (!window.confirm('Sign out of Charging Rhino?')) return
  await logout()
}

onMounted(async () => {
  watchDayPart()
  await hydrate()
  if (ready.value) {
    if (!horizonSeeded) {
      horizon.value = board.prefs.defaultHorizon
      horizonSeeded = true
    }
    watchBoard()
  }
})

function restore() {
  if (!window.confirm('Reset the board to the starter seed?')) return
  resetBoard()
  selectedId.value = null
}

function syncedLabel() {
  if (!board.syncedAt) return 'Board ready.'
  const when = new Date(board.syncedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const report = board.lastSync
  return `Last saved ${when}.`
}

function touched(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function onCaptured(projectId: string) {
  capturing.value = false
  selectProject(projectId)
}

function onNotes(id: string, event: Event) {
  saveNotes(id, (event.target as HTMLTextAreaElement).value)
}

function laneLabel(lane: Lane) {
  if (lane === 'now') return 'Now'
  if (lane === 'next') return 'Next'
  return 'Later'
}
</script>

<template>
  <SplashLogin
    v-if="showSplash"
    :logging-in="loggingIn"
    :error="loginError"
    @submit="submitLogin"
  />
  <div v-else class="shell" :class="{ 'with-side': showSide }">
    <aside v-if="showSide" class="side">
      <div class="lockup">
        <img src="/mark-head.png" alt="" />
        <div class="wordmark">
          <h1><span>Charging</span><span>Rhino</span></h1>
        </div>
      </div>
      <p class="tagline">Make progress. Build momentum.</p>
      <nav class="app-nav" aria-label="Primary">
        <button
          v-for="item in nav"
          :key="item.id"
          type="button"
          :aria-current="view === item.id ? 'page' : undefined"
          @click="show(item.id)"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path v-if="item.id === 'home'" d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" />
            <path v-else-if="item.id === 'tasks'" d="M8 6h12M8 12h12M8 18h12M4.5 6h.01M4.5 12h.01M4.5 18h.01" />
            <path v-else-if="item.id === 'calendar'" d="M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" />
            <path v-else-if="item.id === 'goals'" d="M6 20V4m0 0h9l-2 3 2 3H6" />
            <path v-else-if="item.id === 'progress'" d="M4 16l5-5 3 3 7-8" />
            <path v-else d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM19.4 15l1.6.9-1.5 2.6-1.8-.6a7 7 0 0 1-1.5.9l-.3 1.9h-3l-.3-1.9a7 7 0 0 1-1.5-.9l-1.8.6L4.9 15.9 6.5 15a7 7 0 0 1 0-1.8L4.9 12.1l1.5-2.6 1.8.6a7 7 0 0 1 1.5-.9l.3-1.9h3l.3 1.9a7 7 0 0 1 1.5.9l1.8-.6 1.5 2.6-1.6.9a7 7 0 0 1 0 1.8z" />
          </svg>
          {{ item.label }}
        </button>
      </nav>
      <nav class="projects" aria-label="Projects">
        <div class="nav-heading">
          <p class="nav-label">Projects</p>
          <button class="nav-add" type="button" @click="startAddProject">Add</button>
        </div>
        <form v-if="addingProject" class="side-add-project" @submit.prevent="createProject">
          <input v-model="projectDraft" aria-label="Project name" placeholder="Project name" required />
          <button class="solid" type="submit">Add</button>
        </form>
        <button
          v-for="project in openProjects()"
          :key="project.id"
          class="project"
          type="button"
          :aria-current="selectedId === project.id ? 'page' : undefined"
          @click="selectProject(project.id)"
        >
          {{ project.name }}
          <small>{{ openCount(project.id) }}</small>
        </button>
        <template v-if="shelvedProjects().length">
          <p class="nav-label">Shelved</p>
          <button
            v-for="project in shelvedProjects()"
            :key="project.id"
            class="project"
            type="button"
            :aria-current="selectedId === project.id ? 'page' : undefined"
            @click="selectProject(project.id)"
          >
            {{ project.name }}
            <small>{{ openCount(project.id) }}</small>
          </button>
        </template>
      </nav>
      <div class="side-foot">
        <div class="side-tools" role="group" aria-label="Board actions">
          <button
            class="circle"
            type="button"
            aria-label="Add item"
            title="Add item"
            @click="addItem"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
          </button>
          <button
            class="circle"
            type="button"
            aria-label="From a photo"
            title="From a photo"
            @click="capturing = true"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h2l1.2-1.6A1.5 1.5 0 0 1 10.9 4h2.2a1.5 1.5 0 0 1 1.2.4L15.5 6h2A2.5 2.5 0 0 1 20 8.5v9A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5z" />
              <circle cx="12" cy="13" r="3.2" />
            </svg>
          </button>
          <button
            class="circle"
            type="button"
            aria-label="Sign out"
            title="Sign out"
            @click="confirmSignOut"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" />
              <path d="M16 8l4 4-4 4M10 12h10" />
            </svg>
          </button>
        </div>
      </div>
    </aside>

    <main class="main">
      <DayBanner v-if="ready && !loadError" />
      <p v-if="loadError" class="banner">{{ loadError }}</p>
      <p v-else-if="!ready" class="lede">Loading the board…</p>
      <GoalsView v-else-if="view === 'goals'" />
      <CalendarView v-else-if="view === 'calendar'" />
      <ProgressView v-else-if="view === 'progress'" />
      <SettingsView v-else-if="view === 'settings'" />
      <section v-else-if="view === 'home'" aria-labelledby="charge-title">
        <div class="hero-band">
          <div>
            <p class="kicker">{{ today }}</p>
            <h2 id="charge-title" class="hello">{{ greeting }}</h2>
            <p v-if="charge[0]?.top" class="lede">Next up is {{ charge[0].top.title }}.</p>
            <p v-else class="lede">The charge is clear.</p>
          </div>
        </div>
        <div class="filters">
          <div class="mode" role="group" aria-label="Time range">
            <button
              v-for="option in horizons"
              :key="option.id"
              type="button"
              :aria-pressed="horizon === option.id"
              @click="horizon = option.id"
            >
              {{ option.label }}
            </button>
          </div>
          <div class="mode" role="group" aria-label="Project tags">
            <button type="button" :aria-pressed="chosenTags.length === 0" @click="activeTags = []">All</button>
            <button
              v-for="tag in allTags"
              :key="tag"
              type="button"
              :aria-pressed="chosenTags.some((item) => item.toLowerCase() === tag.toLowerCase())"
              @click="toggleTag(tag)"
            >
              {{ tag }}
            </button>
          </div>
          <p class="meta">Day is the Now lane. Week adds Next. Month is the whole charge. Tags match any selected tag.</p>
        </div>
        <article class="week-card">
          <div>
            <strong>{{ horizonCopy[horizon] }}</strong>
            <span>{{ rangeDone }} done · {{ rangeOpen }} open</span>
          </div>
          <span class="bar orange" :aria-label="`${rangePercent} percent done`"><i :style="{ width: `${rangePercent}%` }"></i></span>
        </article>
        <div class="stat-row">
          <article><span>Tasks</span><strong>{{ rangeOpen }}</strong></article>
          <article><span>Projects</span><strong>{{ charge.length }}</strong></article>
          <article><span>Goals</span><strong>{{ board.goals.length }}</strong></article>
        </div>
        <p class="meta">{{ syncedLabel() }}</p>

        <article
          v-if="charge[0]"
          class="horn"
          draggable="true"
          :class="{ dragging: draggingId === charge[0].project.id }"
          @dragstart="onDragStart(charge[0].project.id, $event)"
          @dragover.prevent
          @drop="onDrop(charge[0].project.id)"
          @dragend="draggingId = null"
        >
          <header>
            <div>
              <p class="eyebrow">
                <strong>{{ charge[0].project.name }}</strong>
                · {{ charge[0].open }} open
                · touched {{ touched(charge[0].project.lastTouched) }}
              </p>
              <h3 v-if="charge[0].top">{{ charge[0].top.title }}</h3>
              <h3 v-else>This project is clear.</h3>
              <p v-if="charge[0].top" class="note">{{ charge[0].top.note }}</p>
              <span v-if="charge[0].top" class="source">{{ charge[0].top.source }}</span>
            </div>
            <div v-if="charge[0].top" class="horn-marks">
              <span class="chip" :class="charge[0].top.lane">{{ laneLabel(charge[0].top.lane) }}</span>
              <span
                class="chip assist-chip"
                :title="`Agent ${charge[0].top.assist}: 1 is a person, 10 is ready to hand to an agent`"
              >
                Agent {{ charge[0].top.assist }}
              </span>
            </div>
          </header>
          <div class="actions">
            <button
              v-if="charge[0].top"
              class="solid"
              type="button"
              @click="setTaskStatus(charge[0].top.id, charge[0].top.status === 'in_progress' ? 'done' : 'in_progress')"
            >
              {{ charge[0].top.status === 'in_progress' ? 'Complete' : 'Start' }}
            </button>
            <button class="texty" type="button" @click="selectProject(charge[0].project.id)">Open project</button>
          </div>
        </article>
        <p v-else-if="openProjects().length === 0" class="empty">Every project is shelved. Restore one to aim the horn.</p>
        <p v-else class="empty">Nothing in this view. Widen the range or clear a tag.</p>

        <div v-if="charge.length > 1" class="stack">
          <h3>Behind it</h3>
          <article
            v-for="row in charge.slice(1)"
            :key="row.project.id"
            class="row"
            draggable="true"
            :class="{ dragging: draggingId === row.project.id }"
            @dragstart="onDragStart(row.project.id, $event)"
            @dragover.prevent
            @drop="onDrop(row.project.id)"
            @dragend="draggingId = null"
          >
            <span class="rank">{{ row.index + 1 }}</span>
            <div class="who">
              <strong>{{ row.project.name }}</strong>
              <p v-if="row.top">{{ row.top.title }}</p>
              <p v-else class="meta">Clear</p>
              <p class="meta">{{ row.open }} open · {{ row.project.branch ?? 'no branch' }}</p>
            </div>
            <div class="actions">
              <button
                v-if="row.top"
                class="texty"
                type="button"
                @click="setTaskStatus(row.top.id, row.top.status === 'in_progress' ? 'done' : 'in_progress')"
              >
                {{ row.top.status === 'in_progress' ? 'Done' : 'Start' }}
              </button>
              <button class="texty" type="button" @click="selectProject(row.project.id)">Open</button>
            </div>
          </article>
        </div>
      </section>

      <section v-else-if="view === 'tasks' && !selected" aria-labelledby="tasks-title">
        <p class="kicker">Tasks</p>
        <div class="project-head">
          <h2 id="tasks-title" class="display">Projects.</h2>
          <button v-if="!addingProject" class="solid" type="button" @click="addingProject = true">Add project</button>
        </div>
        <form v-if="addingProject" class="composer adder" @submit.prevent="createProject">
          <input v-model="projectDraft" aria-label="Project name" placeholder="Project name" required />
          <button class="solid" type="submit">Add</button>
        </form>
        <div class="stack">
          <article v-for="project in openProjects()" :key="project.id" class="row">
            <div class="who">
              <strong>{{ project.name }}</strong>
              <p class="meta">{{ openCount(project.id) }} open · {{ project.branch ?? 'no branch' }}<template v-if="project.tags?.length"> · {{ project.tags.join(', ') }}</template></p>
            </div>
            <button class="texty" type="button" @click="selectProject(project.id)">Open</button>
          </article>
          <article v-for="project in shelvedProjects()" :key="project.id" class="row">
            <div class="who">
              <strong>{{ project.name }}</strong>
              <p class="meta">Shelved · {{ openCount(project.id) }} open</p>
            </div>
            <button class="texty" type="button" @click="selectProject(project.id)">Open</button>
          </article>
        </div>
        <div class="actions tool-row">
          <button class="texty" type="button" @click="capturing = true">From a photo</button>
          <button class="texty" type="button" @click="restore">Reset starter board</button>
          <button v-if="authRequired || ready" class="texty" type="button" @click="confirmSignOut">Sign out</button>
        </div>
      </section>

      <section v-else-if="selected" :aria-labelledby="`project-${selected.id}`">
        <button class="texty" type="button" @click="selectedId = null">All projects</button>
        <div class="project-head">
          <div>
            <p class="kicker">{{ selected.status === 'shelved' ? 'Shelved' : 'Open project' }}</p>
            <h2 :id="`project-${selected.id}`" class="display">{{ selected.name }}</h2>
            <p class="lede">{{ selected.summary }}</p>
            <p class="meta path">
              Key {{ selected.path }}
              <template v-if="selected.branch"> · {{ selected.branch }}</template>
              <template v-if="selected.lastTouched"> · touched {{ touched(selected.lastTouched) }}</template>
            </p>
            <form class="tag-editor" @submit.prevent="addTag">
              <span v-for="tag in selected.tags ?? []" :key="tag" class="chip tag">
                {{ tag }}
                <button type="button" :aria-label="`Remove ${tag}`" @click="removeTag(tag)">×</button>
              </span>
              <input v-model="tagDraft" aria-label="Add a tag" placeholder="Add a tag" />
              <button class="solid" type="submit">Add tag</button>
            </form>
          </div>
          <div class="actions">
            <button
              v-if="selected.status === 'open'"
              class="texty"
              type="button"
              @click="setProjectStatus(selected.id, 'shelved')"
            >
              Shelve
            </button>
            <button v-else class="solid" type="button" @click="setProjectStatus(selected.id, 'open')">
              Put back on the charge
            </button>
          </div>
        </div>

        <p v-if="selected.status === 'shelved'" class="notice">Shelved. It stays off the charge until you put it back.</p>

        <div class="composer adder">
          <form @submit.prevent="createTask(selected)">
            <input v-model="taskDraft" aria-label="New task" placeholder="Add a task to the front of a lane" />
            <select v-model="taskLane" aria-label="Lane">
              <option value="now">Now</option>
              <option value="next">Next</option>
              <option value="later">Later</option>
            </select>
            <button class="solid" type="submit">Add</button>
            <button class="texty" type="button" @click="capturing = true">From a photo</button>
          </form>
        </div>

        <div class="notes-block">
          <h3>Notes</h3>
          <textarea
            :value="selected.notes ?? ''"
            rows="4"
            aria-label="Project notes"
            placeholder="Nothing written down yet."
            @change="onNotes(selected.id, $event)"
          />
        </div>

        <div class="project-filters">
          <input
            v-model="projectFilter"
            type="search"
            aria-label="Filter tasks"
            placeholder="Filter tasks"
          />
        </div>

        <div class="lanes">
          <section
            v-for="lane in lanes"
            :key="lane"
            class="lane"
            :class="{ over: overLane === lane }"
            :aria-label="laneLabel(lane)"
            @dragover.prevent="overLane = lane"
            @dragleave="onLaneLeave(lane, $event)"
            @drop="onLaneDrop(lane)"
          >
            <h3>
              {{ laneLabel(lane) }}
              <span>{{ laneTasks(selected.id, lane).length }}</span>
            </h3>
            <p v-if="laneTasks(selected.id, lane).length === 0" class="empty">Drop a card here.</p>
            <article
              v-for="task in laneTasks(selected.id, lane)"
              :key="task.id"
              class="task"
              :class="{ dragging: draggingTaskId === task.id, over: overTaskId === task.id }"
              draggable="true"
              role="button"
              tabindex="0"
              :aria-label="`Edit ${task.title}`"
              @click="openTask(task.id)"
              @keydown.enter.prevent="openTask(task.id)"
              @dragstart="onTaskDragStart(task.id, $event)"
              @dragover.prevent="overTaskId = task.id"
              @drop.stop="onTaskDrop(task.id)"
              @dragend="clearTaskDrag"
            >
              <strong>{{ task.title }}</strong>
              <p v-if="task.note" class="note">{{ task.note }}</p>
              <div class="task-marks">
                <span v-if="task.status === 'in_progress'" class="chip">In progress</span>
                <span class="chip assist-chip" title="Agent readiness">Agent {{ task.assist ?? 5 }}</span>
                <span class="source">{{ task.source }}</span>
              </div>
            </article>
          </section>
        </div>

        <div class="done-list">
          <button class="texty" type="button" @click="showDone = !showDone">
            {{ showDone ? 'Hide' : 'Show' }} {{ tasksFor(selected.id, undefined, true).length }} done
          </button>
          <ul v-if="showDone">
            <li v-for="task in tasksFor(selected.id, undefined, true)" :key="task.id">
              <button class="texty done-open" type="button" @click="openTask(task.id)">{{ task.title }}</button>
              <button class="texty" type="button" @click="toggleTask(task.id)">Reopen</button>
            </li>
          </ul>
        </div>
      </section>
    </main>
    <CaptureSheet v-if="capturing" :project-id="selectedId" @close="capturing = false" @applied="onCaptured" />
    <TaskView v-if="editingTaskId" :task-id="editingTaskId" @close="editingTaskId = null" />
  </div>
</template>
