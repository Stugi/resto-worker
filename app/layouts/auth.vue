<template>
  <div class="h-dvh bg-bg-secondary flex items-center justify-center p-4 overflow-y-auto" style="height: 100dvh; display: flex; align-items: center; justify-content: center;">
    <div class="w-full max-w-md mx-auto">
      <!-- Logo and Title -->
      <div class="flex flex-col items-center mb-8">
        <div class="w-16 h-16 bg-gradient-to-br from-accent to-accent-end rounded-2xl flex items-center justify-center ring-1 ring-accent/20 mb-4" style="box-shadow: 0 0 20px rgba(245,166,35,0.35), 0 4px 8px rgba(245,166,35,0.25);">
          <span class="text-4xl">🍽️</span>
        </div>
        <h1 class="text-3xl md:text-4xl font-semibold tracking-tight text-text mb-2">
          Cosmic<span class="bg-gradient-to-r from-accent to-accent-end bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(245,166,35,0.6)]">Mind</span> <span class="text-text-secondary font-normal text-2xl md:text-3xl">AI</span>
        </h1>
        <p class="text-text-secondary">
          Restaurant Management System
        </p>
      </div>

      <div class="bg-bg-card border border-border rounded-lg p-8 shadow-sm">
        <slot />
      </div>

      <p class="text-center text-text-secondary text-sm mt-6">
        &copy; {{ new Date().getFullYear() }} CosmicMind AI
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
