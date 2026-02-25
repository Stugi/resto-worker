<template>
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
    <!-- Всего отзывов -->
    <div class="bg-bg-card rounded-xl border border-border p-4">
      <div class="flex items-center gap-2 mb-2">
        <div class="w-8 h-8 bg-status-blue-bg rounded-lg flex items-center justify-center">
          <svg class="w-4 h-4 text-status-blue-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </div>
        <span class="text-xs text-text-secondary">Отзывов</span>
      </div>
      <div class="text-2xl font-bold text-text">{{ kpi.totalReviews }}</div>
      <div class="flex items-center gap-1 mt-0.5">
        <span
          :class="kpi.trendPercent >= 0 ? 'text-status-green-icon' : 'text-status-red-text'"
          class="text-xs font-medium"
        >
          {{ kpi.trendPercent >= 0 ? '+' : '' }}{{ kpi.trendPercent }}%
        </span>
        <span class="text-xs text-text-secondary">vs пред. период</span>
      </div>
    </div>

    <!-- Среднее на сотрудника -->
    <div class="bg-bg-card rounded-xl border border-border p-4">
      <div class="flex items-center gap-2 mb-2">
        <div class="w-8 h-8 bg-status-purple-bg rounded-lg flex items-center justify-center">
          <svg class="w-4 h-4 text-status-purple-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <span class="text-xs text-text-secondary">На сотрудника</span>
      </div>
      <div class="text-2xl font-bold text-text">{{ kpi.avgPerEmployee }}</div>
      <div class="text-xs text-text-secondary mt-0.5">в среднем</div>
    </div>

    <!-- Санитарные инциденты -->
    <div class="bg-bg-card rounded-xl border border-border p-4">
      <div class="flex items-center gap-2 mb-2">
        <div class="w-8 h-8 bg-status-red-bg rounded-lg flex items-center justify-center">
          <svg class="w-4 h-4 text-status-red-text" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <span class="text-xs text-text-secondary">Критичные</span>
      </div>
      <div class="text-2xl font-bold" :class="kpi.sanitaryIncidents > 0 ? 'text-status-red-text' : 'text-text'">
        {{ kpi.sanitaryIncidents }}
      </div>
      <div class="text-xs text-text-secondary mt-0.5">severity 4-5</div>
    </div>

    <!-- Процент негатива -->
    <div class="bg-bg-card rounded-xl border border-border p-4">
      <div class="flex items-center gap-2 mb-2">
        <div class="w-8 h-8 bg-status-orange-bg rounded-lg flex items-center justify-center">
          <svg class="w-4 h-4 text-status-orange-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
        </div>
        <span class="text-xs text-text-secondary">Классифиц.</span>
      </div>
      <div class="text-2xl font-bold text-text">{{ totalClassified }}</div>
      <div class="text-xs text-text-secondary mt-0.5">
        {{ totalUnclassified > 0 ? `+ ${totalUnclassified} без классиф.` : 'все обработаны' }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  kpi: {
    totalReviews: number
    trendPercent: number
    avgPerEmployee: number
    sanitaryIncidents: number
  }
  totalClassified: number
  totalUnclassified: number
}>()
</script>
