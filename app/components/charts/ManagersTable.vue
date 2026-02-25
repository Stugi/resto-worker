<template>
  <ChartsChartCard title="Рейтинг менеджеров">
    <div v-if="data.length === 0" class="flex items-center justify-center h-32 text-sm text-text-secondary">
      Нет данных о менеджерах
    </div>
    <div v-else class="overflow-x-auto -mx-5 -mb-5">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-border">
            <th class="text-left font-medium text-text-secondary px-5 py-2.5">#</th>
            <th class="text-left font-medium text-text-secondary px-5 py-2.5">Менеджер</th>
            <th class="text-right font-medium text-text-secondary px-5 py-2.5">Отзывов</th>
            <th class="text-right font-medium text-text-secondary px-5 py-2.5 hidden sm:table-cell">Доля</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(m, idx) in data"
            :key="m.login"
            class="border-b border-border last:border-0 hover:bg-bg-secondary/50 transition-colors"
          >
            <td class="px-5 py-3 text-text-secondary font-mono text-xs">{{ idx + 1 }}</td>
            <td class="px-5 py-3">
              <div class="font-medium text-text">{{ m.name || m.login }}</div>
              <div v-if="m.name" class="text-xs text-text-secondary">{{ m.login }}</div>
            </td>
            <td class="px-5 py-3 text-right font-semibold text-text">{{ m.reviewsCount }}</td>
            <td class="px-5 py-3 text-right hidden sm:table-cell">
              <div class="flex items-center justify-end gap-2">
                <div class="w-16 h-1.5 bg-bg-secondary rounded-full overflow-hidden">
                  <div
                    class="h-full bg-accent rounded-full"
                    :style="{ width: `${getPercent(m.reviewsCount)}%` }"
                  />
                </div>
                <span class="text-xs text-text-secondary w-8 text-right">{{ getPercent(m.reviewsCount) }}%</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </ChartsChartCard>
</template>

<script setup lang="ts">
const props = defineProps<{
  data: { login: string; name: string | null; reviewsCount: number }[]
}>()

const totalReviews = computed(() =>
  props.data.reduce((sum, m) => sum + m.reviewsCount, 0)
)

const getPercent = (count: number) => {
  if (totalReviews.value === 0) return 0
  return Math.round((count / totalReviews.value) * 100)
}
</script>
