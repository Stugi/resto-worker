<template>
  <div>
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl md:text-3xl font-bold text-text mb-2">
          Транскрипции
        </h1>
        <p class="text-text-secondary">
          Расшифровки голосовых отчётов менеджеров
        </p>
      </div>

      <!-- Фильтры -->
      <div class="flex gap-3 items-center flex-wrap">
        <select
          v-model="selectedRestaurant"
          class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-action/20 focus:border-action outline-none"
        >
          <option value="">Все рестораны</option>
          <option v-for="r in restaurants" :key="r.id" :value="r.id">
            {{ r.name }}
          </option>
        </select>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-action"></div>
    </div>

    <!-- Transcripts List -->
    <div v-else-if="transcripts.length > 0" class="space-y-4">
      <div
        v-for="t in transcripts"
        :key="t.id"
        class="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-sm transition-shadow"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1 min-w-0">
            <!-- Мета-данные -->
            <div class="flex items-center gap-3 mb-2 flex-wrap text-sm">
              <span class="text-text-secondary">
                {{ formatDate(t.createdAt) }}
              </span>
              <span v-if="t.restaurant" class="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                {{ t.restaurant.name }}
              </span>
              <span v-if="t.user" class="text-text-secondary">
                {{ t.user.name || 'Без имени' }}
              </span>
              <span v-if="t.voiceMessage" class="text-text-secondary">
                {{ t.voiceMessage.duration }}с
              </span>
            </div>

            <!-- Текст транскрипции -->
            <p class="text-text text-sm leading-relaxed whitespace-pre-wrap">
              {{ expanded[t.id] ? t.text : truncate(t.text, 300) }}
            </p>

            <!-- Кнопка "Показать полностью" -->
            <button
              v-if="t.text.length > 300"
              @click="toggleExpand(t.id)"
              class="text-action text-sm font-medium mt-2 hover:underline"
            >
              {{ expanded[t.id] ? 'Свернуть' : 'Показать полностью' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Load More -->
      <div v-if="transcripts.length >= limit" class="text-center py-4">
        <button
          @click="loadMore"
          class="px-6 py-2 text-sm font-medium text-action border border-action rounded-lg hover:bg-action/5 transition-colors"
        >
          Загрузить ещё
        </button>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="bg-white rounded-lg border border-gray-200 p-12 text-center">
      <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      </div>
      <h3 class="text-lg font-medium text-text mb-2">Нет транскрипций</h3>
      <p class="text-text-secondary">
        Отправьте голосовое сообщение в группу ресторана — бот автоматически его расшифрует
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default'
})

interface TranscriptItem {
  id: string
  text: string
  language: string | null
  createdAt: string
  restaurant: { id: string; name: string } | null
  user: { id: string; name: string } | null
  voiceMessage: { id: string; duration: number; status: string } | null
}

const loading = ref(true)
const transcripts = ref<TranscriptItem[]>([])
const restaurants = ref<{ id: string; name: string }[]>([])
const selectedRestaurant = ref('')
const expanded = ref<Record<string, boolean>>({})
const limit = ref(50)

const fetchTranscripts = async () => {
  loading.value = true
  try {
    const params: any = { limit: limit.value }
    if (selectedRestaurant.value) params.restaurantId = selectedRestaurant.value

    const data = await $fetch('/api/transcripts', { params })
    transcripts.value = data as TranscriptItem[]
  } catch (error) {
    console.error('Error fetching transcripts:', error)
  } finally {
    loading.value = false
  }
}

const fetchRestaurants = async () => {
  try {
    const data = await $fetch('/api/restaurants')
    restaurants.value = (data as any[]).map(r => ({ id: r.id, name: r.name }))
  } catch (e) { /* ignore */ }
}

const toggleExpand = (id: string) => {
  expanded.value[id] = !expanded.value[id]
}

const truncate = (text: string, max: number) => {
  if (text.length <= max) return text
  return text.substring(0, max) + '...'
}

const formatDate = (date: string) => {
  const d = new Date(date)
  return d.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const loadMore = () => {
  limit.value += 50
  fetchTranscripts()
}

watch(selectedRestaurant, () => {
  fetchTranscripts()
})

onMounted(() => {
  fetchRestaurants()
  fetchTranscripts()
})
</script>
