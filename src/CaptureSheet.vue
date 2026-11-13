<script setup lang="ts">
import { computed, ref } from 'vue'
import { addProject, applyCapture, board, readPhoto } from './store'
import type { Lane } from './types'

const props = defineProps<{ projectId: string | null }>()
const emit = defineEmits<{ close: []; applied: [projectId: string] }>()

const reading = ref(false)
const saving = ref(false)
const dragging = ref(false)
const error = ref('')
const preview = ref('')
const lines = ref<{ id: number; text: string; keep: boolean }[]>([])
const mode = ref<'todos' | 'notes'>('todos')
const lane = ref<Lane>('next')
const chosenId = ref(props.projectId ?? board.projects.find((project) => project.status === 'open')?.id ?? '')
const newName = ref('')
let nextId = 1

const projects = computed(() => [...board.projects].sort((a, b) => a.name.localeCompare(b.name)))
const keptCount = computed(() => lines.value.filter((line) => line.keep && line.text.trim().length > 1).length)

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('Could not read that photo.'))
    reader.readAsDataURL(file)
  })
}

async function shrink(file: File): Promise<string> {
  // Keep modest originals intact (and keep EXIF) so OCR gets a clean shot.
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

function addBlankLine() {
  lines.value.push({ id: nextId++, text: '', keep: true })
}

async function useFile(file: File | undefined) {
  if (!file) {
    error.value = 'Choose a photo of the list.'
    return
  }
  const type = file.type || ''
  if (type && !type.startsWith('image/') && !/\.(jpe?g|png|heic|heif|webp)$/i.test(file.name)) {
    error.value = 'Choose a photo of the list.'
    return
  }
  reading.value = true
  error.value = ''
  lines.value = []
  try {
    const image = await shrink(file)
    if (!image.startsWith('data:')) throw new Error('Could not read that photo.')
    preview.value = image
    const found = await readPhoto(image)
    if (found.length === 0) {
      error.value = 'Nothing clear came off that photo. Edit a line below or try a closer, brighter shot.'
      addBlankLine()
      return
    }
    lines.value = found.map((text) => ({ id: nextId++, text, keep: true }))
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Could not read that photo.'
    if (lines.value.length === 0) addBlankLine()
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

function onDrop(event: DragEvent) {
  dragging.value = false
  void useFile(event.dataTransfer?.files?.[0])
}

async function save() {
  const ready = lines.value.map((line) => (line.keep ? line.text.trim() : '')).filter((line) => line.length > 1)
  if (ready.length === 0) {
    error.value = 'Keep at least one line.'
    return
  }
  saving.value = true
  error.value = ''
  try {
    let projectId = chosenId.value
    const name = newName.value.trim()
    if (name) {
      const created = await addProject(name)
      if (!created) throw new Error('Could not add that project.')
      projectId = created.id
    }
    if (!projectId) throw new Error('Choose a project.')
    await applyCapture({ projectId, mode: mode.value, lane: lane.value, lines: ready })
    emit('applied', projectId)
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Could not save the list.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="capture-back" @click.self="emit('close')">
    <section class="capture" role="dialog" aria-labelledby="capture-title" aria-modal="true">
      <header class="capture-head">
        <div>
          <p class="kicker">From a photo</p>
          <h2 id="capture-title">Read a written list</h2>
        </div>
        <button class="texty" type="button" @click="emit('close')">Close</button>
      </header>
      <p class="lede">
        Photograph a handwritten or printed list. It is read on this Mac, then you choose what to keep.
      </p>

      <label
        class="drop"
        :class="{ dragging, busy: reading }"
        @dragover.prevent="dragging = true"
        @dragleave="dragging = false"
        @drop.prevent="onDrop"
      >
        <input type="file" accept="image/*" :disabled="reading" @change="onPick" />
        <img v-if="preview" :src="preview" alt="" />
        <span>{{ reading ? 'Reading the list…' : 'Take or choose a photo' }}</span>
      </label>

      <p v-if="error" class="banner">{{ error }}</p>

      <template v-if="lines.length">
        <div class="mode" role="group" aria-label="Where the list goes">
          <button type="button" :aria-pressed="mode === 'todos'" @click="mode = 'todos'">Todos</button>
          <button type="button" :aria-pressed="mode === 'notes'" @click="mode = 'notes'">Project notes</button>
        </div>

        <div class="capture-fields">
          <label>
            Project
            <select v-model="chosenId" :disabled="newName.trim().length > 0">
              <option v-for="project in projects" :key="project.id" :value="project.id">{{ project.name }}</option>
            </select>
          </label>
          <label>
            Or a new project
            <input v-model="newName" placeholder="Project name" />
          </label>
          <label v-if="mode === 'todos'">
            Lane
            <select v-model="lane">
              <option value="now">Now</option>
              <option value="next">Next</option>
              <option value="later">Later</option>
            </select>
          </label>
        </div>

        <ul class="found">
          <li v-for="line in lines" :key="line.id">
            <input v-model="line.keep" type="checkbox" :aria-label="`Keep ${line.text || 'line'}`" />
            <input v-model="line.text" :aria-label="`Line: ${line.text || 'empty'}`" placeholder="Edit line" />
          </li>
        </ul>
        <button class="texty" type="button" @click="addBlankLine">Add a line</button>

        <button class="solid" type="button" :disabled="saving || keptCount === 0" @click="save">
          {{ saving ? 'Saving…' : mode === 'todos' ? `Add ${keptCount} todos` : `Add ${keptCount} lines to notes` }}
        </button>
      </template>
    </section>
  </div>
</template>
