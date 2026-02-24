<template>
  <div>
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-2xl md:text-3xl font-bold text-text mb-1">Главная</h1>
      <p class="text-text-secondary text-sm">Сводка по организации</p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <BaseSpinner />
    </div>

    <template v-else-if="stats">
      <!-- Stat Cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        <!-- Транскрипции сегодня -->
        <div class="bg-bg-card rounded-xl border border-border p-4">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-8 h-8 bg-status-blue-bg rounded-lg flex items-center justify-center">
              <svg class="w-4 h-4 text-status-blue-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <span class="text-xs text-text-secondary">Сегодня</span>
          </div>
          <div class="text-2xl font-bold text-text">{{ stats.transcriptsToday }}</div>
          <div class="text-xs text-text-secondary mt-0.5">
            {{ formatDuration(stats.todayDurationSec) }}
          </div>
        </div>

        <!-- Отчёты за неделю -->
        <div class="bg-bg-card rounded-xl border border-border p-4">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-8 h-8 bg-status-purple-bg rounded-lg flex items-center justify-center">
              <svg class="w-4 h-4 text-status-purple-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span class="text-xs text-text-secondary">Отчёты</span>
          </div>
          <div class="text-2xl font-bold text-text">{{ stats.reportsWeek }}</div>
          <div class="text-xs text-text-secondary mt-0.5">за 7 дней</div>
        </div>

        <!-- Рестораны -->
        <div class="bg-bg-card rounded-xl border border-border p-4">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-8 h-8 bg-status-green-bg rounded-lg flex items-center justify-center">
              <svg class="w-4 h-4 text-status-green-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <span class="text-xs text-text-secondary">Рестораны</span>
          </div>
          <div class="text-2xl font-bold text-text">{{ stats.restaurants.length }}</div>
          <div class="text-xs text-text-secondary mt-0.5">
            {{ stats.restaurants.filter((r: any) => r.hasGroup).length }} с группой
          </div>
        </div>

        <!-- Последний отчёт -->
        <div class="bg-bg-card rounded-xl border border-border p-4">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-8 h-8 bg-status-orange-bg rounded-lg flex items-center justify-center">
              <svg class="w-4 h-4 text-status-orange-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span class="text-xs text-text-secondary">Посл. отчёт</span>
          </div>
          <template v-if="stats.lastReport">
            <NuxtLink
              :to="`/reports/${stats.lastReport.id}`"
              class="text-sm font-medium text-accent hover:underline line-clamp-1"
            >
              {{ stats.lastReport.restaurant?.name || 'Отчёт' }}
            </NuxtLink>
            <div class="text-xs text-text-secondary mt-0.5">
              {{ formatDateShort(stats.lastReport.createdAt) }}
            </div>
          </template>
          <div v-else class="text-sm text-text-secondary">нет</div>
        </div>
      </div>

      <!-- Week Activity -->
      <div class="bg-bg-card rounded-xl border border-border p-5 mb-6">
        <h3 class="text-sm font-semibold text-text mb-4">Транскрипции за неделю</h3>
        <div class="flex items-end gap-2 h-28">
          <div
            v-for="day in stats.weekActivity"
            :key="day.date"
            class="flex-1 flex flex-col items-center gap-1"
          >
            <span class="text-xs text-text-secondary font-medium">{{ day.count }}</span>
            <div
              class="w-full rounded-t-md transition-all"
              :class="day.count > 0 ? 'bg-accent/80' : 'bg-bg-secondary'"
              :style="{ height: barHeight(day.count) }"
            />
            <span class="text-[10px] text-text-secondary">{{ day.day }}</span>
          </div>
        </div>
      </div>

      <!-- Restaurants List -->
      <div class="bg-bg-card rounded-xl border border-border">
        <div class="px-5 py-4 border-b border-border">
          <h3 class="text-sm font-semibold text-text">Рестораны</h3>
        </div>
        <div class="divide-y divide-border">
          <div
            v-for="r in stats.restaurants"
            :key="r.id"
            class="px-5 py-3 flex items-center justify-between gap-3"
          >
            <div class="min-w-0">
              <NuxtLink
                :to="`/restaurants`"
                class="text-sm font-medium text-text hover:text-accent transition-colors truncate block"
              >
                {{ r.name }}
              </NuxtLink>
              <div class="flex items-center gap-2 mt-0.5">
                <span
                  :class="r.hasGroup ? 'text-status-green-icon' : 'text-muted'"
                  class="text-xs"
                >
                  {{ r.hasGroup ? '● Группа' : '○ Нет группы' }}
                </span>
                <span
                  v-if="r.hasSchedule"
                  class="text-xs text-status-blue-icon"
                >
                  ● Авто-отчёт
                </span>
              </div>
            </div>
            <div class="text-right shrink-0">
              <div class="text-lg font-bold text-text">{{ r.transcriptsToday }}</div>
              <div class="text-[10px] text-text-secondary">сегодня</div>
            </div>
          </div>
          <div v-if="stats.restaurants.length === 0" class="px-5 py-8 text-center text-sm text-text-secondary">
            Нет ресторанов
          </div>
        </div>
      </div>
    </template>

    <!-- Error -->
    <div v-else class="bg-status-red-bg border border-status-red-border rounded-lg p-5 text-center">
      <p class="text-sm text-status-red-text">Не удалось загрузить данные</p>
      <button @click="fetchStats" class="text-sm text-accent hover:underline mt-2">Попробовать снова</button>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default'
})

const loading = ref(true)
const stats = ref<any>(null)

const fetchStats = async () => {
  loading.value = true
  try {
    stats.value = await $fetch('/api/dashboard/stats')
  } catch (err) {
    console.error('Dashboard fetch error:', err)
    stats.value = null
  } finally {
    loading.value = false
  }
}

const formatDuration = (sec: number) => {
  if (!sec) return '0 мин'
  const m = Math.floor(sec / 60)
  if (m < 1) return `${sec} сек`
  const h = Math.floor(m / 60)
  if (h < 1) return `${m} мин`
  return `${h}ч ${m % 60}м`
}

const formatDateShort = (date: string) => {
  return new Date(date).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const barHeight = (count: number) => {
  if (!stats.value?.weekActivity) return '4px'
  const max = Math.max(...stats.value.weekActivity.map((d: any) => d.count), 1)
  const pct = (count / max) * 100
  return `${Math.max(pct, 4)}%`
}

onMounted(() => {
  fetchStats()
})
</script>
