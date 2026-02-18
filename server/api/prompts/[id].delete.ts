import { UserRole } from '#shared/constants/roles'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'ID обязателен'
    })
  }

  const prompt = await prisma.reportPrompt.findFirst({
    where: { id, deletedAt: null }
  })

  if (!prompt) {
    throw createError({
      statusCode: 404,
      message: 'Промпт не найден'
    })
  }

  // Нельзя удалить дефолтный промпт (кроме SUPER_ADMIN)
  if (prompt.isDefault && user.role !== UserRole.SUPER_ADMIN) {
    throw createError({
      statusCode: 403,
      message: 'Нельзя удалить промпт по умолчанию'
    })
  }

  // OWNER может удалять только промпты своих ресторанов
  if (user.role === UserRole.OWNER && prompt.restaurantId) {
    const restaurant = await prisma.restaurant.findFirst({
      where: {
        id: prompt.restaurantId,
        organizationId: user.organizationId!,
        deletedAt: null
      }
    })

    if (!restaurant) {
      throw createError({
        statusCode: 403,
        message: 'Доступ запрещен'
      })
    }
  }

  // Soft delete
  await prisma.reportPrompt.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      deletedBy: user.id
    }
  })

  return { success: true }
})
