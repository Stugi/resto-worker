<template>
  <header class="bg-white border-b border-gray-200 px-6 py-4">
    <div class="flex items-center justify-between">
      <!-- Logo and Title -->
      <div class="flex items-center gap-4">
        <button
          @click="$emit('toggle-sidebar')"
          class="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-gradient-to-br from-action to-emerald-400 rounded-2xl flex items-center justify-center shadow-lg shadow-action/20">
            <span class="text-2xl">🍽️</span>
          </div>
          <h1 class="text-xl md:text-2xl font-semibold tracking-tight text-text">
            RESTO <span class="text-action">WORKER</span>
          </h1>
        </div>
      </div>

      <!-- User Info and Actions -->
      <div class="flex items-center gap-4">
        <!-- User Info -->
        <div class="hidden md:flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-lg">
          <div class="w-8 h-8 bg-gradient-to-r from-action to-emerald-400 rounded-full flex items-center justify-center text-white font-semibold">
            {{ userInitials }}
          </div>
          <div class="text-sm">
            <p class="font-medium text-text">{{ user?.name || 'Пользователь' }}</p>
            <p class="text-text-secondary text-xs">{{ roleLabel }}</p>
          </div>
        </div>

        <!-- Logout Button -->
        <button
          @click="handleLogout"
          class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-text-secondary hover:text-text hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span class="hidden sm:inline">Выход</span>
        </button>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
defineEmits<{
  'toggle-sidebar': []
}>()

const { user, logout } = useAuth()

const userInitials = computed(() => {
  if (!user.value?.name) return 'U'
  const parts = user.value.name.split(' ')
  return parts.map(p => p[0]).join('').substring(0, 2).toUpperCase()
})

const roleLabel = computed(() => {
  const roleLabels = {
    SUPER_ADMIN: 'Супер Админ',
    OWNER: 'Владелец',
    MANAGER: 'Менеджер'
  }
  return user.value?.role ? roleLabels[user.value.role as keyof typeof roleLabels] : ''
})

const handleLogout = async () => {
  await logout()
}
</script>
