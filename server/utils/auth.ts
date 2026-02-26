/**
 * Аутентификация и управление сессиями
 *
 * Используется Nitro auto-import — все экспортированные функции
 * доступны в API-эндпоинтах без явного импорта.
 *
 * Основной паттерн:
 *   const user = await requireAuth(event) // Бросает 401 если нет сессии
 *
 * Сессии:
 * - Хранятся в httpOnly cookies (7 дней)
 * - Содержат только userId
 * - При каждом запросе подтягивается User из БД с organization и restaurant
 */
import bcrypt from 'bcrypt'
import type { H3Event } from 'h3'
import type { User } from '@prisma/client'

// Хеширование пароля
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

// Проверка пароля
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// Конфигурация сессии
const sessionSecret = process.env.SESSION_SECRET
if (!sessionSecret) {
  throw new Error('SESSION_SECRET is not set. Generate a secure random string (64+ chars) and add it to .env')
}

const sessionConfig = {
  password: sessionSecret,
  name: 'h3-session',
  cookie: {
    maxAge: 60 * 60 * 24 * 7, // 7 дней
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/'
  }
}

// Получить текущего пользователя из сессии
export async function getUserFromSession(event: H3Event) {
  const session = await useSession(event, sessionConfig)

  const userId = session.data.userId as string | undefined

  if (!userId) {
    return null
  }

  // Получаем пользователя из БД
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      organization: {
        include: {
          billing: true
        }
      },
      restaurant: true
    }
  })

  return user
}

// Установить пользователя в сессию
export async function setUserSession(event: H3Event, userId: string) {
  const session = await useSession(event, sessionConfig)

  await session.update({
    userId
  })
}

// Очистить сессию
export async function clearUserSession(event: H3Event) {
  const session = await useSession(event, sessionConfig)

  await session.clear()
}

// Проверить, авторизован ли пользователь (для middleware)
export async function requireAuth(event: H3Event) {
  const user = await getUserFromSession(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Требуется авторизация'
    })
  }

  return user
}

// Безопасный объект пользователя (без пароля)
export function safeUserObject(user: any) {
  const { passwordHash, ...safeUser } = user
  return safeUser
}
