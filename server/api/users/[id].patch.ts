import { hash } from 'bcrypt'
import { UserRole } from '#shared/constants/roles'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  if (user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.OWNER) {
    throw createError({
      statusCode: 403,
      message: 'Доступ запрещен'
    })
  }

  const id = getRouterParam(event, 'id')
  const body = await readBody<{
    name?: string
    login?: string
    password?: string
    phone?: string
    role?: 'SUPER_ADMIN' | 'OWNER' | 'MANAGER'
    organizationId?: string
  }>(event)

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'ID пользователя обязателен'
    })
  }

  // Проверяем существование пользователя
  const existingUser = await prisma.user.findUnique({
    where: { id, deletedAt: null }
  })

  if (!existingUser) {
    throw createError({
      statusCode: 404,
      message: 'Пользователь не найден'
    })
  }

  // OWNER может редактировать только пользователей своей организации
  if (user.role === UserRole.OWNER) {
    if (existingUser.organizationId !== user.organizationId) {
      throw createError({
        statusCode: 403,
        message: 'Доступ запрещен'
      })
    }

    // OWNER не может менять роль
    if (body.role && body.role !== existingUser.role) {
      throw createError({
        statusCode: 403,
        message: 'Вы не можете изменять роль пользователя'
      })
    }

    // OWNER не может менять организацию
    if (body.organizationId && body.organizationId !== existingUser.organizationId) {
      throw createError({
        statusCode: 403,
        message: 'Вы не можете изменять организацию пользователя'
      })
    }
  }

  // Проверяем уникальность логина, если он меняется
  if (body.login && body.login !== existingUser.login) {
    const loginExists = await prisma.user.findUnique({
      where: { login: body.login.trim() }
    })

    if (loginExists) {
      throw createError({
        statusCode: 400,
        message: 'Пользователь с таким логином уже существует'
      })
    }
  }

  // Подготавливаем данные для обновления
  const updateData: any = {
    updatedBy: user.id
  }

  if (body.name) updateData.name = body.name.trim()
  if (body.login) updateData.login = body.login.trim()
  if (body.phone !== undefined) updateData.phone = body.phone?.trim() || null
  if (body.role && user.role === UserRole.SUPER_ADMIN) updateData.role = body.role
  if (body.organizationId !== undefined && user.role === UserRole.SUPER_ADMIN) {
    updateData.organizationId = body.organizationId || null
  }

  // Если меняется пароль
  if (body.password) {
    updateData.passwordHash = await hash(body.password, 10)
  }

  // Обновляем пользователя
  const updatedUser = await prisma.user.update({
    where: { id },
    data: updateData,
    include: {
      organization: {
        select: {
          id: true,
          name: true
        }
      }
    }
  })

  return updatedUser
})
