<template>
  <div
    :class="[
      'bg-bg-card rounded-lg border p-6 hover:shadow-md transition-shadow relative flex flex-col',
      tariff.isActive ? 'border-border' : 'border-status-red-border bg-status-red-bg'
    ]"
  >
    <!-- Бейджи -->
    <div class="flex items-center gap-2 mb-3 flex-wrap">
      <span
        v-if="!tariff.isActive"
        class="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-status-red-bg text-status-red-text border border-status-red-border"
      >
        Неактивен
      </span>
      <span
        v-if="tariff.price === 0"
        class="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-status-green-bg text-status-green-text border border-status-green-border"
      >
        Бесплатный
      </span>
    </div>

    <!-- Название и цена -->
    <h3 class="text-lg font-semibold text-text mb-1">
      {{ tariff.name }}
    </h3>
    <div class="flex items-baseline gap-1 mb-3">
      <span class="text-3xl font-bold text-text">
        {{ tariff.price === 0 ? '0' : tariff.price.toLocaleString('ru-RU') }}
      </span>
      <span class="text-text-secondary">
        {{ tariff.price === 0 ? '' : 'руб/' + tariff.period + ' дн.' }}
      </span>
    </div>

    <!-- Описание -->
    <p v-if="tariff.description" class="text-sm text-text-secondary mb-4 line-clamp-2">
      {{ tariff.description }}
    </p>

    <!-- Лимиты -->
    <div class="space-y-2 mb-4 text-sm">
      <div class="flex justify-between">
        <span class="text-text-secondary">Рестораны</span>
        <span class="font-medium text-text">до {{ tariff.maxRestaurants }}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-text-secondary">Пользователи</span>
        <span class="font-medium text-text">до {{ tariff.maxUsers }}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-text-secondary">Транскрипций</span>
        <span class="font-medium text-text">{{ tariff.maxTranscriptions }}/мес</span>
      </div>
    </div>

    <!-- Подписки -->
    <div v-if="tariff._count" class="text-xs text-text-secondary mb-4 border-t border-border pt-3">
      Подписок: {{ tariff._count.billings }} | Платежей: {{ tariff._count.payments }}
    </div>

    <!-- Spacer чтобы кнопки были внизу -->
    <div class="flex-1" />

    <!-- Действия -->
    <div class="flex gap-2">
      <button
        @click="$emit('edit', tariff)"
        class="flex-1 px-3 py-2 text-sm font-medium text-text bg-bg-secondary hover:bg-bg-hover rounded-lg transition-colors"
      >
        Редактировать
      </button>
      <button
        @click="$emit('delete', tariff)"
        class="px-3 py-2 text-sm font-medium text-status-red-icon bg-status-red-bg hover:bg-status-red-bg rounded-lg transition-colors"
      >
        Удалить
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Tariff {
  id: string
  name: string
  description: string | null
  price: number
  period: number
  maxRestaurants: number
  maxUsers: number
  maxTranscriptions: number
  isActive: boolean
  sortOrder: number
  _count?: { billings: number; payments: number }
}

defineProps<{
  tariff: Tariff
}>()

defineEmits<{
  edit: [tariff: Tariff]
  delete: [tariff: Tariff]
}>()
</script>
