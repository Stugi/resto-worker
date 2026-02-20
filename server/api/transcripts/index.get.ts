/**
 * GET /api/transcripts — Список транскрипций с пагинацией и фильтрами
 *
 * Доступ:
 * - SUPER_ADMIN: все транскрипции
 * - OWNER: транскрипции своих ресторанов
 * - MANAGER: транскрипции своего ресторана
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
  const from = query.from ? new Date(query.from as string) : undefined
  const to = query.to ? new Date(query.to as string) : undefined
  const page = Math.max(Number(query.page) || 1, 1)
  const pageSize = Math.min(Math.max(Number(query.pageSize) || 20, 1), 100)
  const skip = (page - 1) * pageSize

  let where: any = {}

  // Фильтр по роли
  if (user.role === 'SUPER_ADMIN') {
    if (restaurantId) where.restaurantId = restaurantId
  } else if (user.role === 'OWNER') {
    // Получаем все рестораны организации
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
    if (from) where.createdAt.gte = from
    if (to) {
      // Конец дня: если передана дата без времени, включаем весь день
      const toStr = query.to as string
      if (toStr.length === 10) to.setHours(23, 59, 59, 999)
      where.createdAt.lte = to
    }
  }

  const [items, total] = await Promise.all([
    prisma.transcript.findMany({
      where,
      include: {
        restaurant: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
        voiceMessage: { select: { id: true, duration: true, status: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize
    }),
    prisma.transcript.count({ where })
  ])

  console.log(`[transcripts] Listed ${items.length}/${total} transcripts, page=${page} (user=${user.id}, role=${user.role})`)

  return { items, total, page, pageSize }
})
