<template>
  <div
    :class="[
      'bg-white rounded-lg border p-6 hover:shadow-md transition-shadow relative flex flex-col',
      tariff.isActive ? 'border-gray-200' : 'border-red-200 bg-red-50/30'
    ]"
  >
    <!-- Бейджи -->
    <div class="flex items-center gap-2 mb-3 flex-wrap">
      <span
        v-if="!tariff.isActive"
        class="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200"
      >
        Неактивен
      </span>
      <span
        v-if="tariff.price === 0"
        class="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200"
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
    <div v-if="tariff._count" class="text-xs text-text-secondary mb-4 border-t border-gray-100 pt-3">
      Подписок: {{ tariff._count.billings }} | Платежей: {{ tariff._count.payments }}
    </div>

    <!-- Spacer чтобы кнопки были внизу -->
    <div class="flex-1" />

    <!-- Действия -->
    <div class="flex gap-2">
      <button
        @click="$emit('edit', tariff)"
        class="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
      >
        Редактировать
      </button>
      <button
        @click="$emit('delete', tariff)"
        class="px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
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
