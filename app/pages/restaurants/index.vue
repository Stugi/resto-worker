<template>
  <div>
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl md:text-3xl font-bold text-text mb-2">Рестораны</h1>
        <p class="text-text-secondary">Управление ресторанами организации</p>
      </div>

      <BaseButton @click="openCreateModal" variant="primary" size="md">
        Создать ресторан
      </BaseButton>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-action"></div>
    </div>

    <!-- Desktop: Restaurants Table -->
    <div
      v-if="restaurants.length > 0"
      class="hidden md:block bg-white rounded-lg border border-gray-200 overflow-hidden"
    >
      <div class="overflow-x-auto">
        <table class="w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 w-24"></th>
              <th class="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Название
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Организация
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Сотрудников
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Создан
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr
              v-for="restaurant in restaurants"
              :key="restaurant.id"
              class="hover:bg-gray-50 transition-colors"
            >
              <td class="px-4 py-4 whitespace-nowrap">
                <div class="flex gap-2">
                  <button
                    @click="openEditModal(restaurant)"
                    class="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Редактировать"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    @click="openDeleteModal(restaurant)"
                    class="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Удалить"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </td>
              <td class="px-4 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-text">{{ restaurant.name }}</div>
                <div v-if="restaurant.settingsComment" class="text-xs text-text-secondary truncate max-w-xs">
                  {{ restaurant.settingsComment }}
                </div>
              </td>
              <td class="px-4 py-4 whitespace-nowrap text-sm text-text-secondary">
                {{ restaurant.organization?.name || '—' }}
              </td>
              <td class="px-4 py-4 whitespace-nowrap text-sm text-text-secondary">
                {{ restaurant._count?.users || 0 }}
              </td>
              <td class="px-4 py-4 whitespace-nowrap text-sm text-text-secondary">
                {{ formatDate(restaurant.createdAt) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Mobile: Restaurants Cards -->
    <div
      v-if="restaurants.length > 0"
      class="md:hidden space-y-3"
    >
      <div
        v-for="restaurant in restaurants"
        :key="restaurant.id"
        class="bg-white rounded-lg border border-gray-200 p-4"
      >
        <!-- Header with name and actions -->
        <div class="flex items-start justify-between mb-3">
          <div class="flex-1 min-w-0">
            <h3 class="font-medium text-text truncate">{{ restaurant.name }}</h3>
            <p v-if="restaurant.settingsComment" class="text-sm text-text-secondary line-clamp-2 mt-1">
              {{ restaurant.settingsComment }}
            </p>
          </div>
          <div class="flex gap-2 ml-3">
            <button
              @click="openEditModal(restaurant)"
              class="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              @click="openDeleteModal(restaurant)"
              class="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Info grid -->
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-text-secondary">Организация:</span>
            <span class="text-text">{{ restaurant.organization?.name || '—' }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-text-secondary">Сотрудников:</span>
            <span class="text-text">{{ restaurant._count?.users || 0 }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-text-secondary">Создан:</span>
            <span class="text-text">{{ formatDate(restaurant.createdAt) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="!loading"
      class="bg-white rounded-lg border border-gray-200 p-12 text-center"
    >
      <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      </div>
      <h3 class="text-lg font-medium text-text mb-2">Нет ресторанов</h3>
      <p class="text-text-secondary mb-4">Создайте первый ресторан для начала работы</p>
      <BaseButton @click="openCreateModal" variant="primary">
        Создать ресторан
      </BaseButton>
    </div>

    <!-- Create/Edit Modal -->
    <RestaurantModal
      v-if="showModal"
      :restaurant="selectedRestaurant"
      @close="closeModal"
      @saved="handleSaved"
    />

    <!-- Delete Confirm Modal -->
    <DeleteConfirmModal
      v-if="showDeleteModal"
      :message="`Вы уверены, что хотите удалить ресторан «${restaurantToDelete?.name}»?`"
      :loading="deleteLoading"
      @cancel="closeDeleteModal"
      @confirm="deleteRestaurant"
    />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default'
})

interface Restaurant {
  id: string
  name: string
  settingsComment?: string | null
  createdAt: string
  organization?: {
    id: string
    name: string
  }
  _count?: {
    users: number
  }
}

const loading = ref(true)
const restaurants = ref<Restaurant[]>([])
const showModal = ref(false)
const selectedRestaurant = ref<Restaurant | null>(null)
const showDeleteModal = ref(false)
const restaurantToDelete = ref<Restaurant | null>(null)
const deleteLoading = ref(false)

// Загрузка ресторанов
const fetchRestaurants = async () => {
  loading.value = true
  try {
    const data = await $fetch('/api/restaurants')
    restaurants.value = data as Restaurant[]
  } catch (error) {
    console.error('Error fetching restaurants:', error)
  } finally {
    loading.value = false
  }
}

// Форматирование даты
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

// Открыть модалку создания
const openCreateModal = () => {
  selectedRestaurant.value = null
  showModal.value = true
}

// Открыть модалку редактирования
const openEditModal = (restaurant: Restaurant) => {
  selectedRestaurant.value = restaurant
  showModal.value = true
}

// Закрыть модалку
const closeModal = () => {
  showModal.value = false
  selectedRestaurant.value = null
}

// Обработка сохранения
const handleSaved = () => {
  closeModal()
  fetchRestaurants()
}

// Открыть модалку удаления
const openDeleteModal = (restaurant: Restaurant) => {
  restaurantToDelete.value = restaurant
  showDeleteModal.value = true
}

// Закрыть модалку удаления
const closeDeleteModal = () => {
  showDeleteModal.value = false
  restaurantToDelete.value = null
}

// Удаление ресторана
const deleteRestaurant = async () => {
  if (!restaurantToDelete.value) return

  deleteLoading.value = true

  try {
    await $fetch(`/api/restaurants/${restaurantToDelete.value.id}`, {
      method: 'DELETE'
    })
    closeDeleteModal()
    fetchRestaurants()
  } catch (error: any) {
    alert(error.data?.message || 'Ошибка при удалении ресторана')
  } finally {
    deleteLoading.value = false
  }
}

// Загрузка при монтировании
onMounted(() => {
  fetchRestaurants()
})
</script>
