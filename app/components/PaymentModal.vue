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
          Оплата подписки
        </h2>
        <p class="text-sm text-text-secondary mt-1">
          {{ organization.name }}
        </p>
      </div>

      <!-- Body -->
      <div class="p-6 overflow-y-auto flex-1">
        <!-- Loading tariffs -->
        <div v-if="loadingTariffs" class="flex items-center justify-center py-8">
          <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-action"></div>
        </div>

        <!-- Tariff Cards -->
        <div v-else-if="tariffs.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            v-for="tariff in tariffs"
            :key="tariff.id"
            @click="selectTariff(tariff)"
            :class="[
              'border-2 rounded-lg p-5 cursor-pointer transition-all',
              selectedTariff?.id === tariff.id
                ? 'border-action bg-action/5 shadow-md'
                : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
            ]"
          >
            <h3 class="text-lg font-semibold text-text mb-1">
              {{ tariff.name }}
            </h3>
            <div class="flex items-baseline gap-1 mb-3">
              <span class="text-2xl font-bold text-text">
                {{ tariff.price.toLocaleString('ru-RU') }}
              </span>
              <span class="text-text-secondary text-sm">
                руб/{{ tariff.period }} дн.
              </span>
            </div>

            <p v-if="tariff.description" class="text-sm text-text-secondary mb-3">
              {{ tariff.description }}
            </p>

            <div class="space-y-1 text-sm text-text-secondary">
              <div class="flex justify-between">
                <span>Рестораны:</span>
                <span class="font-medium text-text">до {{ tariff.maxRestaurants }}</span>
              </div>
              <div class="flex justify-between">
                <span>Пользователи:</span>
                <span class="font-medium text-text">до {{ tariff.maxUsers }}</span>
              </div>
              <div class="flex justify-between">
                <span>Транскрипций:</span>
                <span class="font-medium text-text">{{ tariff.maxTranscriptions }}/мес</span>
              </div>
            </div>
          </div>
        </div>

        <!-- No tariffs -->
        <div v-else class="text-center py-8 text-text-secondary">
          Нет доступных тарифов для оплаты
        </div>

        <!-- Error -->
        <div
          v-if="error"
          class="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded"
        >
          <p class="text-sm">{{ error }}</p>
        </div>
      </div>

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
          @click="handlePayment"
          :loading="loading"
          loading-text="Создание платежа..."
          variant="primary"
          :disabled="!selectedTariff"
        >
          Оплатить {{ selectedTariff ? selectedTariff.price.toLocaleString('ru-RU') + ' руб.' : '' }}
        </BaseButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  organization: {
    id: string
    name: string
  }
}

interface Tariff {
  id: string
  name: string
  description: string | null
  price: number
  period: number
  maxRestaurants: number
  maxUsers: number
  maxTranscriptions: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  paid: []
}>()

const loadingTariffs = ref(true)
const loading = ref(false)
const error = ref('')
const tariffs = ref<Tariff[]>([])
const selectedTariff = ref<Tariff | null>(null)

const selectTariff = (tariff: Tariff) => {
  selectedTariff.value = tariff
}

const fetchTariffs = async () => {
  loadingTariffs.value = true
  try {
    const data = await $fetch('/api/tariffs')
    // Показываем только платные тарифы
    tariffs.value = (data as Tariff[]).filter(t => t.price > 0)
    // Автоматически выбираем первый
    if (tariffs.value.length === 1) {
      selectedTariff.value = tariffs.value[0]
    }
  } catch (err: any) {
    error.value = 'Ошибка загрузки тарифов'
  } finally {
    loadingTariffs.value = false
  }
}

const handlePayment = async () => {
  if (!selectedTariff.value) return

  error.value = ''
  loading.value = true

  try {
    const result = await $fetch('/api/payments/create', {
      method: 'POST',
      body: {
        tariffId: selectedTariff.value.id,
        organizationId: props.organization.id
      }
    }) as { formUrl: string }

    // Редирект на платёжную форму Альфа-Банка
    window.location.href = result.formUrl
  } catch (err: any) {
    error.value = err.data?.message || err.message || 'Ошибка создания платежа'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchTariffs()
})
</script>
