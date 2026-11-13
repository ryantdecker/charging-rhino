<script setup lang="ts">
import { computed, ref } from 'vue'
import { board, saveSettings, setProjectTags } from './store'
import type { Horizon, Project } from './types'

const tagDraft = ref('')
const editFrom = ref<string | null>(null)
const editTo = ref('')
const horizons: { id: Horizon; label: string; note: string }[] = [
  { id: 'day', label: 'Day', note: 'Home opens on the Now lane.' },
  { id: 'week', label: 'Week', note: 'Home opens on Now and Next.' },
  { id: 'month', label: 'Month', note: 'Home opens on the whole charge.' },
]

const catalog = computed(() => [...board.prefs.tags].sort((a, b) => a.localeCompare(b)))
const projects = computed(() =>
  [...board.projects].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'open' ? -1 : 1
    return a.name.localeCompare(b.name)
  }),
)

function usage(tag: string): number {
  const key = tag.toLowerCase()
  return board.projects.filter((project) => (project.tags ?? []).some((item) => item.toLowerCase() === key)).length
}

function addTag() {
  const tag = tagDraft.value.trim()
  tagDraft.value = ''
  if (!tag) return
  saveSettings({ addTag: tag })
}

function startRename(tag: string) {
  editFrom.value = tag
  editTo.value = tag
}

function cancelRename() {
  editFrom.value = null
  editTo.value = ''
}

function commitRename() {
  const from = editFrom.value
  const to = editTo.value.trim()
  if (!from || !to || to.toLowerCase() === from.toLowerCase()) {
    cancelRename()
    return
  }
  saveSettings({ renameTag: { from, to } })
  cancelRename()
}

function removeTag(tag: string) {
  saveSettings({ removeTag: tag })
  if (editFrom.value?.toLowerCase() === tag.toLowerCase()) cancelRename()
}

function hasTag(project: Project, tag: string): boolean {
  return (project.tags ?? []).some((item) => item.toLowerCase() === tag.toLowerCase())
}

function toggleProjectTag(project: Project, tag: string) {
  const key = tag.toLowerCase()
  const tags = hasTag(project, tag)
    ? (project.tags ?? []).filter((item) => item.toLowerCase() !== key)
    : [...(project.tags ?? []), tag]
  setProjectTags(project.id, tags)
}

function setHorizon(value: Horizon) {
  if (board.prefs.defaultHorizon === value) return
  saveSettings({ defaultHorizon: value })
}
</script>

<template>
  <section aria-labelledby="settings-title">
    <p class="kicker">Settings</p>
    <div class="project-head">
      <h2 id="settings-title" class="display">Admin.</h2>
    </div>
    <p class="lede">Tags and the defaults that shape the charge.</p>

    <article class="settings-block">
      <header>
        <h3>Home range</h3>
        <p>Which day / week / month filter Home starts on.</p>
      </header>
      <div class="mode" role="group" aria-label="Default home range">
        <button
          v-for="option in horizons"
          :key="option.id"
          type="button"
          :aria-pressed="board.prefs.defaultHorizon === option.id"
          @click="setHorizon(option.id)"
        >
          {{ option.label }}
        </button>
      </div>
      <p class="meta">{{ horizons.find((item) => item.id === board.prefs.defaultHorizon)?.note }}</p>
    </article>

    <article class="settings-block">
      <header>
        <h3>Tags</h3>
        <p>Catalog used on the home filters and project pages. Rename or remove updates every project that uses the tag.</p>
      </header>
      <form class="composer adder" @submit.prevent="addTag">
        <input v-model="tagDraft" aria-label="New tag" placeholder="New tag" />
        <button class="solid" type="submit">Add tag</button>
      </form>
      <ul v-if="catalog.length" class="tag-admin">
        <li v-for="tag in catalog" :key="tag">
          <form v-if="editFrom === tag" class="tag-rename" @submit.prevent="commitRename">
            <input v-model="editTo" :aria-label="`Rename ${tag}`" />
            <button class="solid" type="submit">Save</button>
            <button class="texty" type="button" @click="cancelRename">Cancel</button>
          </form>
          <template v-else>
            <div class="who">
              <strong>{{ tag }}</strong>
              <p class="meta">{{ usage(tag) }} project{{ usage(tag) === 1 ? '' : 's' }}</p>
            </div>
            <div class="actions">
              <button class="texty" type="button" @click="startRename(tag)">Rename</button>
              <button class="texty" type="button" @click="removeTag(tag)">Remove</button>
            </div>
          </template>
        </li>
      </ul>
      <p v-else class="empty">No tags yet. Add one above.</p>
    </article>

    <article class="settings-block">
      <header>
        <h3>Assign tags</h3>
        <p>Toggle which projects carry each tag.</p>
      </header>
      <div v-if="catalog.length" class="assign-list">
        <article v-for="project in projects" :key="project.id" class="row assign-row">
          <div class="who">
            <strong>{{ project.name }}</strong>
            <p class="meta">{{ project.status === 'shelved' ? 'Shelved' : 'Open' }}</p>
          </div>
          <div class="mode" role="group" :aria-label="`Tags for ${project.name}`">
            <button
              v-for="tag in catalog"
              :key="tag"
              type="button"
              :aria-pressed="hasTag(project, tag)"
              @click="toggleProjectTag(project, tag)"
            >
              {{ tag }}
            </button>
          </div>
        </article>
      </div>
      <p v-else class="empty">Add a tag before assigning.</p>
    </article>
  </section>
</template>
