<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { dayItemsFor, formatDayLabel, todayIso } from './day'
import {
  addDayItem,
  addDayLines,
  board,
  calendarTags,
  ensureDay,
  missingCalendarItems,
  openProjects,
  placeDayItem,
  projectById,
  readPhoto,
  removeDayItem,
  setDayItemDone,
} from './store'
import { isActiveTask, type DayItem, type Task } from './types'

const today = todayIso()
const draft = ref('')
const pickingTask = ref(false)
const capturing = ref(false)
const reading = ref(false)
const captureError = ref('')
const preview = ref('')
const lines = ref<{ id: number; text: string; keep: boolean }[]>([])
const calendarTag = ref(localStorage.getItem('rhino_calendar_tag') ?? '')
const calendarTagDraft = ref('')
const draggingId = ref<string | null>(null)
const overId = ref<string | null>(null)
let nextLineId = 1

const agenda = computed(() => dayItemsFor(board.dayItems, today))
const openAgenda = computed(() => agenda.value.filter((item) => !item.done))
const doneAgenda = computed(() => agenda.value.filter((item) => item.done))
const knownCalendars = computed(() => calendarTags())

const pinnedTaskIds = computed(
  () => new Set(board.dayItems.filter((item) => item.kind === 'task' && item.taskId && !item.done).map((item) => item.taskId!)),
)

const pinCandidates = computed(() => {
  const openIds = new Set(openProjects().map((project) => project.id))
  return board.tasks
    .filter((task) => openIds.has(task.projectId) && isActiveTask(task) && !pinnedTaskIds.value.has(task.id))
    .sort((a, b) => {
      const lane = { now: 0, next: 1, later: 2 }[a.lane] - { now: 0, next: 1, later: 2 }[b.lane]
      if (lane !== 0) return lane
      return a.order - b.order || a.title.localeCompare(b.title)
    })
    .slice(0, 40)
})

const activeCalendarTag = computed(() => {
  const chosen = calendarTag.value.trim()
  if (chosen && chosen !== '__new__') return chosen
  return calendarTagDraft.value.trim().replace(/\s+/g, ' ')
})

onMounted(() => {
  void ensureDay()
  if (!calendarTag.value && knownCalendars.value[0]) {
    calendarTag.value = knownCalendars.value[0]
  }
})

function projectName(taskId: string | null): string {
  if (!taskId) return ''
  const task = board.tasks.find((item) => item.id === taskId)
  if (!task) return ''
  return projectById(task.projectId)?.name ?? ''
}

function kindLabel(item: DayItem): string {
  if (item.kind === 'task') return projectName(item.taskId) || 'Task'
  if (item.kind === 'event') return item.calendarTag ? `Calendar · ${item.calendarTag}` : 'Calendar'
  return 'Todo'
}

function addTodo() {
  const title = draft.value.trim()
  if (!title) return
  draft.value = ''
  addDayItem({ title, kind: 'todo' })
}

function pinTask(task: Task) {
  addDayItem({ title: task.title, kind: 'task', taskId: task.id })
  pickingTask.value = false
}

function clearDrag() {
  draggingId.value = null
  overId.value = null
}

function onDragStart(id: string, event: DragEvent) {
  const origin = event.target as HTMLElement | null
  if (origin?.closest('button, input, a')) {
    event.preventDefault()
    return
  }
  draggingId.value = id
  event.dataTransfer?.setData('text/plain', id)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}

function onDrop(beforeId: string) {
  const id = draggingId.value
  clearDrag()
  if (!id || id === beforeId) return
  placeDayItem(id, beforeId)
}

function onDropEnd() {
  const id = draggingId.value
  clearDrag()
  if (!id) return
  placeDayItem(id, null)
}

async function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('Could not read that photo.'))
    reader.readAsDataURL(file)
  })
}

async function shrink(file: File): Promise<string> {
  if (file.size <= 2_500_000 && /image\/(jpeg|jpg|png|webp)/i.test(file.type)) {
    return readAsDataUrl(file)
  }
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    return readAsDataUrl(file)
  }
  const longest = Math.max(bitmap.width, bitmap.height)
  const scale = Math.min(1, 2400 / longest)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const context = canvas.getContext('2d')
  if (!context) {
    bitmap.close()
    return readAsDataUrl(file)
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', 0.92)
}

async function useFile(file: File | undefined) {
  if (!file) {
    captureError.value = 'Choose a photo of a calendar or list.'
    return
  }
  reading.value = true
  captureError.value = ''
  lines.value = []
  try {
    const image = await shrink(file)
    preview.value = image
    const found = await readPhoto(image)
    if (found.length === 0) {
      captureError.value = 'Nothing clear came off that photo. Edit a line below or try again.'
      lines.value = [{ id: nextLineId++, text: '', keep: true }]
      return
    }
    lines.value = found.map((text) => ({ id: nextLineId++, text, keep: true }))
  } catch (cause) {
    captureError.value = cause instanceof Error ? cause.message : 'Could not read that photo.'
    if (lines.value.length === 0) lines.value = [{ id: nextLineId++, text: '', keep: true }]
  } finally {
    reading.value = false
  }
}

function onPick(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  void useFile(file)
}

function keptLines(): string[] {
  return lines.value
    .map((line) => line.text.trim())
    .filter((text, index, all) => {
      const row = lines.value[index]
      return Boolean(row?.keep && text.length > 1 && all.indexOf(text) === index)
    })
}

function applyCapture() {
  const tag = activeCalendarTag.value
  if (!tag) {
    captureError.value = 'Tag which calendar this photo is from.'
    return
  }
  const kept = keptLines()
  if (kept.length === 0) {
    captureError.value = 'Keep at least one line.'
    return
  }

  const missing = missingCalendarItems(tag, kept)
  let removeMissing = false
  if (missing.length > 0) {
    const list = missing
      .slice(0, 8)
      .map((item) => `• ${item.title}`)
      .join('\n')
    const extra = missing.length > 8 ? `\n…and ${missing.length - 8} more` : ''
    const ok = window.confirm(
      `These open items from “${tag}” are not in this photo.\n\n${list}${extra}\n\nRemove them from today?\n\nOK = remove · Cancel = keep them and only add new lines.`,
    )
    removeMissing = ok
  }

  localStorage.setItem('rhino_calendar_tag', tag)
  calendarTag.value = tag
  calendarTagDraft.value = ''
  addDayLines(kept, { kind: 'event', calendarTag: tag, removeMissing })
  capturing.value = false
  preview.value = ''
  lines.value = []
  captureError.value = ''
}

function closeCapture() {
  capturing.value = false
  preview.value = ''
  lines.value = []
  captureError.value = ''
}

function openCapture() {
  capturing.value = true
  if (!calendarTag.value && knownCalendars.value[0]) {
    calendarTag.value = knownCalendars.value[0]
  } else if (!calendarTag.value) {
    calendarTag.value = '__new__'
  }
}
</script>

<template>
  <section aria-labelledby="day-title">
    <p class="kicker">Day plan</p>
    <div class="project-head">
      <div>
        <h2 id="day-title" class="display">{{ formatDayLabel(today) }}.</h2>
        <p class="lede">Quick todos, a few project tasks, and lines from a calendar photo — unfinished rolls forward.</p>
      </div>
      <div class="actions">
        <button class="texty" type="button" @click="pickingTask = !pickingTask">
          {{ pickingTask ? 'Hide tasks' : 'Pin a task' }}
        </button>
        <button class="solid" type="button" @click="openCapture">From a photo</button>
      </div>
    </div>

    <form class="composer adder day-add" @submit.prevent="addTodo">
      <input v-model="draft" aria-label="Quick todo" placeholder="Add a simple todo for today" />
      <button class="solid" type="submit">Add</button>
    </form>

    <div v-if="pickingTask" class="day-pin-panel">
      <p class="meta">Pin an open project task onto today. Checking it off here only clears the day plan.</p>
      <p v-if="pinCandidates.length === 0" class="empty">Nothing left to pin, or everything useful is already here.</p>
      <button
        v-for="task in pinCandidates"
        :key="task.id"
        class="row day-pin-row"
        type="button"
        @click="pinTask(task)"
      >
        <div class="who">
          <strong>{{ task.title }}</strong>
          <p class="meta">{{ projectById(task.projectId)?.name }} · {{ task.lane }}</p>
        </div>
        <span class="row-link">Pin</span>
      </button>
    </div>

    <div
      class="day-agenda"
      @dragover.prevent
      @drop="onDropEnd"
    >
      <p v-if="openAgenda.length === 0" class="empty">Nothing planned yet. Add a todo, pin a task, or read a calendar photo.</p>
      <article
        v-for="item in openAgenda"
        :key="item.id"
        class="row day-item"
        :class="{ dragging: draggingId === item.id, over: overId === item.id }"
        draggable="true"
        @dragstart="onDragStart(item.id, $event)"
        @dragover.prevent="overId = item.id"
        @drop.stop="onDrop(item.id)"
        @dragend="clearDrag"
      >
        <label class="day-check">
          <input type="checkbox" :checked="item.done" @change="setDayItemDone(item.id, true)" />
          <span class="visually-hidden">Done</span>
        </label>
        <div class="who">
          <strong>{{ item.title }}</strong>
          <p class="meta">
            {{ kindLabel(item) }}
            <template v-if="item.createdOn < today"> · carried</template>
          </p>
        </div>
        <button class="texty" type="button" @click="removeDayItem(item.id)">Remove</button>
      </article>
    </div>

    <div v-if="doneAgenda.length" class="day-done">
      <h3>Done today</h3>
      <article v-for="item in doneAgenda" :key="item.id" class="row day-item done">
        <label class="day-check">
          <input type="checkbox" checked @change="setDayItemDone(item.id, false)" />
          <span class="visually-hidden">Reopen</span>
        </label>
        <div class="who">
          <strong>{{ item.title }}</strong>
          <p class="meta">{{ kindLabel(item) }}</p>
        </div>
        <button class="texty" type="button" @click="removeDayItem(item.id)">Remove</button>
      </article>
    </div>

    <div v-if="capturing" class="task-back" @click.self="closeCapture">
      <section class="task-sheet add-task-sheet" role="dialog" aria-labelledby="day-photo-title" @click.stop>
        <header class="task-sheet-head">
          <div>
            <p class="kicker">Day plan</p>
            <h2 id="day-photo-title" class="display">From a photo</h2>
          </div>
          <button class="texty" type="button" @click="closeCapture">Close</button>
        </header>
        <p class="lede">
          Snap one calendar at a time and tag it (Kitchen, Work, Phone…). Removals only apply within that tag.
        </p>
        <label class="field">
          <span>Calendar</span>
          <select v-model="calendarTag" aria-label="Calendar tag">
            <option v-for="tag in knownCalendars" :key="tag" :value="tag">{{ tag }}</option>
            <option value="__new__">New calendar…</option>
          </select>
        </label>
        <label v-if="calendarTag === '__new__'" class="field">
          <span>Name</span>
          <input
            v-model="calendarTagDraft"
            aria-label="New calendar name"
            placeholder="e.g. Kitchen wall"
            required
          />
        </label>
        <label class="drop" :class="{ busy: reading }">
          <span>{{ reading ? 'Reading…' : 'Drop or choose a photo' }}</span>
          <input type="file" accept="image/*" capture="environment" @change="onPick" />
        </label>
        <img v-if="preview" class="day-preview" :src="preview" alt="" />
        <p v-if="captureError" class="notice">{{ captureError }}</p>
        <div v-if="lines.length" class="day-lines">
          <label v-for="line in lines" :key="line.id" class="day-line">
            <input v-model="line.keep" type="checkbox" />
            <input v-model="line.text" aria-label="Line text" />
          </label>
        </div>
        <div class="task-sheet-actions">
          <button class="solid" type="button" :disabled="!lines.length" @click="applyCapture">Add to today</button>
          <button class="texty" type="button" @click="lines.push({ id: nextLineId++, text: '', keep: true })">
            Add a line
          </button>
        </div>
      </section>
    </div>
  </section>
</template>
