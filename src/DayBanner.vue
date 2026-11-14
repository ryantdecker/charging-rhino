<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { activeDayPart, bannerSrc, watchDayPart } from './dayPart'

onMounted(() => watchDayPart())

const src = computed(() => bannerSrc[activeDayPart.value])
</script>

<template>
  <div class="day-banner" :data-part="activeDayPart" aria-hidden="true">
    <img :src="src" :key="src" alt="" />
  </div>
</template>
