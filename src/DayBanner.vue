<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { bannerSrc, currentDayPart, watchDayPart } from './dayPart'

onMounted(() => watchDayPart())

const src = computed(() => bannerSrc[currentDayPart.value])
</script>

<template>
  <div class="day-banner" :data-part="currentDayPart" aria-hidden="true">
    <img :src="src" :key="src" alt="" width="1024" height="220" />
  </div>
</template>
