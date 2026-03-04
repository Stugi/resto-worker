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
  const body = await readBody<{
    name?: string
    billingStatus?: string
    tariffId?: string
    activeUntil?: string
    resetUsage?: boolean
  }>(event)

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
      updatedBy: user.login || user.id
    },
    include: {
      billing: true
    }
  })

  // Обновляем биллинг если нужно
  if (organization.billing && (body.billingStatus || body.tariffId || body.activeUntil || body.resetUsage)) {
    const billingData: Record<string, any> = {
      updatedBy: user.login || user.id
    }

    if (body.billingStatus) {
      billingData.status = body.billingStatus as any
    }
    if (body.tariffId) {
      billingData.tariffId = body.tariffId
    }
    if (body.activeUntil) {
      billingData.activeUntil = new Date(body.activeUntil)
    }
    if (body.resetUsage) {
      billingData.transcriptionsUsed = 0
    }

    await prisma.billing.update({
      where: { id: organization.billing.id },
      data: billingData
    })
  }

  // Возвращаем обновленную организацию
  const result = await prisma.organization.findUnique({
    where: { id },
    include: {
      billing: {
        include: { tariff: true }
      }
    }
  })

  return result
})
