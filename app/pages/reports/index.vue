<template>
  <div>
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl md:text-3xl font-bold text-text mb-2">
          Отчёты
        </h1>
        <p class="text-text-secondary">
          Аналитические отчёты по транскрипциям
        </p>
      </div>

      <BaseButton @click="openGenerateModal" variant="primary" size="md">
        Сгенерировать отчёт
      </BaseButton>
    </div>

    <!-- Фильтры -->
    <div class="flex flex-col md:flex-row gap-3 mb-6">
      <div class="w-full md:w-64">
        <BaseSelect
          v-model="selectedRestaurant"
          :options="[{ value: '', label: 'Все рестораны' }, ...restaurants.map(r => ({ value: r.id, label: r.name }))]"
          placeholder="Все рестораны"
        />
      </div>
      <div class="flex gap-3 flex-1">
        <input
          v-model="dateFrom"
          type="date"
          class="w-full md:w-44 px-4 py-2 border border-gray-300 rounded-lg text-sm text-text outline-none focus:border-action focus:ring-2 focus:ring-action/20 transition-colors"
          placeholder="От"
        />
        <input
          v-model="dateTo"
          type="date"
          class="w-full md:w-44 px-4 py-2 border border-gray-300 rounded-lg text-sm text-text outline-none focus:border-action focus:ring-2 focus:ring-action/20 transition-colors"
          placeholder="До"
        />
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-action"></div>
    </div>

    <!-- Reports List -->
    <div v-else-if="reports.length > 0" class="space-y-4">
      <div
        v-for="report in reports"
        :key="report.id"
        @click="openReport(report.id)"
        class="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1 min-w-0">
            <!-- Заголовок -->
            <div class="flex items-center gap-2 mb-2 flex-wrap">
              <h3 class="text-lg font-semibold text-text">
                {{ report.title }}
              </h3>
              <span
                :class="[
                  'px-2 py-0.5 rounded-full text-xs font-medium',
                  getStatusClass(report.status)
                ]"
              >
                {{ getStatusLabel(report.status) }}
              </span>
            </div>

            <!-- Мета -->
            <div class="flex items-center gap-3 text-sm text-text-secondary mb-2">
              <span v-if="report.restaurant">{{ report.restaurant.name }}</span>
              <span>{{ formatDate(report.createdAt) }}</span>
              <span v-if="report._count">{{ report._count.transcripts }} транскрипций</span>
            </div>

            <!-- Саммари -->
            <p v-if="report.summary" class="text-sm text-text-secondary line-clamp-2">
              {{ report.summary }}
            </p>
          </div>

          <!-- Стрелка -->
          <svg class="w-5 h-5 text-gray-400 shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>

      <!-- Пагинация -->
      <BasePagination
        :page="page"
        :page-size="pageSize"
        :total="total"
        @update:page="goToPage"
      />
    </div>

    <!-- Empty State -->
    <div v-else class="bg-white rounded-lg border border-gray-200 p-12 text-center">
      <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <h3 class="text-lg font-medium text-text mb-2">Нет отчётов</h3>
      <p class="text-text-secondary mb-4">
        {{ hasActiveFilters ? 'Нет отчётов по заданным фильтрам' : 'Сгенерируйте первый отчёт на основе транскрипций' }}
      </p>
      <BaseButton v-if="!hasActiveFilters" @click="openGenerateModal" variant="primary">
        Сгенерировать отчёт
      </BaseButton>
      <BaseButton v-else @click="resetFilters" variant="outline">
        Сбросить фильтры
      </BaseButton>
    </div>

    <!-- Generate Report Modal -->
    <ReportGenerateModal
      v-if="showGenerateModal"
      @close="showGenerateModal = false"
      @generated="handleGenerated"
    />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default'
})

interface ReportItem {
  id: string
  title: string
  summary: string | null
  status: string
  createdAt: string
  restaurant: { id: string; name: string } | null
  prompt: { id: string; name: string } | null
  _count: { transcripts: number }
}

const router = useRouter()
const loading = ref(true)
const reports = ref<ReportItem[]>([])
const restaurants = ref<{ id: string; name: string }[]>([])
const showGenerateModal = ref(false)

// Фильтры
const selectedRestaurant = ref('')
const dateFrom = ref('')
const dateTo = ref('')

// Пагинация
const page = ref(1)
const pageSize = 20
const total = ref(0)

const hasActiveFilters = computed(() =>
  selectedRestaurant.value !== '' || dateFrom.value !== '' || dateTo.value !== ''
)

const fetchReports = async () => {
  loading.value = true
  try {
    const params: Record<string, any> = { page: page.value, pageSize }
    if (selectedRestaurant.value) params.restaurantId = selectedRestaurant.value
    if (dateFrom.value) params.from = dateFrom.value
    if (dateTo.value) params.to = dateTo.value

    const data = await $fetch<{ items: ReportItem[]; total: number }>('/api/reports', { params })
    reports.value = data.items
    total.value = data.total
  } catch (error) {
    console.error('Error fetching reports:', error)
  } finally {
    loading.value = false
  }
}

const fetchRestaurants = async () => {
  try {
    const data = await $fetch('/api/restaurants')
    restaurants.value = (data as any[]).map(r => ({ id: r.id, name: r.name }))
  } catch (e) { /* ignore */ }
}

const goToPage = (newPage: number) => {
  page.value = newPage
  fetchReports()
}

const resetFilters = () => {
  selectedRestaurant.value = ''
  dateFrom.value = ''
  dateTo.value = ''
}

// При смене фильтров — сброс на 1 страницу + перезагрузка
watch([selectedRestaurant, dateFrom, dateTo], () => {
  page.value = 1
  fetchReports()
})

const openReport = (id: string) => {
  router.push(`/reports/${id}`)
}

const openGenerateModal = () => {
  showGenerateModal.value = true
}

const handleGenerated = (report: any) => {
  showGenerateModal.value = false
  if (report?.id) {
    router.push(`/reports/${report.id}`)
  } else {
    fetchReports()
  }
}

const getStatusClass = (status: string) => {
  switch (status) {
    case 'COMPLETED': return 'bg-green-50 text-green-700 border border-green-200'
    case 'GENERATING': return 'bg-blue-50 text-blue-700 border border-blue-200'
    case 'FAILED': return 'bg-red-50 text-red-700 border border-red-200'
    default: return 'bg-gray-100 text-gray-700'
  }
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'COMPLETED': return 'Готов'
    case 'GENERATING': return 'Генерация...'
    case 'FAILED': return 'Ошибка'
    default: return status
  }
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

onMounted(() => {
  fetchRestaurants()
  fetchReports()
})
</script>
