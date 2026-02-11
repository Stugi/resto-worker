export default defineNuxtRouteMiddleware(async (to) => {
  // Только на клиенте
  if (process.server) return

  const { isAuthenticated, fetchUser } = useAuth()

  // Публичные роуты (не требуют авторизации)
  const publicRoutes = ['/auth/login', '/auth/register']

  // Если роут публичный - пропускаем
  if (publicRoutes.includes(to.path)) {
    return
  }

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
