import { UserRole } from '#shared/constants/roles'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  // Только SUPER_ADMIN может создавать организации
  if (user.role !== UserRole.SUPER_ADMIN) {
    throw createError({
      statusCode: 403,
      message: 'Доступ запрещен'
    })
  }

  const body = await readBody<{ name: string }>(event)

  if (!body.name || body.name.trim().length === 0) {
    throw createError({
      statusCode: 400,
      message: 'Название организации обязательно'
    })
  }

  // Ищем триальный тариф (бесплатный или самый дешёвый)
  const trialTariff = await prisma.tariff.findFirst({
    where: { isActive: true, deletedAt: null },
    orderBy: { price: 'asc' }
  })

  const now = new Date()
  const trialDays = trialTariff?.period ?? 7
  const trialEndsAt = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000)

  // Создаем организацию
  const organization = await prisma.organization.create({
    data: {
      name: body.name.trim(),
      createdBy: user.login || user.id
    }
  })

  // Создаем биллинг для организации с триальным тарифом
  await prisma.billing.create({
    data: {
      organizationId: organization.id,
      status: 'TRIAL',
      trialStartsAt: now,
      trialEndsAt,
      tariffId: trialTariff?.id || null,
      createdBy: user.login || user.id
    }
  })

  // Возвращаем организацию с биллингом и тарифом
  const result = await prisma.organization.findUnique({
    where: { id: organization.id },
    include: {
      billing: {
        include: {
          tariff: { select: { id: true, name: true, price: true, maxTranscriptions: true } }
        }
      }
    }
  })

  return result
})
