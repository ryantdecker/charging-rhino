<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'

const props = defineProps<{
  loggingIn: boolean
  error: string
}>()

const emit = defineEmits<{
  submit: [password: string]
}>()

const showForm = ref(false)
const password = ref('')
const passwordInput = ref<HTMLInputElement | null>(null)

watch(showForm, async (open) => {
  if (!open) return
  await nextTick()
  passwordInput.value?.focus()
})

function openForm() {
  showForm.value = true
}

function onSubmit() {
  emit('submit', password.value)
}
</script>

<template>
  <div class="splash" :class="{ 'splash-open': showForm }">
    <img class="splash-art" src="/splash.jpg" alt="" width="1920" height="1080" />

    <header class="splash-brand">
      <img src="/mark-head.png" alt="" class="splash-mark" />
      <p class="splash-wordmark" aria-label="Charging Rhino">
        <span>Charging</span>
        <span>Rhino</span>
      </p>
    </header>

    <button
      class="splash-hotspot"
      type="button"
      aria-label="Open sign in"
      :aria-expanded="showForm"
      @click="openForm"
    ></button>

    <p v-if="!showForm" class="splash-hint">Tap the rhino to begin</p>

    <section
      v-if="showForm"
      class="splash-panel"
      aria-labelledby="splash-login-title"
    >
      <p class="splash-kicker">Welcome back</p>
      <h1 id="splash-login-title" class="splash-title">Sign in</h1>
      <p class="splash-lede">Shared password for you and agents.</p>
      <form class="splash-form" @submit.prevent="onSubmit">
        <label class="splash-field">
          <span class="visually-hidden">Password</span>
          <input
            ref="passwordInput"
            v-model="password"
            type="password"
            autocomplete="current-password"
            placeholder="Password"
            required
          />
        </label>
        <button class="splash-submit" type="submit" :disabled="props.loggingIn || !password.trim()">
          {{ props.loggingIn ? 'Signing in…' : 'Enter' }}
        </button>
      </form>
      <p v-if="props.error" class="splash-error" role="alert">{{ props.error }}</p>
    </section>
  </div>
</template>
