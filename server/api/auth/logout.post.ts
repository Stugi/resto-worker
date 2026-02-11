export default defineEventHandler(async (event) => {
  await clearUserSession(event)

  return {
    message: 'Выход выполнен успешно'
  }
})
