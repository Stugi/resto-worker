import { createId } from '@paralleldrive/cuid2'
import { UserRole } from '#shared/constants/roles'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  // Промпты доступны только SUPER_ADMIN
  if (user.role !== UserRole.SUPER_ADMIN) {
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
