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
    template: string
    isDefault?: boolean
    restaurantId?: string
  }>(event)

  if (!body.name?.trim() || !body.template?.trim()) {
    throw createError({
      statusCode: 400,
      message: 'Название и шаблон обязательны'
    })
  }

  // Только SUPER_ADMIN может создавать дефолтные промпты
  if (body.isDefault && user.role !== UserRole.SUPER_ADMIN) {
    throw createError({
      statusCode: 403,
      message: 'Только администратор может создавать промпты по умолчанию'
    })
  }

  // OWNER может создавать только для ресторанов своей организации
  if (user.role === UserRole.OWNER && body.restaurantId) {
    const restaurant = await prisma.restaurant.findFirst({
      where: {
        id: body.restaurantId,
        organizationId: user.organizationId!,
        deletedAt: null
      }
    })

    if (!restaurant) {
      throw createError({
        statusCode: 403,
        message: 'Ресторан не найден или не принадлежит вашей организации'
      })
    }
  }

  // Дефолтный промпт не привязан к ресторану
  const restaurantId = body.isDefault ? null : (body.restaurantId || null)

  const prompt = await prisma.reportPrompt.create({
    data: {
      id: createId(),
      name: body.name.trim(),
      template: body.template.trim(),
      isDefault: body.isDefault || false,
      restaurantId,
      createdBy: user.login || user.id
    },
    include: {
      restaurant: {
        select: { id: true, name: true }
      }
    }
  })

  return prompt
})
