export default defineEventHandler(async (event) => {
  const body = await readBody<{ login: string; password: string }>(event)

  // Валидация
  if (!body.login || !body.password) {
    throw createError({
      statusCode: 400,
      message: 'Логин и пароль обязательны'
    })
  }

  // Ищем пользователя по логину
  const user = await prisma.user.findFirst({
    where: {
      login: body.login.toLowerCase().trim(),
      deletedAt: null
    },
    include: {
      organization: {
        include: {
          billing: true
        }
      },
      restaurant: true
    }
  })

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Неверный логин или пароль'
    })
  }

  // Проверяем наличие пароля
  if (!user.passwordHash) {
    throw createError({
      statusCode: 401,
      message: 'Этот аккаунт использует авторизацию через Telegram'
    })
  }

  // Проверяем пароль
  const bcrypt = await import('bcrypt')
  const isValid = await bcrypt.compare(body.password, user.passwordHash)

  if (!isValid) {
    throw createError({
      statusCode: 401,
      message: 'Неверный логин или пароль'
    })
  }

  // Устанавливаем сессию
  await setUserSession(event, user.id)

  return {
    user: safeUserObject(user),
    message: 'Вход выполнен успешно'
  }
})
