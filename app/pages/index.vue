<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl md:text-3xl font-bold text-text mb-2">
        Главная
      </h1>
      <p class="text-text-secondary">
        Добро пожаловать в RESTO Worker
      </p>
    </div>

    <!-- Role-based stub content -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 md:p-8">
      <ClientOnly>
        <div class="flex flex-col items-center justify-center py-12 md:py-16 text-center">
          <!-- Icon -->
          <div class="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-r from-action to-emerald-400 rounded-full flex items-center justify-center mb-4">
            <svg class="w-8 h-8 md:w-10 md:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>

          <!-- Message -->
          <h2 class="text-xl md:text-2xl font-bold text-text mb-2">
            {{ roleMessage }}
          </h2>
          <p class="text-text-secondary max-w-md">
            Контент в разработке
          </p>

          <!-- User Info Card -->
          <div class="mt-8 p-4 md:p-6 bg-gray-50 rounded-lg border border-gray-200 max-w-md w-full">
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-sm text-text-secondary">Имя:</span>
                <span class="text-sm font-medium text-text">{{ user?.name }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-sm text-text-secondary">Роль:</span>
                <span class="text-sm font-medium text-action">{{ roleLabel }}</span>
              </div>
              <div v-if="user?.organizationId" class="flex items-center justify-between">
                <span class="text-sm text-text-secondary">Организация:</span>
                <span class="text-sm font-medium text-text">{{ organizationName }}</span>
              </div>
              <div v-if="user?.restaurantId" class="flex items-center justify-between">
                <span class="text-sm text-text-secondary">Ресторан:</span>
                <span class="text-sm font-medium text-text">{{ restaurantName }}</span>
              </div>
            </div>
          </div>
        </div>
      </ClientOnly>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default'
})

const { user } = useAuth()

const roleLabels = {
  SUPER_ADMIN: 'Супер Администратор',
  OWNER: 'Владелец',
  MANAGER: 'Менеджер'
}

const roleLabel = computed(() => {
  return user.value?.role ? roleLabels[user.value.role as keyof typeof roleLabels] : ''
})

const roleMessage = computed(() => {
  const role = user.value?.role
  if (role === 'SUPER_ADMIN') return 'Вы SUPER_ADMIN'
  if (role === 'OWNER') return 'Вы OWNER'
  if (role === 'MANAGER') return 'Вы MANAGER'
  return 'Добро пожаловать!'
})

const organizationName = computed(() => {
  return user.value?.organization?.name || 'Не указана'
})

const restaurantName = computed(() => {
  return user.value?.restaurant?.name || 'Не указан'
})
</script>
