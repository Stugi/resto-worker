<template>
  <div class="flex items-center gap-1">
    <!-- Солнце (светлая тема) -->
    <button
      @click="setTheme('light')"
      class="w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-200"
      :class="!isDark ? 'bg-bg-hover text-text' : 'text-muted hover:text-text-secondary'"
      title="Светлая тема"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41" />
      </svg>
    </button>
    <!-- Луна (тёмная тема) -->
    <button
      @click="setTheme('dark')"
      class="w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-200"
      :class="isDark ? 'bg-bg-hover text-text' : 'text-muted hover:text-text-secondary'"
      title="Тёмная тема"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
const { isDark, setTheme } = useTheme()
</script>
