export default defineNuxtRouteMiddleware(async (to) => {
  // Публичные роуты (не требуют авторизации)
  const publicRoutes = ['/auth/login', '/auth/register']

  // Если роут публичный - пропускаем
  if (publicRoutes.includes(to.path)) {
    return
  }

  // На сервере — валидируем сессию через внутренний fetch
  if (process.server) {
    const sessionCookie = useCookie('h3-session')
    if (!sessionCookie.value) {
      return navigateTo('/auth/login')
    }

    try {
      await useRequestFetch()('/api/auth/me')
    } catch {
      return navigateTo('/auth/login')
    }
    return
  }

  // На клиенте — полная проверка через useAuth
  const { isAuthenticated, fetchUser } = useAuth()

  // Если уже авторизован - пропускаем
  if (isAuthenticated.value) {
    return
  }

  // Пытаемся получить пользователя из сессии ОДИН раз
  const user = await fetchUser()

  // Если пользователь не авторизован - редирект на login
  if (!user) {
    return navigateTo('/auth/login')
  }
})
