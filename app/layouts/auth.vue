<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <!-- Logo and Title -->
      <div class="flex flex-col items-center mb-8">
        <div class="w-16 h-16 bg-gradient-to-br from-action to-emerald-400 rounded-2xl flex items-center justify-center shadow-lg shadow-action/20 mb-4">
          <span class="text-4xl">🍽️</span>
        </div>
        <h1 class="text-3xl md:text-4xl font-semibold tracking-tight text-text mb-2">
          RESTO <span class="text-action">WORKER</span>
        </h1>
        <p class="text-text-secondary">
          Restaurant Management System
        </p>
      </div>

      <div class="bg-white border border-gray-200 rounded-lg p-8 shadow-sm">
        <slot />
      </div>

      <p class="text-center text-text-secondary text-sm mt-6">
        &copy; {{ new Date().getFullYear() }} RESTO WORKER
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
// Применяем CSS переменные
useHead({
  bodyAttrs: {
    class: 'font-sans antialiased'
  }
})
</script>
