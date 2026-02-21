<template>
  <div>
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl md:text-3xl font-bold text-text mb-2">
          Промпты
        </h1>
        <p class="text-text-secondary">
          Шаблоны для генерации отчетов
        </p>
      </div>

      <BaseButton @click="openCreateModal" variant="primary" size="md">
        Создать промпт
      </BaseButton>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <BaseSpinner size="lg" />
    </div>

    <!-- Prompts List -->
    <div v-else-if="prompts.length > 0" class="space-y-4">
      <div
        v-for="prompt in prompts"
        :key="prompt.id"
        class="bg-bg-card rounded-lg border border-border p-6 hover:shadow-md transition-shadow"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1 min-w-0">
            <!-- Название и бейджи -->
            <div class="flex items-center gap-2 mb-2 flex-wrap">
              <h3 class="text-lg font-semibold text-text">
                {{ prompt.name }}
              </h3>
              <span
                v-if="prompt.isDefault"
                class="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-status-blue-bg text-status-blue-text border border-status-blue-border"
              >
                По умолчанию
              </span>
              <span
                v-if="!prompt.isActive"
                class="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-status-red-bg text-status-red-text border border-status-red-border"
              >
                Неактивен
              </span>
            </div>

            <!-- Ресторан -->
            <p v-if="prompt.restaurant" class="text-sm text-text-secondary mb-2">
              Ресторан: {{ prompt.restaurant.name }}
            </p>
            <p v-else-if="!prompt.isDefault" class="text-sm text-text-secondary mb-2">
              Без привязки к ресторану
            </p>

            <!-- Превью шаблона -->
            <p class="text-sm text-text-secondary line-clamp-2">
              {{ prompt.template }}
            </p>
          </div>

          <!-- Действия -->
          <div class="flex gap-2 shrink-0">
            <button
              @click="openEditModal(prompt)"
              class="p-2 text-text-secondary hover:text-text hover:bg-bg-hover rounded-lg transition-colors"
              title="Редактировать"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              @click="openDeleteModal(prompt)"
              class="p-2 text-text-secondary hover:text-status-red-icon hover:bg-status-red-bg rounded-lg transition-colors"
              title="Удалить"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="bg-bg-card rounded-lg border border-border p-12 text-center">
      <div class="w-16 h-16 bg-bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <h3 class="text-lg font-medium text-text mb-2">Нет промптов</h3>
      <p class="text-text-secondary mb-4">
        Создайте первый шаблон для генерации отчетов
      </p>
      <BaseButton @click="openCreateModal" variant="primary">
        Создать промпт
      </BaseButton>
    </div>

    <!-- Create/Edit Modal -->
    <PromptModal
      v-if="showModal"
      :prompt="selectedPrompt"
      @close="closeModal"
      @saved="handleSaved"
    />

    <!-- Delete Confirm Modal -->
    <DeleteConfirmModal
      v-if="showDeleteModal"
      :message="`Вы уверены, что хотите удалить промпт «${promptToDelete?.name}»?`"
      :loading="deleteLoading"
      @cancel="closeDeleteModal"
      @confirm="deletePrompt"
    />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default'
})

interface Prompt {
  id: string
  name: string
  template: string
  isActive: boolean
  isDefault: boolean
  restaurantId: string | null
  restaurant: { id: string; name: string } | null
}

const loading = ref(true)
const prompts = ref<Prompt[]>([])
const showModal = ref(false)
const selectedPrompt = ref<Prompt | null>(null)
const showDeleteModal = ref(false)
const promptToDelete = ref<Prompt | null>(null)
const deleteLoading = ref(false)

const fetchPrompts = async () => {
  loading.value = true
  try {
    const data = await $fetch('/api/prompts')
    prompts.value = data as Prompt[]
  } catch (error) {
    console.error('Error fetching prompts:', error)
  } finally {
    loading.value = false
  }
}

const openCreateModal = () => {
  selectedPrompt.value = null
  showModal.value = true
}

const openEditModal = (prompt: Prompt) => {
  selectedPrompt.value = prompt
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  selectedPrompt.value = null
}

const handleSaved = () => {
  closeModal()
  fetchPrompts()
}

const openDeleteModal = (prompt: Prompt) => {
  promptToDelete.value = prompt
  showDeleteModal.value = true
}

const closeDeleteModal = () => {
  showDeleteModal.value = false
  promptToDelete.value = null
}

const deletePrompt = async () => {
  if (!promptToDelete.value) return

  deleteLoading.value = true
  try {
    await $fetch(`/api/prompts/${promptToDelete.value.id}`, {
      method: 'DELETE'
    })
    closeDeleteModal()
    fetchPrompts()
  } catch (error: any) {
    alert(error.data?.message || 'Ошибка при удалении промпта')
  } finally {
    deleteLoading.value = false
  }
}

onMounted(() => {
  fetchPrompts()
})
</script>
