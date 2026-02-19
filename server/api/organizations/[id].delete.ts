import { UserRole } from '#shared/constants/roles'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  if (user.role !== UserRole.SUPER_ADMIN) {
    throw createError({
      statusCode: 403,
      message: 'Доступ запрещен'
    })
  }

  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'ID организации обязателен'
    })
  }

  // Проверяем существование
  const existing = await prisma.organization.findUnique({
    where: { id, deletedAt: null }
  })

  if (!existing) {
    throw createError({
      statusCode: 404,
      message: 'Организация не найдена'
    })
  }

  // Soft delete
  await prisma.organization.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      deletedBy: user.login || user.id
    }
  })

  return { success: true, message: 'Организация удалена' }
})
