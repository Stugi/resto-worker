import { UserRole } from '../../../../shared/constants/roles'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  if (user.role !== UserRole.SUPER_ADMIN) {
    throw createError({
      statusCode: 403,
      message: 'Доступ запрещен'
    })
  }

  const id = getRouterParam(event, 'id')
  const body = await readBody<{ name?: string; billingStatus?: string }>(event)

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'ID организации обязателен'
    })
  }

  // Проверяем существование организации
  const existing = await prisma.organization.findUnique({
    where: { id, deletedAt: null }
  })

  if (!existing) {
    throw createError({
      statusCode: 404,
      message: 'Организация не найдена'
    })
  }

  // Обновляем организацию
  const organization = await prisma.organization.update({
    where: { id },
    data: {
      ...(body.name && { name: body.name.trim() }),
      updatedBy: user.id
    },
    include: {
      billing: true
    }
  })

  // Обновляем биллинг если нужно
  if (body.billingStatus && organization.billing) {
    await prisma.billing.update({
      where: { id: organization.billing.id },
      data: {
        status: body.billingStatus as any,
        updatedBy: user.id
      }
    })
  }

  // Возвращаем обновленную организацию
  const result = await prisma.organization.findUnique({
    where: { id },
    include: {
      billing: true
    }
  })

  return result
})
