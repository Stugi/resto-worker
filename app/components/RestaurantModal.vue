<template>
  <div
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    @click.self="$emit('close')"
  >
    <div class="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
      <!-- Header -->
      <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-semibold text-text">
            {{ isEdit ? 'Редактировать ресторан' : 'Создать ресторан' }}
          </h2>
          <button
            @click="$emit('close')"
            class="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleSubmit" class="p-6 space-y-4">
        <!-- Организация (только для SUPER_ADMIN при создании) -->
        <BaseSelect
          v-if="isSuperAdmin && !isEdit"
          id="organizationId"
          v-model="form.organizationId"
          :options="[{ value: '', label: 'Выберите организацию' }, ...organizations.map(o => ({ value: o.id, label: o.name }))]"
          label="Организация"
          placeholder="Выберите организацию"
          required
        />

        <!-- Название -->
        <BaseInput
          id="name"
          v-model="form.name"
          label="Название ресторана"
          placeholder="Название"
          required
        />

        <!-- Расписание отчётов (только при редактировании) -->
        <div v-if="isEdit && hasSettings" class="space-y-3">
          <div class="border-t border-gray-200 pt-4">
            <h3 class="text-sm font-medium text-text mb-3">Расписание отчётов</h3>

            <!-- Дни недели -->
            <div class="mb-3">
              <label class="block text-xs text-text-secondary mb-2">Дни отправки</label>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="day in weekDays"
                  :key="day.value"
                  type="button"
                  @click="toggleDay(day.value)"
                  :class="[
                    'px-3 py-1.5 text-sm rounded-lg border transition-colors',
                    schedule.days.includes(day.value)
                      ? 'bg-action text-white border-action'
                      : 'bg-white text-text-secondary border-gray-300 hover:border-action/50'
                  ]"
                >
                  {{ day.label }}
                </button>
              </div>
            </div>

            <!-- Время -->
            <BaseSelect
              v-model="schedule.time"
              :options="timeOptions"
              label="Время отправки (МСК)"
              placeholder="Выберите время"
            />
          </div>
        </div>

        <!-- Telegram Chat ID (readonly info) -->
        <div v-if="isEdit && telegramChatId" class="text-sm text-text-secondary">
          <span class="font-medium text-text">Telegram группа:</span>
          {{ chatTitle || `ID: ${telegramChatId}` }}
        </div>

        <!-- Комментарий настроек (для SUPER_ADMIN — raw JSON) -->
        <div v-if="isSuperAdmin">
          <label for="settingsComment" class="block text-sm font-medium text-text mb-2">
            Настройки (JSON)
          </label>
          <textarea
            id="settingsComment"
            v-model="form.settingsComment"
            rows="4"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-action focus:border-transparent transition-all font-mono text-xs"
            placeholder="JSON настроек..."
          ></textarea>
        </div>

        <!-- Error -->
        <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
          {{ error }}
        </div>

        <!-- Actions -->
        <div class="flex gap-3 pt-4">
          <BaseButton
            type="button"
            @click="$emit('close')"
            variant="secondary"
            full-width
          >
            Отмена
          </BaseButton>
          <BaseButton
            type="submit"
            :loading="loading"
            :loading-text="isEdit ? 'Сохранение...' : 'Создание...'"
            variant="primary"
            full-width
          >
            {{ isEdit ? 'Сохранить' : 'Создать' }}
          </BaseButton>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  restaurant?: {
    id: string
    name: string
    settingsComment?: string | null
  } | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'close': []
  'saved': []
}>()

const { user } = useAuth()
const isSuperAdmin = computed(() => user.value?.role === 'SUPER_ADMIN')
const isEdit = computed(() => !!props.restaurant)

// --- Парсинг settingsComment ---
const parsedSettings = computed(() => {
  if (!props.restaurant?.settingsComment) return null
  try {
    return JSON.parse(props.restaurant.settingsComment)
  } catch {
    return null
  }
})

const hasSettings = computed(() => !!parsedSettings.value)
const telegramChatId = computed(() => parsedSettings.value?.telegramChatId || '')
const chatTitle = computed(() => parsedSettings.value?.chatTitle || '')

// --- Расписание ---
const weekDays = [
  { value: 1, label: 'Пн' },
  { value: 2, label: 'Вт' },
  { value: 3, label: 'Ср' },
  { value: 4, label: 'Чт' },
  { value: 5, label: 'Пт' },
  { value: 6, label: 'Сб' },
  { value: 7, label: 'Вс' },
]

const timeOptions = Array.from({ length: 24 * 6 }, (_, i) => {
  const h = Math.floor(i / 6).toString().padStart(2, '0')
  const m = (i % 6 * 10).toString().padStart(2, '0')
  return { value: `${h}:${m}`, label: `${h}:${m}` }
})

const schedule = reactive({
  days: [...(parsedSettings.value?.reportSchedule?.days || [])],
  time: parsedSettings.value?.reportSchedule?.time || '17:00'
})

function toggleDay(day: number) {
  const idx = schedule.days.indexOf(day)
  if (idx >= 0) {
    schedule.days.splice(idx, 1)
  } else {
    schedule.days.push(day)
    schedule.days.sort((a, b) => a - b)
  }
}

// --- Форма ---
const form = reactive({
  name: props.restaurant?.name || '',
  settingsComment: props.restaurant?.settingsComment || '',
  organizationId: ''
})

const loading = ref(false)
const error = ref('')
const organizations = ref<Array<{ id: string; name: string }>>([])

// Загрузка организаций для SUPER_ADMIN
const fetchOrganizations = async () => {
  if (!isSuperAdmin.value || isEdit.value) return

  try {
    const data = await $fetch('/api/organizations')
    organizations.value = data as Array<{ id: string; name: string }>
  } catch (err) {
    console.error('Error fetching organizations:', err)
  }
}

// Загружаем организации при монтировании
onMounted(() => {
  fetchOrganizations()
})

// Собираем settingsComment перед отправкой
function buildSettingsComment(): string | null {
  // Если есть parsed settings — мержим расписание
  if (parsedSettings.value && isEdit.value) {
    const settings = { ...parsedSettings.value }
    settings.reportSchedule = {
      days: [...schedule.days],
      time: schedule.time
    }
    return JSON.stringify(settings)
  }

  // Для SUPER_ADMIN — берём raw из textarea
  if (isSuperAdmin.value && form.settingsComment) {
    return form.settingsComment
  }

  return form.settingsComment || null
}

const handleSubmit = async () => {
  loading.value = true
  error.value = ''

  try {
    const settingsComment = buildSettingsComment()

    if (isEdit.value) {
      // Обновление
      await $fetch(`/api/restaurants/${props.restaurant!.id}`, {
        method: 'PATCH',
        body: {
          name: form.name,
          settingsComment
        }
      })
    } else {
      // Создание
      const body: any = {
        name: form.name,
        settingsComment: form.settingsComment || null
      }

      // Для SUPER_ADMIN добавляем organizationId
      if (isSuperAdmin.value) {
        body.organizationId = form.organizationId
      }

      await $fetch('/api/restaurants', {
        method: 'POST',
        body
      })
    }

    emit('saved')
  } catch (err: any) {
    error.value = err.data?.message || err.message || 'Произошла ошибка'
    loading.value = false
  }
}
</script>
