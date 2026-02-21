<template>
  <div>
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-2xl md:text-3xl font-bold text-text mb-2">Аналитика</h1>
      <p class="text-text-secondary">Статистика и отчёты по организации</p>
    </div>

    <!-- Placeholder Content -->
    <div class="bg-bg-card rounded-lg border border-border p-12 text-center">
      <div class="w-16 h-16 bg-bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </div>
      <h3 class="text-lg font-medium text-text mb-2">Раздел в разработке</h3>
      <p class="text-text-secondary mb-6">
        Здесь будет отображаться аналитика и статистика по организации:<br>
        выручка, посещаемость, производительность сотрудников и другие метрики
      </p>
      <div class="inline-flex items-center gap-2 text-sm text-text-secondary">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Функционал появится в следующих версиях</span>
      </div>
    </div>

    <!-- Future Features Preview -->
    <div class="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div class="bg-bg-card rounded-lg border border-border p-6">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-10 h-10 bg-status-blue-bg rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-status-blue-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h4 class="font-semibold text-text">Выручка</h4>
        </div>
        <p class="text-sm text-text-secondary">Общая выручка по ресторанам и динамика продаж</p>
      </div>

      <div class="bg-bg-card rounded-lg border border-border p-6">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-10 h-10 bg-status-green-bg rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-status-green-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h4 class="font-semibold text-text">Сотрудники</h4>
        </div>
        <p class="text-sm text-text-secondary">Производительность и рабочее время персонала</p>
      </div>

      <div class="bg-bg-card rounded-lg border border-border p-6">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-10 h-10 bg-status-purple-bg rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-status-purple-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
          </div>
          <h4 class="font-semibold text-text">Тренды</h4>
        </div>
        <p class="text-sm text-text-secondary">Анализ трендов и прогнозирование</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default'
})
</script>
