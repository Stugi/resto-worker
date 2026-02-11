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

// Получить текущего пользователя из сессии
export async function getUserFromSession(event: H3Event) {
  const session = await useSession(event, {
    password: useRuntimeConfig().sessionSecret
  })

  const userId = session.data.userId as string | undefined

  if (!userId) {
    return null
  }

  // Получаем пользователя из БД
  const user = await prisma.user.findUnique({
    where: { id: userId, deletedAt: null },
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
  const session = await useSession(event, {
    password: useRuntimeConfig().sessionSecret
  })

  await session.update({
    userId
  })
}

// Очистить сессию
export async function clearUserSession(event: H3Event) {
  const session = await useSession(event, {
    password: useRuntimeConfig().sessionSecret
  })

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
