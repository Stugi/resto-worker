<template>
  <ChartsChartCard title="Тепловая карта активности">
    <div v-if="isEmpty" class="flex items-center justify-center h-32 text-sm text-text-secondary">
      Нет данных для тепловой карты
    </div>
    <div v-else class="overflow-x-auto">
      <!-- Заголовки часов -->
      <div class="flex items-center mb-1">
        <div class="w-10 shrink-0" />
        <div class="flex-1 grid grid-cols-24 gap-px">
          <div
            v-for="h in visibleHours"
            :key="h"
            class="text-center text-[9px] text-text-secondary leading-none"
          >
            {{ h % 3 === 0 ? h : '' }}
          </div>
        </div>
      </div>

      <!-- Строки дней -->
      <div class="space-y-px">
        <div
          v-for="row in data"
          :key="row.day"
          class="flex items-center"
        >
          <div class="w-10 shrink-0 text-xs text-text-secondary font-medium pr-2 text-right">
            {{ row.day }}
          </div>
          <div class="flex-1 grid grid-cols-24 gap-px">
            <div
              v-for="(count, hour) in row.hours"
              :key="hour"
              class="aspect-square rounded-[2px] transition-colors cursor-default"
              :style="{ backgroundColor: getColor(count) }"
              :title="`${row.day} ${hour}:00 — ${count} отзывов`"
            />
          </div>
        </div>
      </div>

      <!-- Легенда -->
      <div class="flex items-center justify-end gap-1.5 mt-3">
        <span class="text-[10px] text-text-secondary">Мало</span>
        <div
          v-for="(color, idx) in legendColors"
          :key="idx"
          class="w-3 h-3 rounded-[2px]"
          :style="{ backgroundColor: color }"
        />
        <span class="text-[10px] text-text-secondary">Много</span>
      </div>
    </div>
  </ChartsChartCard>
</template>

<script setup lang="ts">
const props = defineProps<{
  data: { day: string; hours: number[] }[]
}>()

const visibleHours = Array.from({ length: 24 }, (_, i) => i)

const maxCount = computed(() => {
  let max = 0
  for (const row of props.data) {
    for (const count of row.hours) {
      if (count > max) max = count
    }
  }
  return max || 1
})

const isEmpty = computed(() => maxCount.value <= 0 ||
  props.data.every(row => row.hours.every(h => h === 0))
)

const legendColors = [
  'var(--bg-secondary)',
  'rgba(59, 130, 246, 0.2)',
  'rgba(59, 130, 246, 0.4)',
  'rgba(59, 130, 246, 0.6)',
  'rgba(59, 130, 246, 0.85)'
]

const getColor = (count: number) => {
  if (count === 0) return 'var(--bg-secondary)'
  const ratio = count / maxCount.value
  if (ratio <= 0.25) return 'rgba(59, 130, 246, 0.2)'
  if (ratio <= 0.5) return 'rgba(59, 130, 246, 0.4)'
  if (ratio <= 0.75) return 'rgba(59, 130, 246, 0.6)'
  return 'rgba(59, 130, 246, 0.85)'
}
</script>

<style scoped>
.grid-cols-24 {
  grid-template-columns: repeat(24, minmax(0, 1fr));
}
</style>
