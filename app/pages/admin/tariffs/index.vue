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
      <BaseSpinner size="lg" />
    </div>

    <!-- Tariffs -->
    <div v-else-if="tariffs.length > 0" class="flex flex-row flex-wrap justify-around gap-6">
      <TariffCard
        v-for="tariff in tariffs"
        :key="tariff.id"
        :tariff="tariff"
        class="w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]"
        @edit="openEditModal"
        @delete="openDeleteModal"
      />
    </div>

    <!-- Empty State -->
    <div v-else class="bg-bg-card rounded-lg border border-border p-12 text-center">
      <div class="w-16 h-16 bg-bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
