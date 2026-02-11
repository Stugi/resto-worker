<template>
  <!-- Mobile Overlay -->
  <div
    v-if="isOpen"
    @click="$emit('close')"
    class="fixed inset-0 bg-black/50 z-40 lg:hidden"
  />

  <!-- Sidebar -->
  <aside
    :class="[
      'fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out',
      isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
    ]"
  >
    <div class="flex flex-col h-full">
      <!-- Mobile Close Button -->
      <div class="lg:hidden flex items-center justify-between p-4 border-b border-gray-200">
        <span class="font-bold text-text">Меню</span>
        <button
          @click="$emit('close')"
          class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 overflow-y-auto p-4">
        <!-- Основное -->
        <div class="mb-6">
          <h3 class="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3 px-3">
            Основное
          </h3>
          <div class="space-y-1">
            <NuxtLink
              v-for="item in mainNavigation"
              :key="item.path"
              :to="item.path"
              @click="$emit('close')"
              :class="[
                'block px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive(item.path)
                  ? 'bg-gray-100 text-text'
                  : 'text-text-secondary hover:bg-gray-50 hover:text-text'
              ]"
            >
              {{ item.label }}
            </NuxtLink>
          </div>
        </div>

        <!-- Настройки -->
        <div v-if="settingsNavigation.length > 0">
          <h3 class="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3 px-3">
            Настройки
          </h3>
          <div class="space-y-1">
            <NuxtLink
              v-for="item in settingsNavigation"
              :key="item.path"
              :to="item.path"
              @click="$emit('close')"
              :class="[
                'block px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive(item.path)
                  ? 'bg-gray-100 text-text'
                  : 'text-text-secondary hover:bg-gray-50 hover:text-text'
              ]"
            >
              {{ item.label }}
            </NuxtLink>
          </div>
        </div>
      </nav>

      <!-- Footer Info (только на десктопе) -->
      <div class="hidden lg:block p-4 border-t border-gray-200">
        <div class="text-xs text-text-secondary">
          <p class="font-medium">RESTO WORKER</p>
          <p>© 2026 Все права защищены</p>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
interface Props {
  isOpen: boolean
}

defineProps<Props>()

defineEmits<{
  'close': []
}>()

const route = useRoute()
const { user } = useAuth()

// Navigation items based on role - Основное
const mainNavigation = computed(() => {
  const role = user.value?.role

  const baseItems = [
    { path: '/', label: 'Главная' }
  ]

  if (role === 'SUPER_ADMIN') {
    return [
      ...baseItems,
      { path: '/organizations', label: 'Организации' },
      { path: '/users', label: 'Пользователи' }
    ]
  }

  if (role === 'OWNER') {
    return [
      ...baseItems,
      { path: '/restaurants', label: 'Рестораны' },
      { path: '/users', label: 'Пользователи' },
      { path: '/analytics', label: 'Аналитика' }
    ]
  }

  if (role === 'MANAGER') {
    return [
      ...baseItems,
      { path: '/stats', label: 'Статистика' }
    ]
  }

  return baseItems
})

// Settings navigation - Настройки
const settingsNavigation = computed(() => {
  const role = user.value?.role

  const baseSettings = [
    { path: '/settings/profile', label: 'Профиль' }
  ]

  if (role === 'SUPER_ADMIN') {
    return [
      ...baseSettings,
      { path: '/settings/system', label: 'Система' }
    ]
  }

  if (role === 'OWNER') {
    return [
      ...baseSettings,
      { path: '/settings/organization', label: 'Организация' }
    ]
  }

  return baseSettings
})

const isActive = (path: string) => {
  if (path === '/') {
    return route.path === '/'
  }
  return route.path.startsWith(path)
}
</script>
