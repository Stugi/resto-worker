<template>
  <div class="bg-bg-card rounded-xl border border-border overflow-hidden">
    <div v-if="title" class="px-5 py-4 border-b border-border flex items-center justify-between">
      <h3 class="text-sm font-semibold text-text">{{ title }}</h3>
      <slot name="header-right" />
    </div>
    <div :class="['p-5', noPadding && '!p-0']">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title?: string
  noPadding?: boolean
}>()
</script>
