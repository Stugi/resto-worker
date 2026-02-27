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
                Организация
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Ресторанов
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Этап
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
                {{ lead.phone ? formatPhone(lead.phone) : '—' }}
              </td>
              <td class="px-4 py-3 text-sm text-text">
                {{ lead.name || '—' }}
              </td>
              <td class="px-4 py-3 text-sm text-text-secondary">
                <template v-if="lead.username">@{{ lead.username }}</template>
                <template v-else>—</template>
              </td>
              <td class="px-4 py-3 text-sm text-text">
                {{ lead.orgName || '—' }}
              </td>
              <td class="px-4 py-3 text-sm text-text-secondary">
                {{ formatScale(lead.scale) }}
              </td>
              <td class="px-4 py-3 text-sm">
                <span
                  :class="[
                    'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                    botStateStyle(lead.botState)
                  ]"
                >
                  {{ formatBotState(lead.botState) }}
                </span>
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
            {{ lead.phone ? formatPhone(lead.phone) : lead.name || 'Без телефона' }}
          </span>
          <div class="flex gap-1.5">
            <span
              :class="[
                'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                botStateStyle(lead.botState)
              ]"
            >
              {{ formatBotState(lead.botState) }}
            </span>
            <span
              v-if="lead.converted"
              class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-status-emerald-bg text-status-emerald-text"
            >
              Конв.
            </span>
          </div>
        </div>
        <div class="text-sm text-text-secondary space-y-1">
          <div v-if="lead.name && lead.phone">{{ lead.name }}</div>
          <div v-if="lead.username">@{{ lead.username }}</div>
          <div v-if="lead.orgName" class="text-text">{{ lead.orgName }} <span v-if="lead.scale" class="text-text-secondary">({{ formatScale(lead.scale) }})</span></div>
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
  phone: string | null
  name: string | null
  username: string | null
  orgName: string | null
  scale: string | null
  botState: string | null
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

const scaleLabels: Record<string, string> = {
  '1': '1',
  '10': '2–10',
  '11': '11+'
}

const formatScale = (scale: string | null) => {
  if (!scale) return '—'
  return scaleLabels[scale] || scale
}

const botStateLabels: Record<string, string> = {
  WAITING_START: 'Старт',
  WAITING_CONTACT: 'Контакт',
  WAITING_NAME: 'Название',
  WAITING_SCALE: 'Масштаб',
  WAITING_CONFIRM: 'Подтверждение',
  COMPLETED: 'Завершён'
}

const formatBotState = (state: string | null) => {
  if (!state) return '—'
  return botStateLabels[state] || state
}

const botStateStyle = (state: string | null) => {
  if (state === 'COMPLETED') return 'bg-status-emerald-bg text-status-emerald-text'
  if (state === 'WAITING_CONFIRM') return 'bg-status-blue-bg text-status-blue-text'
  if (state) return 'bg-status-amber-bg text-status-amber-text'
  return 'bg-bg-secondary text-text-secondary'
}

onMounted(() => {
  fetchLeads()
})
</script>
