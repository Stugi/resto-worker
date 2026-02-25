<template>
  <div class="flex items-center gap-2">
    <div class="flex rounded-lg border border-border bg-bg-card overflow-hidden">
      <button
        v-for="option in periods"
        :key="option.value"
        class="px-3 py-1.5 text-xs font-medium transition-colors"
        :class="modelValue === option.value
          ? 'bg-accent text-white'
          : 'text-text-secondary hover:text-text hover:bg-bg-secondary'"
        @click="emit('update:modelValue', option.value)"
      >
        {{ option.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AnalyticsPeriod } from '~/server/types/analytics'

defineProps<{
  modelValue: AnalyticsPeriod
}>()

const emit = defineEmits<{
  'update:modelValue': [value: AnalyticsPeriod]
}>()

const periods: { value: AnalyticsPeriod; label: string }[] = [
  { value: 'today', label: 'Сегодня' },
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
  { value: 'quarter', label: 'Квартал' },
  { value: 'year', label: 'Год' }
]
</script>
