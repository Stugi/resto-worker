import type { User } from '@prisma/client'

export const useAuth = () => {
  const user = useState<User | null>('auth:user', () => null)
  const loading = useState<boolean>('auth:loading', () => false)
  const isAuthenticated = computed(() => !!user.value)

  /**
   * Авторизация через Login/Password
   */
  async function loginWithCredentials(login: string, password: string) {
    loading.value = true

    try {
      const response = await $fetch('/api/auth/login', {
        method: 'POST',
        body: { login, password }
      })

      user.value = response.user as User
      return response
    } catch (error: any) {
      throw createError({
        statusCode: error.statusCode || 500,
        message: error.data?.message || 'Ошибка авторизации'
      })
    } finally {
      loading.value = false
    }
  }

  /**
   * Авторизация через Telegram
   */
  async function loginWithTelegram(authData: any) {
    loading.value = true

    try {
      const response = await $fetch('/api/auth/telegram', {
        method: 'POST',
        body: authData
      })

      user.value = response.user as User
      return response
    } catch (error: any) {
      throw createError({
        statusCode: error.statusCode || 500,
        message: error.data?.message || 'Ошибка авторизации'
      })
    } finally {
      loading.value = false
    }
  }

  /**
   * Регистрация через Login/Password
   */
  async function register(name: string, login: string, password: string) {
    loading.value = true

    try {
      const response = await $fetch('/api/auth/register', {
        method: 'POST',
        body: { name, login, password }
      })

      user.value = response.user as User
      return response
    } catch (error: any) {
      throw createError({
        statusCode: error.statusCode || 500,
        message: error.data?.message || 'Ошибка регистрации'
      })
    } finally {
      loading.value = false
    }
  }

  /**
   * Выход из системы
   */
  async function logout() {
    loading.value = true

    try {
      await $fetch('/api/auth/logout', {
        method: 'POST'
      })

      user.value = null

      // Редирект на страницу входа
      await navigateTo('/auth/login')
    } catch (error: any) {
      console.error('Ошибка при выходе:', error)
    } finally {
      loading.value = false
    }
  }

  /**
   * Получить текущего пользователя
   */
  async function fetchUser() {
    loading.value = true

    try {
      const response = await $fetch('/api/auth/me')
      user.value = response.user as User
      return response.user
    } catch (error: any) {
      user.value = null
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Проверка роли пользователя
   */
  function hasRole(roles: string | string[]) {
    if (!user.value) return false

    const roleArray = Array.isArray(roles) ? roles : [roles]
    return roleArray.includes(user.value.role)
  }

  /**
   * Проверка доступа к организации
   */
  function canAccessOrganization(organizationId: string) {
    if (!user.value) return false

    // SUPER_ADMIN имеет доступ ко всем организациям
    if (user.value.role === 'SUPER_ADMIN') return true

    // Проверяем, что пользователь принадлежит к организации
    return user.value.organizationId === organizationId
  }

  /**
   * Проверка доступа к ресторану
   */
  function canAccessRestaurant(restaurantId: string) {
    if (!user.value) return false

    // SUPER_ADMIN и OWNER имеют доступ ко всем ресторанам организации
    if (user.value.role === 'SUPER_ADMIN') return true

    // MANAGER имеет доступ только к своему ресторану
    if (user.value.role === 'MANAGER') {
      return user.value.restaurantId === restaurantId
    }

    return true // OWNER
  }

  return {
    user: readonly(user),
    loading: readonly(loading),
    isAuthenticated,
    loginWithTelegram,
    logout,
    fetchUser,
    hasRole,
    canAccessOrganization,
    canAccessRestaurant
  }
}
