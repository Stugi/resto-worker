<template>
  <div>
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl md:text-3xl font-bold text-text mb-2">
          Тарифы
        </h1>
        <p class="text-text-secondary">
          Управление тарифными планами и подписками
        </p>
      </div>

      <BaseButton @click="openCreateModal" variant="primary" size="md">
        Создать тариф
      </BaseButton>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-action"></div>
    </div>

    <!-- Tariffs Grid -->
    <div v-else-if="tariffs.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="tariff in tariffs"
        :key="tariff.id"
        :class="[
          'bg-white rounded-lg border p-6 hover:shadow-md transition-shadow relative',
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

        <!-- Действия -->
        <div class="flex gap-2">
          <button
            @click="openEditModal(tariff)"
            class="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Редактировать
          </button>
          <button
            @click="openDeleteModal(tariff)"
            class="px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
          >
            Удалить
          </button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="bg-white rounded-lg border border-gray-200 p-12 text-center">
      <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      </div>
      <h3 class="text-lg font-medium text-text mb-2">Нет тарифов</h3>
      <p class="text-text-secondary mb-4">
        Создайте тарифные планы для ваших клиентов
      </p>
      <BaseButton @click="openCreateModal" variant="primary">
        Создать тариф
      </BaseButton>
    </div>

    <!-- Create/Edit Modal -->
    <TariffModal
      v-if="showModal"
      :tariff="selectedTariff"
      @close="closeModal"
      @saved="handleSaved"
    />

    <!-- Delete Confirm Modal -->
    <DeleteConfirmModal
      v-if="showDeleteModal"
      :message="`Вы уверены, что хотите удалить тариф &laquo;${tariffToDelete?.name}&raquo;?`"
      :loading="deleteLoading"
      @cancel="closeDeleteModal"
      @confirm="deleteTariff"
    />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default'
})

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

const loading = ref(true)
const tariffs = ref<Tariff[]>([])
const showModal = ref(false)
const selectedTariff = ref<Tariff | null>(null)
const showDeleteModal = ref(false)
const tariffToDelete = ref<Tariff | null>(null)
const deleteLoading = ref(false)

const fetchTariffs = async () => {
  loading.value = true
  try {
    const data = await $fetch('/api/tariffs')
    tariffs.value = data as Tariff[]
  } catch (error) {
    console.error('Error fetching tariffs:', error)
  } finally {
    loading.value = false
  }
}

const openCreateModal = () => {
  selectedTariff.value = null
  showModal.value = true
}

const openEditModal = (tariff: Tariff) => {
  selectedTariff.value = tariff
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  selectedTariff.value = null
}

const handleSaved = () => {
  closeModal()
  fetchTariffs()
}

const openDeleteModal = (tariff: Tariff) => {
  tariffToDelete.value = tariff
  showDeleteModal.value = true
}

const closeDeleteModal = () => {
  showDeleteModal.value = false
  tariffToDelete.value = null
}

const deleteTariff = async () => {
  if (!tariffToDelete.value) return

  deleteLoading.value = true
  try {
    await $fetch(`/api/tariffs/${tariffToDelete.value.id}`, {
      method: 'DELETE'
    })
    closeDeleteModal()
    fetchTariffs()
  } catch (error: any) {
    alert(error.data?.message || 'Ошибка при удалении тарифа')
  } finally {
    deleteLoading.value = false
  }
}

onMounted(() => {
  fetchTariffs()
})
</script>
