<template>
  <div>
    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <BaseSpinner size="lg" />
    </div>

    <!-- Report Content -->
    <div v-else-if="report">
      <!-- Header -->
      <div class="mb-6">
        <NuxtLink to="/reports" class="text-sm text-accent hover:underline mb-3 inline-block">
          &larr; Назад к отчётам
        </NuxtLink>

        <div class="flex items-start justify-between gap-4">
          <div>
            <h1 class="text-2xl md:text-3xl font-bold text-text mb-2">
              {{ report.title }}
            </h1>
            <div class="flex items-center gap-3 text-sm text-text-secondary flex-wrap">
              <span v-if="report.restaurant">{{ report.restaurant.name }}</span>
              <span>{{ formatDate(report.createdAt) }}</span>
              <span
                :class="[
                  'px-2 py-0.5 rounded-full text-xs font-medium',
                  report.status === 'COMPLETED' ? 'bg-status-green-bg text-status-green-text' : 'bg-status-red-bg text-status-red-text'
                ]"
              >
                {{ report.status === 'COMPLETED' ? 'Готов' : report.status }}
              </span>
              <span v-if="report.model" class="text-xs">{{ report.model }}</span>
              <span v-if="report.tokensUsed" class="text-xs">{{ report.tokensUsed }} токенов</span>
            </div>
          </div>

          <!-- Отправить в группу -->
          <button
            v-if="report.status === 'COMPLETED'"
            @click="sendToGroup"
            :disabled="sending"
            class="flex items-center gap-2 px-4 py-2 bg-action text-action-text rounded-lg hover:bg-action-hover transition-colors text-sm font-medium disabled:opacity-50 shrink-0"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
            <span v-if="sending">Отправка...</span>
            <span v-else>В группу</span>
          </button>
        </div>

        <!-- Уведомления -->
        <div v-if="sendSuccess" class="mt-3 px-4 py-2 bg-status-green-bg border border-status-green-border text-status-green-text text-sm rounded-lg">
          Отчёт отправлен в Telegram-группу
        </div>
        <div v-if="sendError" class="mt-3 px-4 py-2 bg-status-red-bg border border-status-red-border text-status-red-text text-sm rounded-lg">
          {{ sendError }}
        </div>
      </div>

      <!-- Summary -->
      <div v-if="report.summary" class="bg-status-blue-bg border border-status-blue-border rounded-lg p-5 mb-6">
        <h3 class="text-sm font-semibold text-status-blue-text mb-2">Краткая выжимка</h3>
        <p class="text-sm text-status-blue-text">{{ report.summary }}</p>
      </div>

      <!-- Report Content (Markdown) -->
      <div class="bg-bg-card rounded-lg border border-border p-6 mb-6">
        <div
          class="prose prose-sm max-w-none text-text"
          v-html="renderMarkdown(report.content)"
        />
      </div>

      <!-- Transcripts Used -->
      <div v-if="report.transcripts && report.transcripts.length > 0" class="bg-bg-card rounded-lg border border-border p-6">
        <h3 class="text-lg font-semibold text-text mb-4">
          Использованные транскрипции ({{ report.transcripts.length }})
        </h3>
        <div class="space-y-3">
          <div
            v-for="rt in report.transcripts"
            :key="rt.id"
            class="border-l-2 border-border pl-4 py-2"
          >
            <div class="flex items-center gap-2 text-sm text-text-secondary mb-1">
              <span>{{ formatDate(rt.transcript.createdAt) }}</span>
              <span v-if="rt.transcript.user">{{ rt.transcript.user.name }}</span>
              <span v-if="rt.transcript.voiceMessage">{{ rt.transcript.voiceMessage.duration }}с</span>
            </div>
            <p class="text-sm text-text line-clamp-3">{{ rt.transcript.text }}</p>
          </div>
        </div>
      </div>

      <!-- Error -->
      <div v-if="report.error" class="bg-status-red-bg border border-status-red-border rounded-lg p-5 mt-6">
        <h3 class="text-sm font-semibold text-status-red-text mb-2">Ошибка генерации</h3>
        <p class="text-sm text-status-red-text">{{ report.error }}</p>
      </div>
    </div>

    <!-- Not Found -->
    <div v-else class="text-center py-12">
      <p class="text-text-secondary">Отчёт не найден</p>
      <NuxtLink to="/reports" class="text-accent hover:underline text-sm mt-2 inline-block">
        Вернуться к списку
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default'
})

const route = useRoute()
const loading = ref(true)
const report = ref<any>(null)
const sending = ref(false)
const sendSuccess = ref(false)
const sendError = ref('')

const sendToGroup = async () => {
  sending.value = true
  sendSuccess.value = false
  sendError.value = ''
  try {
    await $fetch(`/api/reports/${route.params.id}/send-to-group`, { method: 'POST' })
    sendSuccess.value = true
    setTimeout(() => { sendSuccess.value = false }, 5000)
  } catch (err: any) {
    sendError.value = err.data?.message || err.message || 'Ошибка отправки'
  } finally {
    sending.value = false
  }
}

const fetchReport = async () => {
  loading.value = true
  try {
    const data = await $fetch(`/api/reports/${route.params.id}`)
    report.value = data
  } catch (error) {
    console.error('Error fetching report:', error)
  } finally {
    loading.value = false
  }
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Простой рендер Markdown → HTML
const renderMarkdown = (md: string) => {
  if (!md) return ''
  return md
    // Заголовки
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold mt-4 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold mt-6 mb-3">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-6 mb-3">$1</h1>')
    // Жирный
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Курсив
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Списки
    .replace(/^- (.+)$/gm, '<li class="ml-4">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4"><span class="font-medium">$1.</span> $2</li>')
    // Разделители
    .replace(/^---$/gm, '<hr class="my-4 border-border" />')
    // Абзацы (двойной перенос)
    .replace(/\n\n/g, '</p><p class="mb-3">')
    // Одинарный перенос
    .replace(/\n/g, '<br />')
}

onMounted(() => {
  fetchReport()
})
</script>
