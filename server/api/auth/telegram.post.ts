import { verifyTelegramAuth, isAuthDataFresh, formatTelegramId, type TelegramAuthData } from '../../utils/telegram'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody<TelegramAuthData>(event)

  // Проверяем наличие обязательных полей
  if (!body.id || !body.hash || !body.auth_date) {
    throw createError({
      statusCode: 400,
      message: 'Недостаточно данных для авторизации'
    })
  }

  // Проверяем, что есть bot token
  if (!config.telegramBotToken) {
    throw createError({
      statusCode: 500,
      message: 'Telegram bot не настроен'
    })
  }

  // Проверяем подлинность данных
  const isValid = verifyTelegramAuth(body, config.telegramBotToken)

  if (!isValid) {
    throw createError({
      statusCode: 401,
      message: 'Неверные данные авторизации'
    })
  }

  // Проверяем свежесть данных (не старше 24 часов)
  if (!isAuthDataFresh(body.auth_date)) {
    throw createError({
      statusCode: 401,
      message: 'Данные авторизации устарели'
    })
  }

  const telegramId = formatTelegramId(body.id)

  // Ищем пользователя по telegramId
  let user = await prisma.user.findUnique({
    where: { telegramId, deletedAt: null },
    include: {
      organization: {
        include: {
          billing: true
        }
      },
      restaurant: true
    }
  })

  // Если пользователя нет - создаем нового
  if (!user) {
    // Формируем имя
    const name = [body.first_name, body.last_name].filter(Boolean).join(' ')

    user = await prisma.user.create({
      data: {
        telegramId,
        name: name || 'Telegram User',
        role: 'MANAGER', // По умолчанию создаем как MANAGER
        createdBy: 'telegram-auth'
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
  }

  // Устанавливаем сессию
  await setUserSession(event, user.id)

  // Возвращаем безопасный объект пользователя
  return {
    user: safeUserObject(user),
    message: 'Авторизация успешна'
  }
})
