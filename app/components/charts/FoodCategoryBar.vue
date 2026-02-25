<template>
  <ChartsChartCard title="Негатив по подкатегориям еды">
    <div v-if="data.length === 0" class="flex items-center justify-center h-48 text-sm text-text-secondary">
      Нет данных о проблемах с едой
    </div>
    <ClientOnly v-else>
      <apexchart
        type="bar"
        height="280"
        :options="chartOptions"
        :series="series"
      />
    </ClientOnly>
  </ChartsChartCard>
</template>

<script setup lang="ts">
const props = defineProps<{
  data: { category: string; count: number }[]
}>()

const series = computed(() => [{
  name: 'Кол-во',
  data: props.data.map(d => d.count)
}])

const chartOptions = computed(() => ({
  chart: {
    type: 'bar' as const,
    background: 'transparent',
    fontFamily: 'inherit',
    toolbar: { show: false }
  },
  plotOptions: {
    bar: {
      horizontal: true,
      barHeight: '60%',
      borderRadius: 4,
      distributed: true
    }
  },
  colors: ['#ef4444', '#f97316', '#eab308', '#f59e0b', '#d97706'],
  dataLabels: {
    enabled: true,
    style: { fontSize: '12px', colors: ['#fff'] },
    offsetX: -4
  },
  xaxis: {
    categories: props.data.map(d => d.category),
    labels: { style: { colors: 'var(--text-secondary)', fontSize: '12px' } },
    axisBorder: { show: false },
    axisTicks: { show: false }
  },
  yaxis: {
    labels: { style: { colors: 'var(--text-secondary)', fontSize: '12px' } }
  },
  grid: {
    borderColor: 'var(--border)',
    strokeDashArray: 4,
    xaxis: { lines: { show: true } },
    yaxis: { lines: { show: false } }
  },
  legend: { show: false },
  tooltip: {
    theme: 'dark',
    y: { formatter: (val: number) => `${val} упоминаний` }
  }
}))
</script>
