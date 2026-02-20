<template>
  <!-- Modal Overlay -->
  <div
    class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
    @click.self="$emit('close')"
  >
    <!-- Modal Content -->
    <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-200 shrink-0">
        <h2 class="text-xl font-semibold text-text">
          {{ prompt ? 'Редактировать промпт' : 'Создать промпт' }}
        </h2>
      </div>

      <!-- Body -->
      <form @submit.prevent="handleSubmit" class="p-6 space-y-4 overflow-y-auto flex-1">
        <!-- Название -->
        <BaseInput
          id="name"
          v-model="form.name"
          label="Название промпта"
          placeholder="Еженедельный отчет"
          required
        />

        <!-- Ресторан -->
        <BaseSelect
          v-model="form.restaurantId"
          :options="[{ value: '', label: 'Без привязки к ресторану' }, ...restaurants.map(r => ({ value: r.id, label: r.name }))]"
          label="Ресторан"
          placeholder="Без привязки к ресторану"
          :disabled="form.isDefault"
        />

        <!-- По умолчанию -->
        <div v-if="isSuperAdmin" class="flex items-center gap-3">
          <input
            id="isDefault"
            v-model="form.isDefault"
            type="checkbox"
            class="w-4 h-4 text-action border-gray-300 rounded focus:ring-action"
          />
          <label for="isDefault" class="text-sm font-medium text-text">
            Промпт по умолчанию (для всех ресторанов)
          </label>
        </div>

        <!-- Активен -->
        <div v-if="prompt" class="flex items-center gap-3">
          <input
            id="isActive"
            v-model="form.isActive"
            type="checkbox"
            class="w-4 h-4 text-action border-gray-300 rounded focus:ring-action"
          />
          <label for="isActive" class="text-sm font-medium text-text">
            Активен
          </label>
        </div>

        <!-- Шаблон -->
        <div>
          <label class="block text-sm font-medium text-text mb-2">
            Шаблон промпта
          </label>
          <textarea
            v-model="form.template"
            rows="10"
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-action/20 focus:border-action outline-none resize-y font-mono text-sm"
            placeholder="Ты — аналитик ресторанного бизнеса. На основе транскрипций голосовых отчетов менеджеров составь еженедельный отчет..."
            required
          />
          <p class="mt-1 text-xs text-text-secondary">
            Используй переменные: {restaurant_name}, {week_start}, {week_end}, {transcripts}
          </p>
        </div>

        <!-- Превью отчёта -->
        <div>
          <BaseButton
            @click="generatePreview"
            :loading="previewLoading"
            loading-text="Генерация..."
            variant="secondary"
            size="sm"
            type="button"
          >
            Показать пример отчёта
          </BaseButton>

          <div
            v-if="previewContent"
            class="mt-3 p-4 bg-gray-50 border border-gray-200 rounded-lg prose prose-sm max-w-none overflow-y-auto max-h-64"
            v-html="renderedPreview"
          />

          <div
            v-if="previewError"
            class="mt-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm"
          >
            {{ previewError }}
          </div>
        </div>

        <!-- Error Message -->
        <div
          v-if="error"
          class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded"
        >
          <p class="text-sm">{{ error }}</p>
        </div>
      </form>

      <!-- Footer -->
      <div class="px-6 py-4 border-t border-gray-200 flex gap-3 justify-end shrink-0">
        <BaseButton
          @click="$emit('close')"
          variant="secondary"
          :disabled="loading"
        >
          Отмена
        </BaseButton>
        <BaseButton
          @click="handleSubmit"
          :loading="loading"
          :loading-text="prompt ? 'Сохранение...' : 'Создание...'"
          variant="primary"
        >
          {{ prompt ? 'Сохранить' : 'Создать' }}
        </BaseButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { UserRole } from '#shared/constants/roles'

interface Props {
  prompt?: {
    id: string
    name: string
    template: string
    isActive: boolean
    isDefault: boolean
    restaurantId: string | null
    restaurant: { id: string; name: string } | null
  } | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const { user } = useAuth()
const isSuperAdmin = computed(() => user.value?.role === UserRole.SUPER_ADMIN)

const loading = ref(false)
const error = ref('')
const restaurants = ref<{ id: string; name: string }[]>([])
const previewLoading = ref(false)
const previewContent = ref('')
const previewError = ref('')

// Простой Markdown → HTML рендер
const renderedPreview = computed(() => {
  let html = previewContent.value
  // Escape HTML
  html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>')
  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  // List items
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>')
  // Line breaks
  html = html.replace(/\n/g, '<br>')
  return html
})

const generatePreview = async () => {
  if (!form.template.trim()) {
    previewError.value = 'Введите шаблон для генерации примера'
    return
  }

  previewLoading.value = true
  previewError.value = ''
  previewContent.value = ''

  try {
    const result = await $fetch('/api/prompts/preview', {
      method: 'POST',
      body: { template: form.template }
    }) as any

    previewContent.value = result.content
  } catch (err: any) {
    previewError.value = err.data?.message || 'Ошибка генерации примера'
  } finally {
    previewLoading.value = false
  }
}

const form = reactive({
  name: props.prompt?.name || '',
  template: props.prompt?.template || '',
  isDefault: props.prompt?.isDefault || false,
  isActive: props.prompt?.isActive ?? true,
  restaurantId: props.prompt?.restaurantId || ''
})

// Загрузить список ресторанов для select
const fetchRestaurants = async () => {
  try {
    const data = await $fetch('/api/restaurants')
    restaurants.value = (data as any[]).map(r => ({ id: r.id, name: r.name }))
  } catch (e) {
    console.error('Error fetching restaurants:', e)
  }
}

const handleSubmit = async () => {
  error.value = ''

  if (!form.name.trim()) {
    error.value = 'Название обязательно'
    return
  }

  if (!form.template.trim()) {
    error.value = 'Шаблон обязателен'
    return
  }

  loading.value = true

  try {
    const body: any = {
      name: form.name,
      template: form.template,
      isDefault: form.isDefault,
      restaurantId: form.isDefault ? null : (form.restaurantId || null)
    }

    if (props.prompt) {
      body.isActive = form.isActive
      await $fetch(`/api/prompts/${props.prompt.id}`, {
        method: 'PATCH',
        body
      })
    } else {
      await $fetch('/api/prompts', {
        method: 'POST',
        body
      })
    }

    emit('saved')
  } catch (err: any) {
    error.value = err.data?.message || err.message || 'Произошла ошибка'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchRestaurants()
})
</script>
