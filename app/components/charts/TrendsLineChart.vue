<template>
  <ChartsChartCard title="Динамика по неделям">
    <div v-if="data.length === 0" class="flex items-center justify-center h-48 text-sm text-text-secondary">
      Нет данных за выбранный период
    </div>
    <ClientOnly v-else>
      <apexchart
        type="line"
        height="300"
        :options="chartOptions"
        :series="series"
      />
    </ClientOnly>
  </ChartsChartCard>
</template>

<script setup lang="ts">
const props = defineProps<{
  data: { week: string; total: number; negative: number; critical: number }[]
}>()

const series = computed(() => [
  { name: 'Всего', data: props.data.map(d => d.total) },
  { name: 'Негатив', data: props.data.map(d => d.negative) },
  { name: 'Критичные', data: props.data.map(d => d.critical) }
])

const chartOptions = computed(() => ({
  chart: {
    type: 'line' as const,
    background: 'transparent',
    fontFamily: 'inherit',
    toolbar: { show: false },
    zoom: { enabled: false }
  },
  colors: ['#3b82f6', '#f59e0b', '#ef4444'],
  stroke: {
    width: [3, 2, 2],
    curve: 'smooth' as const,
    dashArray: [0, 0, 5]
  },
  markers: {
    size: [4, 3, 3],
    strokeWidth: 0,
    hover: { size: 6 }
  },
  xaxis: {
    categories: props.data.map(d => d.week),
    labels: { style: { colors: 'var(--text-secondary)', fontSize: '11px' } },
    axisBorder: { show: false },
    axisTicks: { show: false }
  },
  yaxis: {
    labels: { style: { colors: 'var(--text-secondary)', fontSize: '11px' } },
    min: 0
  },
  grid: {
    borderColor: 'var(--border)',
    strokeDashArray: 4
  },
  legend: {
    position: 'top' as const,
    horizontalAlign: 'right' as const,
    labels: { colors: 'var(--text-secondary)' },
    fontSize: '12px',
    markers: { size: 6, offsetX: -3 }
  },
  tooltip: {
    theme: 'dark',
    shared: true,
    intersect: false
  }
}))
</script>
