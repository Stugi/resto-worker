<template>
  <div
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    @click.self="$emit('close')"
  >
    <div class="bg-bg-card rounded-lg w-full max-w-md max-h-[90vh] flex flex-col">
      <!-- Header -->
      <div class="sticky top-0 bg-bg-card border-b border-border px-6 py-4">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-semibold text-text">
            {{ isEdit ? 'Редактировать ресторан' : 'Создать ресторан' }}
          </h2>
          <button
            @click="$emit('close')"
            class="text-muted hover:text-text-secondary transition-colors"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleSubmit" class="p-6 space-y-4 overflow-y-auto flex-1">
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
          <div class="border-t border-border pt-4">
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
                      ? 'bg-action text-action-text border-accent'
                      : 'bg-bg-card text-text-secondary border-border-input hover:border-accent/50'
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

        <!-- Telegram группа -->
        <div v-if="isEdit" class="border-t border-border pt-4 space-y-3">
          <h3 class="text-sm font-medium text-text">Telegram группа</h3>

          <!-- Группа привязана -->
          <div v-if="telegramChatId" class="space-y-2">
            <div class="flex items-center gap-2 text-sm">
              <span class="text-accent">✅</span>
              <span class="text-text font-medium">{{ chatTitle || 'Группа' }}</span>
            </div>
            <div class="text-xs text-text-secondary">
              Chat ID: <code class="bg-bg-secondary px-1 rounded">{{ telegramChatId }}</code>
            </div>
            <div v-if="groupInviteLink" class="text-xs">
              <a :href="groupInviteLink" target="_blank" class="text-accent hover:underline">
                🔗 Invite-ссылка
              </a>
            </div>
            <div class="flex gap-2 pt-1">
              <button
                type="button"
                @click="unlinkGroup"
                class="text-xs px-3 py-1.5 rounded-lg border border-border text-text-secondary hover:text-status-red-text hover:border-status-red-border transition-colors"
              >
                Отвязать группу
              </button>
            </div>
          </div>

          <!-- Группа НЕ привязана -->
          <div v-else class="space-y-3">
            <div class="flex items-center gap-2 text-sm text-text-secondary">
              <span>⚠️</span>
              <span>Группа не привязана</span>
            </div>

            <!-- Ручная привязка -->
            <div class="flex gap-2">
              <input
                v-model="manualChatId"
                type="text"
                placeholder="Chat ID (напр. -1001234567890)"
                class="flex-1 px-3 py-1.5 text-sm border border-border-input rounded-lg focus:border-accent focus:shadow-[0_0_0_2px_var(--accent-ring)] transition-all outline-none"
              />
              <button
                type="button"
                @click="linkGroup"
                :disabled="!manualChatId.trim() || linkGroupLoading"
                class="text-xs px-3 py-1.5 rounded-lg bg-accent text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
              >
                {{ linkGroupLoading ? '...' : 'Привязать' }}
              </button>
            </div>

            <!-- Авто-создание -->
            <button
              type="button"
              @click="createGroup"
              :disabled="createGroupLoading"
              class="w-full text-sm px-4 py-2 rounded-lg border border-accent text-accent hover:bg-accent-light transition-colors disabled:opacity-50"
            >
              {{ createGroupLoading ? 'Создание группы...' : '🤖 Создать группу автоматически' }}
            </button>

            <div v-if="groupMessage" class="text-xs" :class="groupMessageIsError ? 'text-status-red-text' : 'text-accent'">
              {{ groupMessage }}
            </div>
          </div>
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
            class="w-full px-4 py-2 border border-border-input rounded-lg focus:border-accent focus:shadow-[0_0_0_2px_var(--accent-ring)] transition-all font-mono text-xs outline-none"
            placeholder="JSON настроек..."
          ></textarea>
        </div>

        <!-- Error -->
        <div v-if="error" class="bg-status-red-bg border border-status-red-border text-status-red-text px-4 py-3 rounded text-sm">
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
const groupInviteLink = computed(() => parsedSettings.value?.inviteLink || '')

// --- Telegram группа ---
const manualChatId = ref('')
const createGroupLoading = ref(false)
const linkGroupLoading = ref(false)
const groupMessage = ref('')
const groupMessageIsError = ref(false)

async function createGroup() {
  if (!props.restaurant) return
  createGroupLoading.value = true
  groupMessage.value = ''

  try {
    const result = await $fetch(`/api/restaurants/${props.restaurant.id}/create-group`, {
      method: 'POST'
    }) as any

    groupMessage.value = result.ownerAdded
      ? `Группа "${result.chatTitle}" создана, владелец добавлен`
      : `Группа "${result.chatTitle}" создана${result.inviteLink ? '. Invite: ' + result.inviteLink : ''}`
    groupMessageIsError.value = false
    emit('saved')
  } catch (err: any) {
    groupMessage.value = err.data?.message || err.message || 'Ошибка создания группы'
    groupMessageIsError.value = true
  } finally {
    createGroupLoading.value = false
  }
}

async function linkGroup() {
  if (!props.restaurant || !manualChatId.value.trim()) return
  linkGroupLoading.value = true
  groupMessage.value = ''

  try {
    // Мержим chatId в settingsComment
    let settings: Record<string, any> = {}
    if (props.restaurant.settingsComment) {
      try { settings = JSON.parse(props.restaurant.settingsComment) } catch { }
    }
    settings.telegramChatId = manualChatId.value.trim()
    settings.chatTitle = `Группа ${manualChatId.value.trim()}`
    settings.createdByUserbot = false

    await $fetch(`/api/restaurants/${props.restaurant.id}`, {
      method: 'PATCH',
      body: {
        name: form.name || props.restaurant.name,
        settingsComment: JSON.stringify(settings)
      }
    })

    groupMessage.value = 'Группа привязана'
    groupMessageIsError.value = false
    manualChatId.value = ''
    emit('saved')
  } catch (err: any) {
    groupMessage.value = err.data?.message || err.message || 'Ошибка привязки'
    groupMessageIsError.value = true
  } finally {
    linkGroupLoading.value = false
  }
}

async function unlinkGroup() {
  if (!props.restaurant) return
  if (!confirm('Отвязать группу от ресторана?')) return

  try {
    let settings: Record<string, any> = {}
    if (props.restaurant.settingsComment) {
      try { settings = JSON.parse(props.restaurant.settingsComment) } catch { }
    }
    delete settings.telegramChatId
    delete settings.chatTitle
    delete settings.inviteLink
    delete settings.createdByUserbot

    await $fetch(`/api/restaurants/${props.restaurant.id}`, {
      method: 'PATCH',
      body: {
        name: form.name || props.restaurant.name,
        settingsComment: Object.keys(settings).length ? JSON.stringify(settings) : null
      }
    })

    emit('saved')
  } catch (err: any) {
    error.value = err.data?.message || err.message || 'Ошибка'
  }
}

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

const timeOptions = Array.from({ length: 24 }, (_, i) => {
  const h = i.toString().padStart(2, '0')
  return { value: `${h}:00`, label: `${h}:00` }
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
