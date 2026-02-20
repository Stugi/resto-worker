<template>
  <!-- Modal Overlay -->
  <div
    class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
    @click.self="$emit('close')"
  >
    <!-- Modal Content -->
    <div class="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-200 shrink-0">
        <h2 class="text-xl font-semibold text-text">
          Сгенерировать отчёт
        </h2>
        <p class="text-sm text-text-secondary mt-1">
          Выберите ресторан и период для генерации
        </p>
      </div>

      <!-- Body -->
      <form @submit.prevent="handleGenerate" class="p-6 space-y-4 overflow-y-auto flex-1">
        <!-- Ресторан -->
        <BaseSelect
          v-model="form.restaurantId"
          :options="[{ value: '', label: 'Выберите ресторан' }, ...restaurants.map(r => ({ value: r.id, label: r.name }))]"
          label="Ресторан"
          placeholder="Выберите ресторан"
          required
        />

        <!-- Период -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-text mb-2">
              Дата начала
            </label>
            <input
              v-model="form.periodStart"
              type="date"
              required
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-action/20 focus:border-action outline-none"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-text mb-2">
              Дата конца
            </label>
            <input
              v-model="form.periodEnd"
              type="date"
              required
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-action/20 focus:border-action outline-none"
            />
          </div>
        </div>

        <!-- Промпт (опционально) -->
        <BaseSelect
          v-model="form.promptId"
          :options="[{ value: '', label: 'Автоматически (по умолчанию)' }, ...prompts.map(p => ({ value: p.id, label: p.name + (p.isDefault ? ' (по умолчанию)' : '') }))]"
          label="Шаблон отчёта"
          placeholder="Автоматически (по умолчанию)"
        />

        <!-- Error -->
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
          @click="handleGenerate"
          :loading="loading"
          loading-text="Генерация отчёта..."
          variant="primary"
          :disabled="!form.restaurantId || !form.periodStart || !form.periodEnd"
        >
          Сгенерировать
        </BaseButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  close: []
  generated: [report: any]
}>()

const loading = ref(false)
const error = ref('')
const restaurants = ref<{ id: string; name: string }[]>([])
const prompts = ref<{ id: string; name: string; isDefault: boolean }[]>([])

// Устанавливаем период по умолчанию — последние 7 дней
const now = new Date()
const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

const form = reactive({
  restaurantId: '',
  periodStart: weekAgo.toISOString().split('T')[0],
  periodEnd: now.toISOString().split('T')[0],
  promptId: ''
})

const fetchRestaurants = async () => {
  try {
    const data = await $fetch('/api/restaurants')
    restaurants.value = (data as any[]).map(r => ({ id: r.id, name: r.name }))
    // Автоматически выбираем первый
    if (restaurants.value.length === 1) {
      form.restaurantId = restaurants.value[0].id
    }
  } catch (e) { /* ignore */ }
}

const fetchPrompts = async () => {
  try {
    const data = await $fetch('/api/prompts')
    prompts.value = (data as any[]).map(p => ({
      id: p.id,
      name: p.name,
      isDefault: p.isDefault
    }))
  } catch (e) { /* ignore */ }
}

const handleGenerate = async () => {
  if (!form.restaurantId || !form.periodStart || !form.periodEnd) return

  error.value = ''
  loading.value = true

  try {
    const result = await $fetch('/api/reports/generate', {
      method: 'POST',
      body: {
        restaurantId: form.restaurantId,
        periodStart: new Date(form.periodStart).toISOString(),
        periodEnd: new Date(form.periodEnd + 'T23:59:59').toISOString(),
        promptId: form.promptId || undefined
      }
    })

    emit('generated', result)
  } catch (err: any) {
    error.value = err.data?.message || err.message || 'Ошибка генерации отчёта'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchRestaurants()
  fetchPrompts()
})
</script>
