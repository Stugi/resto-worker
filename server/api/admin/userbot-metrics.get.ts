import { prisma } from '../../utils/prisma'
import { UserRole } from '../../../shared/constants/roles'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)

  // Только SUPER_ADMIN
  if (session.user.role !== UserRole.SUPER_ADMIN) {
    throw createError({
      statusCode: 403,
      message: 'Доступ запрещен'
    })
  }

  const query = getQuery(event)
  const period = (query.period as string) || '24h' // 1h, 24h, 7d, 30d

  // Определение периода
  const periodMap: Record<string, number> = {
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000
  }

  const periodMs = periodMap[period] || periodMap['24h']
  const periodStart = new Date(Date.now() - periodMs)

  // Действия за период
  const actions = await prisma.userbotAction.findMany({
    where: { createdAt: { gte: periodStart } },
    orderBy: { createdAt: 'desc' },
    take: 100
  })

  const actionsByType = actions.reduce((acc, action) => {
    acc[action.action] = (acc[action.action] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Rate limit события
  const rateLimitEvents = await prisma.rateLimitLog.count({
    where: { createdAt: { gte: periodStart } }
  })

  // Подозрительная активность
  const suspiciousActivity = await prisma.suspiciousActivity.findMany({
    where: {
      detectedAt: { gte: periodStart },
      resolved: false
    },
    orderBy: { detectedAt: 'desc' },
    take: 20
  })

  // Средняя длительность создания группы
  const successfulCreations = actions.filter(
    (a) => a.action === 'CREATE_GROUP' && a.success && a.metadata
  )

  const avgDuration = successfulCreations.length > 0
    ? successfulCreations.reduce((sum, a) => {
        const metadata = a.metadata as any
        return sum + (metadata?.duration || 0)
      }, 0) / successfulCreations.length
    : 0

  return {
    period,
    totalActions: actions.length,
    actionsByType,
    rateLimitEvents,
    suspiciousActivity: suspiciousActivity.map((s) => ({
      userId: s.userId,
      reason: s.reason,
      detectedAt: s.detectedAt,
      metadata: s.metadata
    })),
    avgCreationDuration: Math.round(avgDuration) + 'ms'
  }
})
