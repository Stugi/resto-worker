/**
 * GET /api/transcripts — Список транскрипций
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
 * - limit?: number — лимит (по умолчанию 50)
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const query = getQuery(event)

  const restaurantId = query.restaurantId as string | undefined
  const from = query.from ? new Date(query.from as string) : undefined
  const to = query.to ? new Date(query.to as string) : undefined
  const limit = Math.min(Number(query.limit) || 50, 200)

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
    if (to) where.createdAt.lte = to
  }

  const transcripts = await prisma.transcript.findMany({
    where,
    include: {
      restaurant: { select: { id: true, name: true } },
      user: { select: { id: true, name: true } },
      voiceMessage: { select: { id: true, duration: true, status: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: limit
  })

  console.log(`[transcripts] Listed ${transcripts.length} transcripts (user=${user.id}, role=${user.role})`)

  return transcripts
})
