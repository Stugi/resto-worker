<template>
  <div>
    <h2 class="text-2xl font-semibold text-text mb-2 text-center">
      Вход в систему
    </h2>
    <p class="text-text-secondary text-center mb-8">
      Выберите способ входа
    </p>

    <!-- Error Message -->
    <div
      v-if="error"
      class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6"
      role="alert"
    >
      <p class="text-sm">{{ error }}</p>
    </div>

    <!-- Auth Method Tabs -->
    <div class="flex border-b border-gray-200 mb-6">
      <button
        @click="authMethod = 'login'"
        :class="[
          'flex-1 py-3 px-4 text-sm font-medium transition-colors',
          authMethod === 'login'
            ? 'border-b-2 border-action text-action'
            : 'text-text-secondary hover:text-text'
        ]"
      >
        Логин / Пароль
      </button>
      <button
        @click="authMethod = 'telegram'"
        :class="[
          'flex-1 py-3 px-4 text-sm font-medium transition-colors',
          authMethod === 'telegram'
            ? 'border-b-2 border-action text-action'
            : 'text-text-secondary hover:text-text'
        ]"
      >
        Telegram
      </button>
    </div>

    <!-- Login/Password Form -->
    <form v-if="authMethod === 'login'" @submit.prevent="handleLoginSubmit" class="space-y-4">
      <BaseInput
        id="login"
        v-model="login"
        type="text"
        label="Логин"
        placeholder="Ваш логин"
        required
      />

      <BaseInput
        id="password"
        v-model="password"
        type="password"
        label="Пароль"
        placeholder="••••••••"
        required
      />

      <BaseButton
        type="submit"
        :loading="loading"
        loading-text="Вход..."
        gradient
        full-width
        size="lg"
      >
        Войти
      </BaseButton>

      <p class="text-center text-sm text-text-secondary">
        Нет аккаунта?
        <NuxtLink to="/auth/register" class="text-action hover:underline">
          Зарегистрироваться
        </NuxtLink>
      </p>
    </form>

    <!-- Telegram Login -->
    <div v-else>
      <!-- Loading State -->
      <div v-if="loading" class="text-center py-8">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-action"></div>
        <p class="text-text-secondary mt-4">Авторизация...</p>
      </div>

      <!-- Telegram Login Widget Container -->
      <div v-else class="flex justify-center">
        <div id="telegram-login-widget"></div>
      </div>

      <p class="text-text-secondary text-xs text-center mt-8">
        Для входа необходим аккаунт Telegram
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'auth'
})

const authMethod = ref<'login' | 'telegram'>('login')
const loading = ref(false)
const error = ref('')

// Login/Password form
const login = ref('')
const password = ref('')

// Telegram Bot Username
const TELEGRAM_BOT_USERNAME = 'resto_worker_bot'

// Login Handler
const handleLoginSubmit = async () => {
  loading.value = true
  error.value = ''

  try {
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: {
        login: login.value,
        password: password.value
      }
    })

    // Успешная авторизация - редирект на dashboard
    await navigateTo('/', { replace: true })
  } catch (err: any) {
    console.error('Login error:', err)
    error.value = err.data?.message || err.message || 'Ошибка входа'
    loading.value = false
  }
}

// Callback для Telegram Login Widget
const handleTelegramAuth = async (user: any) => {
  loading.value = true
  error.value = ''

  try {
    const response = await $fetch('/api/auth/telegram', {
      method: 'POST',
      body: user
    })

    // Успешная авторизация - редирект на dashboard
    await navigateTo('/', { replace: true })
  } catch (err: any) {
    console.error('Auth error:', err)
    error.value = err.data?.message || err.message || 'Ошибка авторизации'
    loading.value = false
  }
}

// Устанавливаем callback для Telegram
if (process.client) {
  (window as any).onTelegramAuth = handleTelegramAuth
}

// Загружаем Telegram Widget script
onMounted(() => {
  const script = document.createElement('script')
  script.src = 'https://telegram.org/js/telegram-widget.js?22'
  script.setAttribute('data-telegram-login', TELEGRAM_BOT_USERNAME)
  script.setAttribute('data-size', 'large')
  script.setAttribute('data-radius', '6')
  script.setAttribute('data-onauth', 'onTelegramAuth(user)')
  script.setAttribute('data-request-access', 'write')
  script.async = true

  const container = document.getElementById('telegram-login-widget')
  if (container) {
    container.appendChild(script)
  }
})
</script>

<style scoped>
/* Стили для виджета */
:deep(iframe) {
  margin: 0 auto;
}
</style>
