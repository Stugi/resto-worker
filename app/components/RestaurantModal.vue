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
        <div v-if="isSuperAdmin && !isEdit">
          <label for="organizationId" class="block text-sm font-medium text-text mb-2">
            Организация <span class="text-red-500">*</span>
          </label>
          <select
            id="organizationId"
            v-model="form.organizationId"
            required
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-action focus:border-transparent transition-all"
          >
            <option value="">Выберите организацию</option>
            <option v-for="org in organizations" :key="org.id" :value="org.id">
              {{ org.name }}
            </option>
          </select>
        </div>

        <!-- Название -->
        <BaseInput
          id="name"
          v-model="form.name"
          label="Название ресторана"
          placeholder="Название"
          required
        />

        <!-- Комментарий настроек -->
        <div>
          <label for="settingsComment" class="block text-sm font-medium text-text mb-2">
            Комментарий к настройкам
          </label>
          <textarea
            id="settingsComment"
            v-model="form.settingsComment"
            rows="4"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-action focus:border-transparent transition-all"
            placeholder="Дополнительная информация или настройки..."
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

const handleSubmit = async () => {
  loading.value = true
  error.value = ''

  try {
    if (isEdit.value) {
      // Обновление
      await $fetch(`/api/restaurants/${props.restaurant!.id}`, {
        method: 'PATCH',
        body: {
          name: form.name,
          settingsComment: form.settingsComment || null
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
