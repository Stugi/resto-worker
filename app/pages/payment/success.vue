<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 p-4">
    <div class="bg-white rounded-lg shadow-lg max-w-md w-full p-8 text-center">
      <!-- Loading -->
      <div v-if="loading" class="py-8">
        <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-action mx-auto mb-4"></div>
        <p class="text-text-secondary">Проверяем оплату...</p>
      </div>

      <!-- Success -->
      <div v-else-if="paymentResult?.status === 'COMPLETED'">
        <div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg class="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-text mb-2">Оплата прошла успешно!</h1>
        <p class="text-text-secondary mb-6">
          Тариф <strong>{{ paymentResult.tariffName }}</strong> активирован.
          <br>
          Сумма: {{ paymentResult.amount?.toLocaleString('ru-RU') }} руб.
        </p>
        <p v-if="paymentResult.activeUntil" class="text-sm text-text-secondary mb-6">
          Подписка активна до: {{ new Date(paymentResult.activeUntil).toLocaleDateString('ru-RU') }}
        </p>
        <NuxtLink
          to="/"
          class="inline-block px-6 py-3 bg-action text-white font-medium rounded-lg hover:bg-action/90 transition-colors"
        >
          Перейти в панель управления
        </NuxtLink>
      </div>

      <!-- Still Pending -->
      <div v-else-if="paymentResult?.status === 'PENDING'">
        <div class="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg class="w-10 h-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-text mb-2">Оплата обрабатывается</h1>
        <p class="text-text-secondary mb-6">
          Платёж ещё обрабатывается банком. Пожалуйста, подождите несколько минут.
        </p>
        <div class="flex gap-3 justify-center">
          <button
            @click="checkPayment"
            class="px-6 py-3 bg-action text-white font-medium rounded-lg hover:bg-action/90 transition-colors"
          >
            Проверить ещё раз
          </button>
          <NuxtLink
            to="/"
            class="px-6 py-3 bg-gray-100 text-text font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            В панель управления
          </NuxtLink>
        </div>
      </div>

      <!-- Error -->
      <div v-else>
        <div class="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg class="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-text mb-2">Что-то пошло не так</h1>
        <p class="text-text-secondary mb-6">
          {{ errorMessage || 'Не удалось проверить статус оплаты' }}
        </p>
        <NuxtLink
          to="/"
          class="inline-block px-6 py-3 bg-action text-white font-medium rounded-lg hover:bg-action/90 transition-colors"
        >
          В панель управления
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false
})

const route = useRoute()

const loading = ref(true)
const errorMessage = ref('')
const paymentResult = ref<{
  paymentId: string
  status: string
  amount?: number
  tariffName?: string
  activeUntil?: string
} | null>(null)

const checkPayment = async () => {
  const paymentId = route.query.paymentId as string

  if (!paymentId) {
    errorMessage.value = 'Не указан ID платежа'
    loading.value = false
    return
  }

  loading.value = true

  try {
    const result = await $fetch('/api/payments/check', {
      method: 'POST',
      body: { paymentId }
    })
    paymentResult.value = result as any
  } catch (err: any) {
    errorMessage.value = err.data?.message || 'Ошибка проверки оплаты'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  checkPayment()
})
</script>
