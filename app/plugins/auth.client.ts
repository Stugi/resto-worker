export default defineNuxtPlugin(async () => {
  const { fetchUser } = useAuth()

  // Пытаемся восстановить сессию при загрузке приложения
  if (process.client) {
    try {
      await fetchUser()
    } catch (error) {
      // Игнорируем ошибки - пользователь просто не авторизован
      console.log('No active session')
    }
  }
})
