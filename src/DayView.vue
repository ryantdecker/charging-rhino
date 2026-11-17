<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  asTime,
  dayItemsFor,
  formatDayHeading,
  formatDayLabel,
  formatTimeLabel,
  formatWeekLabel,
  isDayIso,
  shiftDayIso,
  todayIso,
  weekDaysContaining,
} from './day'
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
  renameDayItem,
  setDayItemDate,
  setDayItemDone,
  setDayItemTime,
  setTaskStatus,
} from './store'
import type { DaySpan } from './route'
import { isActiveTask, type DayItem, type Task } from './types'

const props = withDefaults(defineProps<{ date?: string; span?: Exclude<DaySpan, 'month'> }>(), {
  span: 'day',
})
const emit = defineEmits<{ navigate: [target: { date: string; span: DaySpan }] }>()

const today = todayIso()
const focusDate = computed(() => (isDayIso(props.date) ? props.date : today))
const isWeek = computed(() => props.span === 'week')
type AddMethod = 'todo' | 'task' | 'photo'
const adding = ref(false)
const addMethod = ref<AddMethod>('todo')
const draft = ref('')
const draftTime = ref('')
const reading = ref(false)
const captureError = ref('')
const preview = ref('')
const lines = ref<{ id: number; text: string; keep: boolean }[]>([])
const calendarTag = ref(localStorage.getItem('rhino_calendar_tag') ?? '')
const calendarTagDraft = ref('')
const editingId = ref<string | null>(null)
const editTitle = ref('')
const editDate = ref('')
const editTime = ref('')
const resolvingId = ref<string | null>(null)
const draggingId = ref<string | null>(null)
const overId = ref<string | null>(null)
let nextLineId = 1
let itemWasDragged = false

const editingItem = computed(
  () => board.dayItems.find((item) => item.id === editingId.value) ?? null,
)
const resolvingItem = computed(
  () => board.dayItems.find((item) => item.id === resolvingId.value) ?? null,
)
const resolvingTask = computed(() => {
  const item = resolvingItem.value
  if (!item?.taskId) return null
  return board.tasks.find((task) => task.id === item.taskId) ?? null
})

const agenda = computed(() => dayItemsFor(board.dayItems, focusDate.value))
const openAgenda = computed(() => agenda.value.filter((item) => !item.done))
const doneAgenda = computed(() => agenda.value.filter((item) => item.done))
const knownCalendars = computed(() => calendarTags())
const isToday = computed(() => focusDate.value === today)
const weekDays = computed(() =>
  weekDaysContaining(focusDate.value).map((date) => {
    const items = dayItemsFor(board.dayItems, date)
    return {
      date,
      label: formatDayHeading(date),
      isToday: date === today,
      isFocus: date === focusDate.value,
      open: items.filter((item) => !item.done),
      done: items.filter((item) => item.done),
    }
  }),
)

function navigateTo(date: string, span: DaySpan = props.span) {
  if (!isDayIso(date)) return
  if (date === focusDate.value && span === props.span) return
  emit('navigate', { date, span })
}

function shiftFocus(amount: number) {
  navigateTo(shiftDayIso(focusDate.value, amount), props.span)
}

function onDateInput(event: Event) {
  const value = (event.target as HTMLInputElement).value
  if (isDayIso(value)) navigateTo(value, props.span)
}

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
  if (isToday.value) void ensureDay()
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

function openAdd(method: AddMethod = 'todo') {
  addMethod.value = method
  draft.value = ''
  draftTime.value = ''
  captureError.value = ''
  preview.value = ''
  lines.value = []
  if (!calendarTag.value && knownCalendars.value[0]) {
    calendarTag.value = knownCalendars.value[0]
  } else if (!calendarTag.value) {
    calendarTag.value = '__new__'
  }
  adding.value = true
}

function closeAdd() {
  adding.value = false
  draft.value = ''
  draftTime.value = ''
  captureError.value = ''
  preview.value = ''
  lines.value = []
  reading.value = false
}

function onAddBack(event: MouseEvent) {
  if (event.target === event.currentTarget) closeAdd()
}

function addTodo() {
  const title = draft.value.trim()
  if (!title) return
  const time = asTime(draftTime.value)
  addDayItem({ title, kind: 'todo', plannedFor: focusDate.value, time })
  closeAdd()
}

function pinTask(task: Task) {
  addDayItem({ title: task.title, kind: 'task', taskId: task.id, plannedFor: focusDate.value })
  closeAdd()
}

function clearDrag() {
  draggingId.value = null
  overId.value = null
  window.setTimeout(() => {
    itemWasDragged = false
  }, 0)
}

function onDragStart(id: string, event: DragEvent) {
  const origin = event.target as HTMLElement | null
  if (origin?.closest('button, input, a, label')) {
    event.preventDefault()
    return
  }
  itemWasDragged = true
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

function completeDayItem(item: DayItem) {
  if (item.kind === 'task' && item.taskId) {
    const task = board.tasks.find((row) => row.id === item.taskId)
    if (task && task.status !== 'done') {
      resolvingId.value = item.id
      return
    }
  }
  setDayItemDone(item.id, true)
}

function closeResolve() {
  resolvingId.value = null
}

function onResolveBack(event: MouseEvent) {
  if (event.target === event.currentTarget) closeResolve()
}

function resolvePinned(completeTask: boolean) {
  const item = resolvingItem.value
  if (!item) return
  const taskId = item.taskId
  setDayItemDone(item.id, true)
  if (completeTask && taskId) setTaskStatus(taskId, 'done')
  closeResolve()
}

function openEdit(item: DayItem) {
  if (itemWasDragged) {
    itemWasDragged = false
    return
  }
  editingId.value = item.id
  editTitle.value = item.title
  editDate.value = item.plannedFor
  editTime.value = item.time ?? ''
}

function closeEdit() {
  editingId.value = null
  editTitle.value = ''
  editDate.value = ''
  editTime.value = ''
}

function saveEdit() {
  const item = editingItem.value
  if (!item) return
  const title = editTitle.value.trim()
  if (!title) return
  renameDayItem(item.id, title)
  if (editDate.value && editDate.value !== item.plannedFor) {
    setDayItemDate(item.id, editDate.value)
  }
  const time = asTime(editTime.value)
  if (time !== (item.time ?? null)) setDayItemTime(item.id, time)
  closeEdit()
}

function deleteEdit() {
  const item = editingItem.value
  if (!item) return
  if (!window.confirm(`Delete “${item.title}”?`)) return
  removeDayItem(item.id)
  closeEdit()
}

function onEditBack(event: MouseEvent) {
  if (event.target === event.currentTarget) closeEdit()
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

  const missing = missingCalendarItems(tag, kept, focusDate.value)
  let removeMissing = false
  if (missing.length > 0) {
    const list = missing
      .slice(0, 8)
      .map((item) => `• ${item.title}`)
      .join('\n')
    const extra = missing.length > 8 ? `\n…and ${missing.length - 8} more` : ''
    const ok = window.confirm(
      `These open items from “${tag}” are not in this photo.\n\n${list}${extra}\n\nRemove them from this day?\n\nOK = remove · Cancel = keep them and only add new lines.`,
    )
    removeMissing = ok
  }

  localStorage.setItem('rhino_calendar_tag', tag)
  calendarTag.value = tag
  calendarTagDraft.value = ''
  addDayLines(kept, {
    kind: 'event',
    calendarTag: tag,
    removeMissing,
    plannedFor: focusDate.value,
  })
  closeAdd()
}
</script>

<template>
  <section aria-labelledby="day-title">
    <div class="project-head">
      <div>
        <h2 id="day-title" class="display">
          {{ isWeek ? formatWeekLabel(focusDate) : `${formatDayLabel(focusDate)}.` }}
        </h2>
        <p class="lede">
          Quick todos, pinned tasks, and calendar lines
          <template v-if="isToday && !isWeek"> — unfinished rolls forward</template>.
        </p>
      </div>
      <div class="actions">
        <button class="solid" type="button" @click="openAdd()">Add</button>
      </div>
    </div>

    <div class="day-toolbar">
      <div class="day-nav" role="group" :aria-label="isWeek ? 'Week' : 'Day'">
        <button class="texty" type="button" @click="shiftFocus(isWeek ? -7 : -1)">
          {{ isWeek ? 'Previous week' : 'Previous' }}
        </button>
        <input
          class="day-date-input"
          type="date"
          :value="focusDate"
          :aria-label="isWeek ? 'Jump to week' : 'Jump to day'"
          @change="onDateInput"
        />
        <button class="texty" type="button" @click="shiftFocus(isWeek ? 7 : 1)">
          {{ isWeek ? 'Next week' : 'Next' }}
        </button>
        <button
          v-if="!isToday || isWeek"
          class="texty"
          type="button"
          @click="navigateTo(today, props.span)"
        >
          Today
        </button>
      </div>
    </div>

    <div v-if="isWeek" class="week-stack">
      <section
        v-for="day in weekDays"
        :key="day.date"
        class="week-day"
        :class="{ focus: day.isFocus, today: day.isToday }"
      >
        <header class="week-day-head">
          <button class="week-day-open" type="button" @click="navigateTo(day.date, 'day')">
            <strong>{{ day.label }}</strong>
            <span class="meta">{{ day.open.length }} open</span>
          </button>
          <button
            v-if="!day.isFocus"
            class="texty"
            type="button"
            @click="navigateTo(day.date, 'week')"
          >
            Plan here
          </button>
        </header>
        <p v-if="day.open.length === 0" class="empty week-empty">Clear.</p>
        <article
          v-for="item in day.open"
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
            <input type="checkbox" :checked="item.done" @change="completeDayItem(item)" />
            <span class="visually-hidden">Done</span>
          </label>
          <div class="who">
            <strong>
              <span v-if="item.time" class="day-time">{{ formatTimeLabel(item.time) }}</span>
              {{ item.title }}
            </strong>
            <p class="meta">{{ kindLabel(item) }}</p>
          </div>
          <button class="texty" type="button" @click.stop="openEdit(item)">Edit</button>
        </article>
        <p v-if="day.done.length" class="meta week-done-meta">{{ day.done.length }} done</p>
      </section>
    </div>

    <template v-else>
      <div
        class="day-agenda"
        @dragover.prevent
        @drop="onDropEnd"
      >
        <p v-if="openAgenda.length === 0" class="empty">Nothing planned yet. Tap Add to write a todo, pin a task, or read a photo.</p>
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
            <input type="checkbox" :checked="item.done" @change="completeDayItem(item)" />
            <span class="visually-hidden">Done</span>
          </label>
          <div class="who">
            <strong>
              <span v-if="item.time" class="day-time">{{ formatTimeLabel(item.time) }}</span>
              {{ item.title }}
            </strong>
            <p class="meta">
              {{ kindLabel(item) }}
              <template v-if="item.carriedFrom"> · carried</template>
            </p>
          </div>
          <button class="texty" type="button" @click.stop="openEdit(item)">Edit</button>
        </article>
      </div>

      <div v-if="doneAgenda.length" class="day-done">
        <h3>{{ isToday ? 'Done today' : 'Done' }}</h3>
        <article v-for="item in doneAgenda" :key="item.id" class="row day-item done">
          <label class="day-check">
            <input type="checkbox" checked @change="setDayItemDone(item.id, false)" />
            <span class="visually-hidden">Reopen</span>
          </label>
          <div class="who">
            <strong>
              <span v-if="item.time" class="day-time">{{ formatTimeLabel(item.time) }}</span>
              {{ item.title }}
            </strong>
            <p class="meta">{{ kindLabel(item) }}</p>
          </div>
          <button class="texty" type="button" @click.stop="openEdit(item)">Edit</button>
        </article>
      </div>
    </template>

    <div v-if="resolvingItem" class="task-back" @click="onResolveBack">
      <section
        class="task-sheet add-task-sheet"
        role="dialog"
        aria-labelledby="day-resolve-title"
        @click.stop
      >
        <header class="task-sheet-head">
          <div>
            <p class="kicker">{{ projectName(resolvingItem.taskId) || 'Pinned task' }}</p>
            <h2 id="day-resolve-title" class="display">Clear from today?</h2>
          </div>
          <button class="texty" type="button" @click="closeResolve">Close</button>
        </header>
        <p class="lede">
          “{{ resolvingTask?.title ?? resolvingItem.title }}” will leave the day plan.
          Do you also want to mark the project task done?
        </p>
        <div class="task-sheet-actions resolve-actions">
          <button class="solid" type="button" @click="resolvePinned(true)">Mark task done</button>
          <button class="texty" type="button" @click="resolvePinned(false)">Leave task open</button>
        </div>
      </section>
    </div>

    <div v-if="editingItem" class="task-back" @click="onEditBack">
      <section class="task-sheet add-task-sheet" role="dialog" aria-labelledby="day-edit-title" @click.stop>
        <header class="task-sheet-head">
          <div>
            <p class="kicker">{{ kindLabel(editingItem) }}</p>
            <h2 id="day-edit-title" class="display">Edit item</h2>
          </div>
          <button class="texty" type="button" @click="closeEdit">Close</button>
        </header>
        <form class="add-task-form" @submit.prevent="saveEdit">
          <label class="field">
            <span>Text</span>
            <input v-model="editTitle" aria-label="Item text" required autofocus />
          </label>
          <label class="field">
            <span>Day</span>
            <input v-model="editDate" type="date" aria-label="Assigned day" required />
          </label>
          <label class="field">
            <span>Time</span>
            <input v-model="editTime" type="time" aria-label="Optional time" />
          </label>
          <div class="task-sheet-actions">
            <button class="solid" type="submit">Save</button>
            <button class="texty danger" type="button" @click="deleteEdit">Delete</button>
          </div>
        </form>
      </section>
    </div>

    <div v-if="adding" class="task-back" @click="onAddBack">
      <section class="task-sheet add-task-sheet" role="dialog" aria-labelledby="day-add-title" @click.stop>
        <header class="task-sheet-head">
          <div>
            <p class="kicker">{{ formatDayHeading(focusDate) }}</p>
            <h2 id="day-add-title" class="display">Add</h2>
          </div>
          <button class="texty" type="button" @click="closeAdd">Close</button>
        </header>

        <div class="lane-switch" role="group" aria-label="How to add">
          <button type="button" :aria-pressed="addMethod === 'todo'" @click="addMethod = 'todo'">Todo</button>
          <button type="button" :aria-pressed="addMethod === 'task'" @click="addMethod = 'task'">Pin task</button>
          <button type="button" :aria-pressed="addMethod === 'photo'" @click="addMethod = 'photo'">Photo</button>
        </div>

        <form v-if="addMethod === 'todo'" class="add-task-form" @submit.prevent="addTodo">
          <label class="field">
            <span>Text</span>
            <input
              v-model="draft"
              aria-label="Quick todo"
              placeholder="What needs to happen?"
              required
              autofocus
            />
          </label>
          <label class="field">
            <span>Time</span>
            <input v-model="draftTime" type="time" aria-label="Optional time" />
          </label>
          <div class="task-sheet-actions">
            <button class="solid" type="submit">Add todo</button>
          </div>
        </form>

        <div v-else-if="addMethod === 'task'" class="day-pin-panel day-pin-modal">
          <p class="meta">
            Pin an open project task onto {{ formatDayHeading(focusDate) }}. Checking it off here only clears the day plan unless you also close the task.
          </p>
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

        <div v-else class="add-task-form">
          <p class="lede add-photo-lede">
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
            <button class="solid" type="button" :disabled="!lines.length" @click="applyCapture">
              Add to {{ formatDayHeading(focusDate) }}
            </button>
            <button class="texty" type="button" @click="lines.push({ id: nextLineId++, text: '', keep: true })">
              Add a line
            </button>
          </div>
        </div>
      </section>
    </div>
  </section>
</template>
