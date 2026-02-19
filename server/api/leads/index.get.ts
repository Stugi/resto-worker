import { UserRole } from '#shared/constants/roles'

/**
 * GET /api/leads — Список лидов (только SUPER_ADMIN)
 *
 * Лиды — контакты, которые начали онбординг (поделились номером),
 * но не обязательно завершили его.
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  if (user.role !== UserRole.SUPER_ADMIN) {
    throw createError({
      statusCode: 403,
      message: 'Доступ запрещен'
    })
  }

  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: 'desc' }
  })

  // Преобразуем BigInt в строку для JSON-сериализации
  return leads.map(lead => ({
    ...lead,
    phone: lead.phone.toString()
  }))
})
