/**
 * GET /api/reports — Список отчётов
 *
 * Доступ:
 * - SUPER_ADMIN: все отчёты
 * - OWNER: отчёты своих ресторанов
 * - MANAGER: отчёты своего ресторана
 *
 * Query:
 * - restaurantId?: string
 * - limit?: number (по умолчанию 20)
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const query = getQuery(event)

  const restaurantId = query.restaurantId as string | undefined
  const limit = Math.min(Number(query.limit) || 20, 100)

  let where: any = {}

  if (user.role === 'SUPER_ADMIN') {
    if (restaurantId) where.restaurantId = restaurantId
  } else if (user.role === 'OWNER') {
    const orgRestaurants = await prisma.restaurant.findMany({
      where: { organizationId: user.organizationId!, deletedAt: null },
      select: { id: true }
    })
    const restaurantIds = orgRestaurants.map(r => r.id)
    where.restaurantId = restaurantId && restaurantIds.includes(restaurantId)
      ? restaurantId
      : { in: restaurantIds }
  } else if (user.role === 'MANAGER') {
    if (!user.restaurantId) {
      throw createError({ statusCode: 400, message: 'У пользователя нет привязки к ресторану' })
    }
    where.restaurantId = user.restaurantId
  } else {
    throw createError({ statusCode: 403, message: 'Доступ запрещен' })
  }

  const reports = await prisma.report.findMany({
    where,
    include: {
      restaurant: { select: { id: true, name: true } },
      prompt: { select: { id: true, name: true } },
      _count: { select: { transcripts: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: limit
  })

  console.log(`[reports] Listed ${reports.length} reports (user=${user.id})`)

  return reports
})
