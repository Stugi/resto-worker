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
    where: { id, deletedAt: null },
    include: {
      restaurant: {
        select: { id: true, name: true }
      }
    }
  })

  if (!prompt) {
    throw createError({
      statusCode: 404,
      message: 'Промпт не найден'
    })
  }

  // OWNER может видеть только дефолтные или промпты своих ресторанов
  if (user.role === UserRole.OWNER && !prompt.isDefault) {
    if (prompt.restaurant) {
      const restaurant = await prisma.restaurant.findFirst({
        where: {
          id: prompt.restaurantId!,
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
  }

  return prompt
})
