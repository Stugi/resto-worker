<template>
  <div>
    <h2 class="text-2xl font-semibold text-text mb-2 text-center">
      Регистрация
    </h2>
    <p class="text-text-secondary text-center mb-8">
      Создайте новый аккаунт
    </p>

    <!-- Error Message -->
    <div
      v-if="error"
      class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6"
      role="alert"
    >
      <p class="text-sm">{{ error }}</p>
    </div>

    <!-- Success Message -->
    <div
      v-if="success"
      class="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6"
      role="alert"
    >
      <p class="text-sm">{{ success }}</p>
    </div>

    <!-- Registration Form -->
    <form @submit.prevent="handleRegister" class="space-y-4">
      <BaseInput
        id="name"
        v-model="name"
        type="text"
        label="Имя"
        placeholder="Иван Иванов"
        required
      />

      <BaseInput
        id="login"
        v-model="login"
        type="text"
        label="Логин"
        placeholder="username"
        required
      />

      <BaseInput
        id="password"
        v-model="password"
        type="password"
        label="Пароль"
        placeholder="Минимум 6 символов"
        hint="Минимум 6 символов"
        :minlength="6"
        required
      />

      <BaseInput
        id="password_confirm"
        v-model="passwordConfirm"
        type="password"
        label="Подтверждение пароля"
        placeholder="Повторите пароль"
        required
      />

      <BaseButton
        type="submit"
        :loading="loading"
        loading-text="Регистрация..."
        gradient
        full-width
        size="lg"
      >
        Зарегистрироваться
      </BaseButton>

      <p class="text-center text-sm text-text-secondary">
        Уже есть аккаунт?
        <NuxtLink to="/auth/login" class="text-action hover:underline">
          Войти
        </NuxtLink>
      </p>
    </form>

    <div class="mt-8 pt-6 border-t border-gray-200">
      <p class="text-center text-sm text-text-secondary mb-4">
        Или войдите через Telegram
      </p>
      <div class="text-center">
        <NuxtLink
          to="/auth/login?method=telegram"
          class="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-text hover:bg-gray-50 transition-colors"
        >
          <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
          </svg>
          Войти через Telegram
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'auth'
})

const loading = ref(false)
const error = ref('')
const success = ref('')

const name = ref('')
const login = ref('')
const password = ref('')
const passwordConfirm = ref('')

const handleRegister = async () => {
  loading.value = true
  error.value = ''
  success.value = ''

  // Валидация на клиенте
  if (password.value !== passwordConfirm.value) {
    error.value = 'Пароли не совпадают'
    loading.value = false
    return
  }

  if (password.value.length < 6) {
    error.value = 'Пароль должен содержать минимум 6 символов'
    loading.value = false
    return
  }

  try {
    await $fetch('/api/auth/register', {
      method: 'POST',
      body: {
        name: name.value,
        login: login.value,
        password: password.value
      }
    })

    success.value = 'Регистрация успешна! Перенаправление...'

    // Небольшая задержка для отображения сообщения
    setTimeout(async () => {
      await navigateTo('/')
    }, 1000)
  } catch (err: any) {
    console.error('Registration error:', err)
    error.value = err.data?.message || err.message || 'Ошибка регистрации'
    loading.value = false
  }
}
</script>
