import { hashPassword } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    login: string
    password: string
    name: string
  }>(event)

  // Валидация
  if (!body.login || !body.password || !body.name) {
    throw createError({
      statusCode: 400,
      message: 'Все поля обязательны'
    })
  }

  // Проверяем длину пароля
  if (body.password.length < 6) {
    throw createError({
      statusCode: 400,
      message: 'Пароль должен содержать минимум 6 символов'
    })
  }

  const login = body.login.toLowerCase().trim()

  // Проверяем, существует ли пользователь
  const existingUser = await prisma.user.findFirst({
    where: {
      login,
      deletedAt: null
    }
  })

  if (existingUser) {
    throw createError({
      statusCode: 409,
      message: 'Пользователь с таким логином уже существует'
    })
  }

  // Хешируем пароль
  const passwordHash = await hashPassword(body.password)

  // Создаем пользователя
  const user = await prisma.user.create({
    data: {
      login,
      name: body.name.trim(),
      passwordHash,
      role: 'MANAGER', // По умолчанию создаем как MANAGER
      createdBy: 'login-registration'
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

  // Устанавливаем сессию
  await setUserSession(event, user.id)

  return {
    user: safeUserObject(user),
    message: 'Регистрация успешна'
  }
})
