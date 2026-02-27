<template>
  <div class="h-dvh bg-bg-secondary flex items-center justify-center p-4 overflow-y-auto" style="height: 100dvh; display: flex; align-items: center; justify-content: center;">
    <div class="w-full max-w-md mx-auto">
      <!-- Logo and Title -->
      <div class="flex flex-col items-center mb-8">
        <div class="w-16 h-16 bg-gradient-to-br from-accent to-emerald-400 rounded-2xl flex items-center justify-center ring-1 ring-accent/20 mb-4" style="box-shadow: 0 0 20px rgba(0,220,127,0.35), 0 4px 8px rgba(0,220,127,0.25);">
          <span class="text-4xl">🍽️</span>
        </div>
        <h1 class="text-3xl md:text-4xl font-semibold tracking-tight text-text mb-2">
          RESTO <span class="bg-gradient-to-r from-accent to-emerald-400 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(0,220,127,0.6)]">WORKER</span>
        </h1>
        <p class="text-text-secondary">
          Restaurant Management System
        </p>
      </div>

      <div class="bg-bg-card border border-border rounded-lg p-8 shadow-sm">
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
