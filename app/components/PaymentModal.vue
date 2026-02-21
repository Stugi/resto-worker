<template>
  <!-- Modal Overlay -->
  <div
    class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
    @click.self="$emit('close')"
  >
    <!-- Modal Content -->
    <div class="bg-bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-border shrink-0">
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
          <BaseSpinner />
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
                : 'border-border hover:border-border-input hover:shadow-sm'
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

        <!-- Success message -->
        <div
          v-if="telegramSent"
          class="mt-4 bg-status-emerald-bg border border-status-emerald-border text-status-emerald-text px-4 py-3 rounded flex items-center gap-2"
        >
          <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <p class="text-sm">Ссылка на оплату отправлена в Telegram</p>
        </div>

        <!-- Error -->
        <div
          v-if="error"
          class="mt-4 bg-status-red-bg border border-status-red-border text-status-red-text px-4 py-3 rounded"
        >
          <p class="text-sm">{{ error }}</p>
        </div>
      </div>

      <!-- Footer -->
      <div class="px-6 py-4 border-t border-border flex gap-3 justify-end shrink-0">
        <BaseButton
          @click="$emit('close')"
          variant="secondary"
          :disabled="loading || loadingTelegram"
        >
          Отмена
        </BaseButton>
        <BaseButton
          @click="handleSendToTelegram"
          :loading="loadingTelegram"
          loading-text="Отправка..."
          variant="secondary"
          :disabled="!selectedTariff || loading"
        >
          <span class="flex items-center gap-1.5">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
            </svg>
            Отправить в Telegram
          </span>
        </BaseButton>
        <BaseButton
          @click="handlePayment"
          :loading="loading"
          loading-text="Создание платежа..."
          variant="primary"
          :disabled="!selectedTariff || loadingTelegram"
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
const loadingTelegram = ref(false)
const error = ref('')
const telegramSent = ref(false)
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
  telegramSent.value = false
  loading.value = true

  try {
    const result = await $fetch('/api/payments/create', {
      method: 'POST',
      body: {
        tariffId: selectedTariff.value.id,
        organizationId: props.organization.id
      }
    }) as { formUrl: string }

    // Редирект на платёжную форму Тинькофф
    window.location.href = result.formUrl
  } catch (err: any) {
    error.value = err.data?.message || err.message || 'Ошибка создания платежа'
  } finally {
    loading.value = false
  }
}

const handleSendToTelegram = async () => {
  if (!selectedTariff.value) return

  error.value = ''
  telegramSent.value = false
  loadingTelegram.value = true

  try {
    const result = await $fetch('/api/payments/send-to-telegram', {
      method: 'POST',
      body: {
        tariffId: selectedTariff.value.id,
        organizationId: props.organization.id
      }
    }) as { sent: boolean; warning?: string }

    if (result.sent) {
      telegramSent.value = true
    } else if (result.warning) {
      error.value = result.warning
    }
  } catch (err: any) {
    error.value = err.data?.message || err.message || 'Ошибка отправки в Telegram'
  } finally {
    loadingTelegram.value = false
  }
}

onMounted(() => {
  fetchTariffs()
})
</script>
