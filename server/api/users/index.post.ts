import { hash } from 'bcrypt'
import { createId } from '@paralleldrive/cuid2'
import { UserRole } from '#shared/constants/roles'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  if (user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.OWNER) {
    throw createError({
      statusCode: 403,
      message: 'Доступ запрещен'
    })
  }

  const body = await readBody<{
    name: string
    login: string
    password: string
    phone?: string
    role: 'SUPER_ADMIN' | 'OWNER' | 'MANAGER'
    organizationId?: string
  }>(event)

  // Валидация
  if (!body.name?.trim() || !body.login?.trim() || !body.password?.trim()) {
    throw createError({
      statusCode: 400,
      message: 'Имя, логин и пароль обязательны'
    })
  }

  if (!body.role) {
    throw createError({
      statusCode: 400,
      message: 'Роль обязательна'
    })
  }

  // OWNER может создавать только MANAGER в своей организации
  if (user.role === UserRole.OWNER) {
    if (body.role !== UserRole.MANAGER) {
      throw createError({
        statusCode: 403,
        message: 'Вы можете создавать только менеджеров'
      })
    }

    if (!user.organizationId) {
      throw createError({
        statusCode: 400,
        message: 'Организация не найдена'
      })
    }

    body.organizationId = user.organizationId
  }

  // SUPER_ADMIN должен указать организацию для OWNER и MANAGER
  if (user.role === UserRole.SUPER_ADMIN) {
    if ((body.role === UserRole.OWNER || body.role === UserRole.MANAGER) && !body.organizationId) {
      throw createError({
        statusCode: 400,
        message: 'Для роли OWNER или MANAGER требуется организация'
      })
    }

    // SUPER_ADMIN не должен иметь организацию
    if (body.role === UserRole.SUPER_ADMIN && body.organizationId) {
      body.organizationId = undefined
    }
  }

  // Проверяем уникальность логина
  const existingUser = await prisma.user.findUnique({
    where: { login: body.login.trim() }
  })

  if (existingUser) {
    throw createError({
      statusCode: 400,
      message: 'Пользователь с таким логином уже существует'
    })
  }

  // Хешируем пароль
  const passwordHash = await hash(body.password, 10)

  // Создаем пользователя
  const newUser = await prisma.user.create({
    data: {
      id: createId(),
      name: body.name.trim(),
      login: body.login.trim(),
      passwordHash,
      phone: body.phone ? BigInt(body.phone.replace(/\D/g, '')) : null,
      role: body.role,
      organizationId: body.organizationId || null,
      createdBy: user.login || user.id
    },
    include: {
      organization: {
        select: {
          id: true,
          name: true
        }
      }
    }
  })

  return { ...newUser, phone: newUser.phone?.toString() ?? null }
})
