/**
 * GET /api/reports — Список отчётов с пагинацией и фильтрами
 *
 * Доступ:
 * - SUPER_ADMIN: все отчёты
 * - OWNER: отчёты своих ресторанов
 * - MANAGER: отчёты своего ресторана
 *
 * Query:
 * - restaurantId?: string — фильтр по ресторану
 * - from?: string — дата начала (ISO)
 * - to?: string — дата конца (ISO)
 * - page?: number (по умолчанию 1)
 * - pageSize?: number (по умолчанию 20, макс 100)
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const query = getQuery(event)

  const restaurantId = query.restaurantId as string | undefined
  const from = query.from as string | undefined
  const to = query.to as string | undefined
  const page = Math.max(Number(query.page) || 1, 1)
  const pageSize = Math.min(Math.max(Number(query.pageSize) || 20, 1), 100)
  const skip = (page - 1) * pageSize

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

  // Фильтр по дате
  if (from || to) {
    where.createdAt = {}
    if (from) where.createdAt.gte = new Date(from)
    if (to) {
      // Конец дня: если передана дата без времени, включаем весь день
      const toDate = new Date(to)
      if (to.length === 10) toDate.setHours(23, 59, 59, 999)
      where.createdAt.lte = toDate
    }
  }

  const [items, total] = await Promise.all([
    prisma.report.findMany({
      where,
      include: {
        restaurant: { select: { id: true, name: true } },
        prompt: { select: { id: true, name: true } },
        _count: { select: { transcripts: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize
    }),
    prisma.report.count({ where })
  ])

  console.log(`[reports] Listed ${items.length}/${total} reports, page=${page} (user=${user.id})`)

  return { items, total, page, pageSize }
})
