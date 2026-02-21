<template>
  <div>
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-2xl md:text-3xl font-bold text-text mb-2">Статистика</h1>
      <p class="text-text-secondary">Статистика работы ресторана</p>
    </div>

    <!-- Placeholder Content -->
    <div class="bg-bg-card rounded-lg border border-border p-12 text-center">
      <div class="w-16 h-16 bg-bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <h3 class="text-lg font-medium text-text mb-2">Раздел в разработке</h3>
      <p class="text-text-secondary mb-6">
        Здесь будет отображаться статистика работы вашего ресторана:<br>
        рабочее время, выполненные задачи, показатели эффективности
      </p>
      <div class="inline-flex items-center gap-2 text-sm text-text-secondary">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Функционал появится в следующих версиях</span>
      </div>
    </div>

    <!-- Future Features Preview -->
    <div class="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="bg-bg-card rounded-lg border border-border p-6">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-10 h-10 bg-status-blue-bg rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-status-blue-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h4 class="font-semibold text-text">Рабочее время</h4>
        </div>
        <p class="text-sm text-text-secondary">Учёт рабочих часов и смен сотрудников</p>
      </div>

      <div class="bg-bg-card rounded-lg border border-border p-6">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-10 h-10 bg-status-green-bg rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-status-green-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h4 class="font-semibold text-text">Выполненные задачи</h4>
        </div>
        <p class="text-sm text-text-secondary">Статистика по выполненным заданиям и поручениям</p>
      </div>

      <div class="bg-bg-card rounded-lg border border-border p-6">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-10 h-10 bg-status-purple-bg rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-status-purple-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h4 class="font-semibold text-text">Эффективность</h4>
        </div>
        <p class="text-sm text-text-secondary">Показатели производительности и KPI</p>
      </div>

      <div class="bg-bg-card rounded-lg border border-border p-6">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h4 class="font-semibold text-text">График работы</h4>
        </div>
        <p class="text-sm text-text-secondary">Расписание смен и планирование</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default'
})
</script>
