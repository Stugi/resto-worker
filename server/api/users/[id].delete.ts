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

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'ID пользователя обязателен'
    })
  }

  // Нельзя удалить самого себя
  if (id === user.id) {
    throw createError({
      statusCode: 400,
      message: 'Вы не можете удалить себя'
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

  // OWNER может удалять только пользователей своей организации
  if (user.role === UserRole.OWNER) {
    if (existingUser.organizationId !== user.organizationId) {
      throw createError({
        statusCode: 403,
        message: 'Доступ запрещен'
      })
    }

    // OWNER не может удалять других OWNER
    if (existingUser.role === UserRole.OWNER) {
      throw createError({
        statusCode: 403,
        message: 'Вы не можете удалять других владельцев'
      })
    }
  }

  // Soft delete
  await prisma.user.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      deletedBy: user.login || user.id
    }
  })

  return { success: true, message: 'Пользователь удален' }
})
