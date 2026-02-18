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
          {{ tariff ? 'Редактировать тариф' : 'Создать тариф' }}
        </h2>
      </div>

      <!-- Body -->
      <form @submit.prevent="handleSubmit" class="p-6 space-y-4 overflow-y-auto flex-1">
        <!-- Название -->
        <BaseInput
          id="name"
          v-model="form.name"
          label="Название тарифа"
          placeholder="Базовый"
          required
        />

        <!-- Описание -->
        <div>
          <label class="block text-sm font-medium text-text mb-2">
            Описание
          </label>
          <textarea
            v-model="form.description"
            rows="2"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-action/20 focus:border-action outline-none resize-y text-sm"
            placeholder="Описание тарифного плана"
          />
        </div>

        <!-- Цена и период -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-text mb-2">
              Цена (руб.)
            </label>
            <input
              v-model.number="form.price"
              type="number"
              min="0"
              step="1"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-action/20 focus:border-action outline-none"
              placeholder="950"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-text mb-2">
              Период (дней)
            </label>
            <input
              v-model.number="form.period"
              type="number"
              min="1"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-action/20 focus:border-action outline-none"
              placeholder="30"
            />
          </div>
        </div>

        <!-- Лимиты -->
        <div class="border-t border-gray-100 pt-4">
          <h4 class="text-sm font-medium text-text mb-3">Лимиты</h4>
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block text-xs text-text-secondary mb-1">
                Рестораны
              </label>
              <input
                v-model.number="form.maxRestaurants"
                type="number"
                min="1"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-action/20 focus:border-action outline-none text-sm"
              />
            </div>
            <div>
              <label class="block text-xs text-text-secondary mb-1">
                Пользователи
              </label>
              <input
                v-model.number="form.maxUsers"
                type="number"
                min="1"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-action/20 focus:border-action outline-none text-sm"
              />
            </div>
            <div>
              <label class="block text-xs text-text-secondary mb-1">
                Транскрипций
              </label>
              <input
                v-model.number="form.maxTranscriptions"
                type="number"
                min="0"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-action/20 focus:border-action outline-none text-sm"
              />
            </div>
          </div>
        </div>

        <!-- Сортировка -->
        <div>
          <label class="block text-sm font-medium text-text mb-2">
            Порядок сортировки
          </label>
          <input
            v-model.number="form.sortOrder"
            type="number"
            min="0"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-action/20 focus:border-action outline-none"
            placeholder="0"
          />
        </div>

        <!-- Активен -->
        <div v-if="tariff" class="flex items-center gap-3">
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
          :loading-text="tariff ? 'Сохранение...' : 'Создание...'"
          variant="primary"
        >
          {{ tariff ? 'Сохранить' : 'Создать' }}
        </BaseButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  tariff?: {
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
  } | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const loading = ref(false)
const error = ref('')

const form = reactive({
  name: props.tariff?.name || '',
  description: props.tariff?.description || '',
  price: props.tariff?.price ?? 0,
  period: props.tariff?.period ?? 30,
  maxRestaurants: props.tariff?.maxRestaurants ?? 1,
  maxUsers: props.tariff?.maxUsers ?? 5,
  maxTranscriptions: props.tariff?.maxTranscriptions ?? 100,
  isActive: props.tariff?.isActive ?? true,
  sortOrder: props.tariff?.sortOrder ?? 0
})

const handleSubmit = async () => {
  error.value = ''

  if (!form.name.trim()) {
    error.value = 'Название тарифа обязательно'
    return
  }

  loading.value = true

  try {
    const body: any = {
      name: form.name,
      description: form.description || null,
      price: form.price,
      period: form.period,
      maxRestaurants: form.maxRestaurants,
      maxUsers: form.maxUsers,
      maxTranscriptions: form.maxTranscriptions,
      sortOrder: form.sortOrder
    }

    if (props.tariff) {
      body.isActive = form.isActive
      await $fetch(`/api/tariffs/${props.tariff.id}`, {
        method: 'PATCH',
        body
      })
    } else {
      await $fetch('/api/tariffs', {
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
</script>
