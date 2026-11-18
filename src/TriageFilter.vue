<script setup lang="ts">
import type { TriageFilter } from './triage'

defineProps<{
  modelValue: TriageFilter
  counts: { all: number; quick: number; agent: number }
}>()
const emit = defineEmits<{ 'update:modelValue': [value: TriageFilter] }>()

const options: { id: TriageFilter; label: string; hint: string }[] = [
  { id: 'all', label: 'All', hint: 'Every open task' },
  { id: 'quick', label: 'Quick', hint: 'About 20 minutes or less' },
  { id: 'agent', label: 'Agent', hint: 'Ready to hand to an agent' },
]
</script>

<template>
  <div class="lane-switch triage-filter" role="group" aria-label="Task type">
    <button
      v-for="option in options"
      :key="option.id"
      type="button"
      :title="option.hint"
      :aria-pressed="modelValue === option.id"
      @click="emit('update:modelValue', option.id)"
    >
      {{ option.label }} {{ counts[option.id] }}
    </button>
  </div>
</template>
