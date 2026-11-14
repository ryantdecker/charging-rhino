<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import {
  activeDayPart,
  currentDayPart,
  dayPartLabel,
  dayPartOverride,
  dayParts,
  type DayPart,
  watchDayPart,
} from './dayPart'

const open = ref(false)
const root = ref<HTMLElement | null>(null)

onMounted(() => watchDayPart())

function toggleMenu() {
  open.value = !open.value
}

function choose(part: DayPart | null) {
  dayPartOverride.value = part
  open.value = false
}

function onDocClick(event: MouseEvent) {
  if (!open.value || !root.value) return
  if (!root.value.contains(event.target as Node)) open.value = false
}

onMounted(() => document.addEventListener('click', onDocClick))
onUnmounted(() => document.removeEventListener('click', onDocClick))
</script>

<template>
  <div ref="root" class="day-fab" :class="{ open }">
    <div v-if="open" class="day-fab-menu" role="menu" aria-label="Preview time of day">
      <button
        type="button"
        role="menuitemradio"
        :aria-checked="dayPartOverride === null"
        @click="choose(null)"
      >
        Auto
        <small>{{ dayPartLabel[currentDayPart] }}</small>
      </button>
      <button
        v-for="part in dayParts"
        :key="part"
        type="button"
        role="menuitemradio"
        :aria-checked="dayPartOverride === part"
        @click="choose(part)"
      >
        {{ dayPartLabel[part] }}
      </button>
    </div>
    <button
      class="day-fab-btn"
      type="button"
      :aria-expanded="open"
      :aria-label="dayPartOverride ? `Preview ${dayPartLabel[activeDayPart]}` : 'Preview time of day'"
      :title="dayPartOverride ? `Preview: ${dayPartLabel[activeDayPart]}` : 'Preview time of day'"
      @click.stop="toggleMenu"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
      <span v-if="dayPartOverride" class="day-fab-dot"></span>
    </button>
  </div>
</template>
