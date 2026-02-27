<template>
  <div>
    <!-- Header -->
    <div class="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl md:text-3xl font-bold text-text mb-1">Аналитика</h1>
        <p class="text-text-secondary text-sm">Классификация отзывов и тренды</p>
      </div>
      <div class="flex items-center gap-3 flex-wrap">
        <!-- Фильтр по ресторану -->
        <BaseSelect
          v-if="restaurants.length > 1"
          v-model="restaurantId"
          :options="restaurantOptions"
          placeholder="Все рестораны"
          :searchable="false"
        />
        <ChartsPeriodFilter v-model="period" />
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-16">
      <BaseSpinner />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="bg-status-red-bg border border-status-red-border rounded-lg p-5 text-center">
      <p class="text-sm text-status-red-text">{{ error }}</p>
      <button class="text-sm text-accent hover:underline mt-2" @click="fetchData">
        Попробовать снова
      </button>
    </div>

    <template v-else-if="data">
      <!-- KPI Cards -->
      <ChartsKPICards
        :kpi="data.kpi"
        :total-classified="data.totalClassified"
        :total-unclassified="data.totalUnclassified"
        class="mb-6"
      />

      <!-- Row: Pie + Bar -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <ChartsNegativeStructurePie :data="data.negativeStructure" />
        <ChartsFoodCategoryBar :data="data.foodCategories" />
      </div>

      <!-- Trends — full width -->
      <div class="mb-4">
        <ChartsTrendsLineChart :data="data.trends" />
      </div>

      <!-- Row: Managers + Dishes -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <ChartsManagersTable :data="data.managers" />
        <ChartsDishesTable :data="data.dishes" />
      </div>

      <!-- Heatmap — full width -->
      <div class="mb-4">
        <ChartsHeatMapGrid :data="data.heatmap" />
      </div>

      <!-- Notice: unclassified -->
      <div
        v-if="data.totalUnclassified > 0"
        class="bg-status-orange-bg border border-status-orange-border rounded-lg px-5 py-3 flex items-center gap-3"
      >
        <svg class="w-5 h-5 text-status-orange-icon shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p class="text-sm text-text">
          <strong>{{ data.totalUnclassified }}</strong> транскрипций ещё не классифицированы.
          Они будут классифицированы при следующем автоматическом формировании отчёта.
        </p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { AnalyticsPeriod, AnalyticsResponse } from '~/server/types/analytics'

definePageMeta({
  layout: 'default'
})

const period = ref<AnalyticsPeriod>('month')
const restaurantId = ref('')
const loading = ref(true)
const error = ref<string | null>(null)
const data = ref<AnalyticsResponse | null>(null)
const restaurants = ref<{ id: string; name: string }[]>([])

const restaurantOptions = computed(() =>
  restaurants.value.map(r => ({ value: r.id, label: r.name }))
)

const fetchData = async () => {
  loading.value = true
  error.value = null
  try {
    const params: Record<string, string> = { period: period.value }
    if (restaurantId.value) {
      params.restaurantId = restaurantId.value
    }
    data.value = await $fetch<AnalyticsResponse>('/api/dashboard/analytics', { params })
    // Обновляем список ресторанов из первого ответа
    if (data.value.restaurants && data.value.restaurants.length > 0) {
      restaurants.value = data.value.restaurants
    }
  } catch (err: any) {
    console.error('Analytics fetch error:', err)
    error.value = err?.data?.message || 'Не удалось загрузить аналитику'
    data.value = null
  } finally {
    loading.value = false
  }
}

// Реактивная перезагрузка при смене периода или ресторана
watch([period, restaurantId], () => {
  fetchData()
})

onMounted(() => {
  fetchData()
})
</script>
