<template>
  <ChartsChartCard title="Структура негатива">
    <div v-if="data.length === 0" class="flex items-center justify-center h-48 text-sm text-text-secondary">
      Нет данных о негативных отзывах
    </div>
    <ClientOnly v-else>
      <apexchart
        type="donut"
        height="280"
        :options="chartOptions"
        :series="series"
      />
    </ClientOnly>
  </ChartsChartCard>
</template>

<script setup lang="ts">
const props = defineProps<{
  data: { name: string; value: number; color: string }[]
}>()

const series = computed(() => props.data.map(d => d.value))

const chartOptions = computed(() => ({
  labels: props.data.map(d => d.name),
  colors: props.data.map(d => d.color),
  chart: {
    type: 'donut' as const,
    background: 'transparent',
    fontFamily: 'inherit'
  },
  stroke: {
    width: 2,
    colors: ['var(--bg-card)']
  },
  dataLabels: {
    enabled: true,
    style: { fontSize: '12px', fontWeight: 600 },
    dropShadow: { enabled: false }
  },
  legend: {
    position: 'bottom' as const,
    labels: { colors: 'var(--text-secondary)' },
    fontSize: '12px',
    markers: { size: 6, offsetX: -3 }
  },
  plotOptions: {
    pie: {
      donut: {
        size: '55%',
        labels: {
          show: true,
          name: { color: 'var(--text)' },
          value: {
            color: 'var(--text)',
            fontSize: '20px',
            fontWeight: 700
          },
          total: {
            show: true,
            label: 'Всего',
            color: 'var(--text-secondary)',
            formatter: (w: any) => w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0).toString()
          }
        }
      }
    }
  },
  tooltip: {
    theme: 'dark',
    y: {
      formatter: (val: number) => `${val} отзывов`
    }
  }
}))
</script>
