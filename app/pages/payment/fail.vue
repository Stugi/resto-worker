<template>
  <div class="min-h-screen flex items-center justify-center bg-bg-secondary p-4">
    <div class="bg-bg-card rounded-lg shadow-lg max-w-md w-full p-8 text-center">
      <div class="w-20 h-20 bg-status-red-bg rounded-full flex items-center justify-center mx-auto mb-6">
        <svg class="w-10 h-10 text-status-red-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>

      <h1 class="text-2xl font-bold text-text mb-2">Оплата не прошла</h1>
      <p class="text-text-secondary mb-6">
        К сожалению, платёж не был завершён. Возможно, карта была отклонена или вы отменили оплату.
      </p>

      <div v-if="paymentResult" class="bg-bg-secondary rounded-lg p-4 mb-6 text-sm text-left">
        <div v-if="paymentResult.tariffName" class="flex justify-between mb-1">
          <span class="text-text-secondary">Тариф:</span>
          <span class="font-medium">{{ paymentResult.tariffName }}</span>
        </div>
        <div v-if="paymentResult.amount" class="flex justify-between mb-1">
          <span class="text-text-secondary">Сумма:</span>
          <span class="font-medium">{{ paymentResult.amount.toLocaleString('ru-RU') }} руб.</span>
        </div>
        <div v-if="paymentResult.error" class="flex justify-between">
          <span class="text-text-secondary">Причина:</span>
          <span class="font-medium text-status-red-icon">{{ paymentResult.error }}</span>
        </div>
      </div>

      <div class="flex gap-3 justify-center">
        <button
          @click="retryPayment"
          class="px-6 py-3 bg-action text-action-text font-medium rounded-lg hover:bg-action-hover transition-colors"
        >
          Попробовать снова
        </button>
        <NuxtLink
          to="/"
          class="px-6 py-3 bg-bg-secondary text-text font-medium rounded-lg hover:bg-bg-hover transition-colors"
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
const router = useRouter()

const paymentResult = ref<{
  paymentId: string
  status: string
  amount?: number
  tariffName?: string
  error?: string
} | null>(null)

const retryPayment = () => {
  // Возвращаем на страницу тарифов для повторной оплаты
  router.push('/admin/tariffs')
}

onMounted(async () => {
  const paymentId = route.query.paymentId as string

  if (paymentId) {
    try {
      const result = await $fetch('/api/payments/check', {
        method: 'POST',
        body: { paymentId }
      })
      paymentResult.value = result as any
    } catch {
      // Игнорируем ошибки — страница и так показывает что оплата не прошла
    }
  }
})
</script>
