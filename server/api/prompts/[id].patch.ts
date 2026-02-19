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

  // OWNER может редактировать только промпты своих ресторанов (не дефолтные)
  if (user.role === UserRole.OWNER) {
    if (prompt.isDefault) {
      throw createError({
        statusCode: 403,
        message: 'Нельзя редактировать промпт по умолчанию'
      })
    }

    if (prompt.restaurantId) {
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
  }

  const body = await readBody<{
    name?: string
    template?: string
    isActive?: boolean
    isDefault?: boolean
    restaurantId?: string | null
  }>(event)

  // Только SUPER_ADMIN может менять isDefault
  if (body.isDefault !== undefined && user.role !== UserRole.SUPER_ADMIN) {
    throw createError({
      statusCode: 403,
      message: 'Только администратор может менять статус по умолчанию'
    })
  }

  const updated = await prisma.reportPrompt.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name.trim() }),
      ...(body.template !== undefined && { template: body.template.trim() }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
      ...(body.isDefault !== undefined && { isDefault: body.isDefault }),
      ...(body.restaurantId !== undefined && { restaurantId: body.restaurantId }),
      updatedBy: user.login || user.id
    },
    include: {
      restaurant: {
        select: { id: true, name: true }
      }
    }
  })

  return updated
})
