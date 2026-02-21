<template>
  <div>
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl md:text-3xl font-bold text-text mb-2">
          Лиды
        </h1>
        <p class="text-text-secondary">
          Контакты пользователей, которые начали онбординг
        </p>
      </div>
      <div class="text-sm text-text-secondary">
        Всего: {{ leads.length }}
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <BaseSpinner size="lg" />
    </div>

    <!-- Error -->
    <div
      v-if="error"
      class="bg-status-red-bg border border-status-red-border text-status-red-text px-4 py-3 rounded mb-4"
    >
      <p class="text-sm">{{ error }}</p>
    </div>

    <!-- Desktop: Leads Table -->
    <div
      v-if="leads.length > 0"
      class="hidden md:block bg-bg-card rounded-lg border border-border overflow-hidden"
    >
      <div class="overflow-x-auto">
        <table class="w-full divide-y divide-border">
          <thead class="bg-bg-secondary">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Телефон
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Имя
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Username
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Telegram ID
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Статус
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Дата
              </th>
            </tr>
          </thead>
          <tbody class="bg-bg-card divide-y divide-border">
            <tr v-for="lead in leads" :key="lead.id" class="hover:bg-bg-hover">
              <td class="px-4 py-3 text-sm font-mono text-text">
                {{ formatPhone(lead.phone) }}
              </td>
              <td class="px-4 py-3 text-sm text-text">
                {{ lead.name || '—' }}
              </td>
              <td class="px-4 py-3 text-sm text-text-secondary">
                <template v-if="lead.username">@{{ lead.username }}</template>
                <template v-else>—</template>
              </td>
              <td class="px-4 py-3 text-sm text-text-secondary font-mono">
                {{ lead.telegramId }}
              </td>
              <td class="px-4 py-3 text-sm">
                <span
                  :class="[
                    'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                    lead.converted
                      ? 'bg-status-emerald-bg text-status-emerald-text'
                      : 'bg-status-amber-bg text-status-amber-text'
                  ]"
                >
                  {{ lead.converted ? 'Конвертирован' : 'Новый' }}
                </span>
              </td>
              <td class="px-4 py-3 text-sm text-text-secondary">
                {{ formatDate(lead.createdAt) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Mobile: Leads Cards -->
    <div v-if="leads.length > 0" class="md:hidden space-y-3">
      <div
        v-for="lead in leads"
        :key="lead.id"
        class="bg-bg-card rounded-lg border border-border p-4"
      >
        <div class="flex items-center justify-between mb-2">
          <span class="font-mono text-sm font-medium text-text">
            {{ formatPhone(lead.phone) }}
          </span>
          <span
            :class="[
              'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
              lead.converted
                ? 'bg-status-emerald-bg text-status-emerald-text'
                : 'bg-status-amber-bg text-status-amber-text'
            ]"
          >
            {{ lead.converted ? 'Конвертирован' : 'Новый' }}
          </span>
        </div>
        <div class="text-sm text-text-secondary space-y-1">
          <div v-if="lead.name">{{ lead.name }}</div>
          <div v-if="lead.username">@{{ lead.username }}</div>
          <div class="text-xs">{{ formatDate(lead.createdAt) }}</div>
        </div>
      </div>
    </div>

    <!-- Empty -->
    <div
      v-if="!loading && leads.length === 0 && !error"
      class="text-center py-12 text-text-secondary"
    >
      Лидов пока нет
    </div>
  </div>
</template>

<script setup lang="ts">
interface Lead {
  id: string
  telegramId: string
  phone: string
  name: string | null
  username: string | null
  converted: boolean
  createdAt: string
}

const loading = ref(true)
const error = ref('')
const leads = ref<Lead[]>([])

const fetchLeads = async () => {
  loading.value = true
  error.value = ''
  try {
    const data = await $fetch('/api/leads')
    leads.value = data as Lead[]
  } catch (err: any) {
    error.value = err.data?.message || 'Ошибка загрузки лидов'
  } finally {
    loading.value = false
  }
}

const formatPhone = (phone: string) => {
  // Форматируем: 79001234567 → +7 (900) 123-45-67
  if (phone.length === 11 && phone.startsWith('7')) {
    return `+7 (${phone.slice(1, 4)}) ${phone.slice(4, 7)}-${phone.slice(7, 9)}-${phone.slice(9)}`
  }
  return `+${phone}`
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(() => {
  fetchLeads()
})
</script>
