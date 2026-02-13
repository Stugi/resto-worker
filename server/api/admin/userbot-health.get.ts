import { checkUserbotHealth } from '../../utils/userbot'
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

  // Проверка подключения
  const health = await checkUserbotHealth()

  // Статистика за последние 24 часа
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const totalActions = await prisma.userbotAction.count({
    where: { createdAt: { gte: oneDayAgo } }
  })

  const successfulActions = await prisma.userbotAction.count({
    where: {
      createdAt: { gte: oneDayAgo },
      success: true
    }
  })

  const failedActions = totalActions - successfulActions
  const successRate = totalActions > 0 ? (successfulActions / totalActions) * 100 : 0

  return {
    health,
    stats24h: {
      total: totalActions,
      successful: successfulActions,
      failed: failedActions,
      successRate: successRate.toFixed(2) + '%'
    }
  }
})
