<template>
  <ChartsChartCard title="Блюда-лидеры по негативу">
    <div v-if="data.length === 0" class="flex items-center justify-center h-32 text-sm text-text-secondary">
      Нет данных о проблемных блюдах
    </div>
    <div v-else class="overflow-x-auto -mx-5 -mb-5">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-border">
            <th class="text-left font-medium text-text-secondary px-5 py-2.5">#</th>
            <th class="text-left font-medium text-text-secondary px-5 py-2.5">Блюдо</th>
            <th class="text-right font-medium text-text-secondary px-5 py-2.5">Упоминаний</th>
            <th class="text-left font-medium text-text-secondary px-5 py-2.5 hidden sm:table-cell">Проблема</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(d, idx) in data"
            :key="d.name"
            class="border-b border-border last:border-0 hover:bg-bg-secondary/50 transition-colors"
          >
            <td class="px-5 py-3 text-text-secondary font-mono text-xs">{{ idx + 1 }}</td>
            <td class="px-5 py-3 font-medium text-text">{{ d.name }}</td>
            <td class="px-5 py-3 text-right">
              <span
                class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
                :class="d.mentions >= 5 ? 'bg-status-red-bg text-status-red-text' : d.mentions >= 3 ? 'bg-status-orange-bg text-status-orange-icon' : 'bg-bg-secondary text-text-secondary'"
              >
                {{ d.mentions }}
              </span>
            </td>
            <td class="px-5 py-3 text-xs text-text-secondary hidden sm:table-cell max-w-48 truncate">
              {{ d.problemType || '—' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </ChartsChartCard>
</template>

<script setup lang="ts">
defineProps<{
  data: { name: string; mentions: number; problemType: string }[]
}>()
</script>
