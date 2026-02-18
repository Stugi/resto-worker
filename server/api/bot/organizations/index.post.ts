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

  // Создаем организацию
  const organization = await prisma.organization.create({
    data: {
      name: body.name.trim(),
      createdBy: user.id
    }
  })

  // Создаем биллинг для организации
  await prisma.billing.create({
    data: {
      organizationId: organization.id,
      status: 'TRIAL',
      trialStartsAt: new Date(),
      createdBy: user.id
    }
  })

  // Возвращаем организацию с биллингом
  const result = await prisma.organization.findUnique({
    where: { id: organization.id },
    include: {
      billing: true
    }
  })

  return result
})
