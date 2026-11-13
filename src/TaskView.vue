<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { board, removeTask, renameTask, setAssist, setLane, setNote, setTaskRef, setTaskStatus } from './store'
import type { Lane, TaskStatus } from './types'

const props = defineProps<{ taskId: string }>()
const emit = defineEmits<{ close: [] }>()

const lanes: Lane[] = ['now', 'next', 'later']
const title = ref('')
const note = ref('')
const startRef = ref('')
const doneRef = ref('')

const task = computed(() => board.tasks.find((item) => item.id === props.taskId) ?? null)
const project = computed(() => board.projects.find((item) => item.id === task.value?.projectId) ?? null)

watch(
  () => task.value,
  (item) => {
    if (!item) {
      emit('close')
      return
    }
    title.value = item.title
    note.value = item.note ?? ''
    startRef.value = item.startRef ?? ''
    doneRef.value = item.doneRef ?? ''
  },
  { immediate: true },
)

function laneLabel(lane: Lane) {
  if (lane === 'now') return 'Now'
  if (lane === 'next') return 'Next'
  return 'Later'
}

function statusLabel(status: TaskStatus) {
  if (status === 'in_progress') return 'In progress'
  if (status === 'done') return 'Done'
  return 'Open'
}

function formatWhen(iso: string | null | undefined) {
  if (!iso) return '—'
  const when = Date.parse(iso)
  if (!Number.isFinite(when)) return '—'
  return new Date(when).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function saveTitle() {
  if (!task.value) return
  renameTask(task.value.id, title.value)
}

function saveNote() {
  if (!task.value) return
  setNote(task.value.id, note.value)
}

function saveStartRef() {
  if (!task.value) return
  setTaskRef(task.value.id, 'startRef', startRef.value)
}

function saveDoneRef() {
  if (!task.value) return
  setTaskRef(task.value.id, 'doneRef', doneRef.value)
}

function setStatus(status: TaskStatus) {
  if (!task.value) return
  const refs =
    status === 'in_progress'
      ? { startRef: startRef.value || null }
      : status === 'done'
        ? { doneRef: doneRef.value || null }
        : undefined
  setTaskStatus(task.value.id, status, refs)
  if (status === 'done') emit('close')
}

function remove() {
  if (!task.value) return
  if (!window.confirm(`Delete “${task.value.title}”?`)) return
  removeTask(task.value.id)
  emit('close')
}

function onBack(event: MouseEvent) {
  if (event.target === event.currentTarget) emit('close')
}
</script>

<template>
  <div v-if="task" class="task-back" @click="onBack">
    <section class="task-sheet" role="dialog" aria-labelledby="task-sheet-title" @click.stop>
      <header class="task-sheet-head">
        <div>
          <p class="kicker">{{ project?.name ?? 'Task' }} · {{ statusLabel(task.status) }}</p>
          <h2 id="task-sheet-title" class="display">Edit task</h2>
        </div>
        <button class="texty" type="button" @click="emit('close')">Close</button>
      </header>

      <label class="field">
        <span>Title</span>
        <textarea v-model="title" rows="2" aria-label="Task title" @change="saveTitle" />
      </label>

      <label class="field">
        <span>Note</span>
        <textarea v-model="note" rows="4" aria-label="Task note" placeholder="Optional detail" @change="saveNote" />
      </label>

      <div class="field">
        <span>Status</span>
        <div class="lane-switch" role="group" aria-label="Status">
          <button type="button" :aria-pressed="task.status === 'open'" @click="setStatus('open')">Open</button>
          <button type="button" :aria-pressed="task.status === 'in_progress'" @click="setStatus('in_progress')">
            In progress
          </button>
          <button type="button" :aria-pressed="task.status === 'done'" @click="setStatus('done')">Done</button>
        </div>
      </div>

      <div class="field">
        <span>Lane</span>
        <div class="lane-switch" role="group" aria-label="Lane">
          <button
            v-for="target in lanes"
            :key="target"
            type="button"
            :aria-pressed="task.lane === target"
            @click="setLane(task.id, target)"
          >
            {{ laneLabel(target) }}
          </button>
        </div>
      </div>

      <label class="field">
        <span>Start ref</span>
        <input
          v-model="startRef"
          aria-label="Start commit or link"
          placeholder="Commit SHA or URL when started"
          @change="saveStartRef"
        />
      </label>

      <label class="field">
        <span>Done ref</span>
        <input
          v-model="doneRef"
          aria-label="Done commit or link"
          placeholder="Commit SHA or URL when finished"
          @change="saveDoneRef"
        />
      </label>

      <label class="field assist-field">
        <span>Agent readiness</span>
        <div class="assist">
          <input
            type="range"
            min="1"
            max="10"
            step="1"
            :value="task.assist ?? 5"
            aria-label="Agent readiness. 1 is a person, 10 is ready to hand to an agent."
            title="1 is a person, 10 is ready to hand to an agent"
            @input="setAssist(task.id, Number(($event.target as HTMLInputElement).value))"
          />
          <strong>{{ task.assist ?? 5 }}</strong>
        </div>
        <p class="meta">1 is a person · 10 is ready for an agent</p>
      </label>

      <p class="meta source-line">
        Created {{ formatWhen(task.createdAt) }}
        · Updated {{ formatWhen(task.updatedAt) }}
        <template v-if="task.startedAt"> · Started {{ formatWhen(task.startedAt) }}</template>
        <template v-if="task.doneAt"> · Done {{ formatWhen(task.doneAt) }}</template>
      </p>
      <p class="meta source-line">{{ task.source }}</p>

      <div class="task-sheet-actions">
        <button
          v-if="task.status !== 'done'"
          class="solid"
          type="button"
          @click="setStatus(task.status === 'in_progress' ? 'done' : 'in_progress')"
        >
          {{ task.status === 'in_progress' ? 'Complete' : 'Start' }}
        </button>
        <button v-else class="solid" type="button" @click="setStatus('open')">Reopen</button>
        <button class="texty danger" type="button" @click="remove">Delete</button>
      </div>
    </section>
  </div>
</template>
