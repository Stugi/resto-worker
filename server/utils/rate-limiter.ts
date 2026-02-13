import { prisma } from './prisma'
import { createId } from '@paralleldrive/cuid2'
import { TooManyRequestsError } from './userbot-errors'

interface RateLimitConfig {
  perMinute: number
  perHour: number
  perDay: number
  globalPerMinute: number
  cooldownSeconds: number
}

const DEFAULT_CONFIG: RateLimitConfig = {
  perMinute: 2,
  perHour: 10,
  perDay: 20,
  globalPerMinute: 5,
  cooldownSeconds: 30
}

// Проверка лимитов и добавление записи
export async function checkAndIncrement(
  userId: string,
  action: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): Promise<void> {
  const now = new Date()
  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000)
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  // Проверка cooldown (последнее действие)
  const lastAction = await prisma.rateLimitLog.findFirst({
    where: { userId, action },
    orderBy: { createdAt: 'desc' }
  })

  if (lastAction) {
    const timeSinceLastAction = (now.getTime() - lastAction.createdAt.getTime()) / 1000
    if (timeSinceLastAction < config.cooldownSeconds) {
      throw new TooManyRequestsError(
        `Пожалуйста, подожди ${Math.ceil(config.cooldownSeconds - timeSinceLastAction)} секунд перед следующим действием`
      )
    }
  }

  // Проверка per-minute limit
  const countPerMinute = await prisma.rateLimitLog.count({
    where: {
      userId,
      action,
      createdAt: { gte: oneMinuteAgo }
    }
  })

  if (countPerMinute >= config.perMinute) {
    throw new TooManyRequestsError(`Превышен лимит: максимум ${config.perMinute} действий в минуту`)
  }

  // Проверка per-hour limit
  const countPerHour = await prisma.rateLimitLog.count({
    where: {
      userId,
      action,
      createdAt: { gte: oneHourAgo }
    }
  })

  if (countPerHour >= config.perHour) {
    throw new TooManyRequestsError(`Превышен лимит: максимум ${config.perHour} действий в час`)
  }

  // Проверка per-day limit
  const countPerDay = await prisma.rateLimitLog.count({
    where: {
      userId,
      action,
      createdAt: { gte: oneDayAgo }
    }
  })

  if (countPerDay >= config.perDay) {
    throw new TooManyRequestsError(`Превышен лимит: максимум ${config.perDay} действий в день`)
  }

  // Проверка глобального лимита
  const globalCountPerMinute = await prisma.rateLimitLog.count({
    where: {
      action,
      createdAt: { gte: oneMinuteAgo }
    }
  })

  if (globalCountPerMinute >= config.globalPerMinute) {
    throw new TooManyRequestsError('Система перегружена. Попробуй через минуту.')
  }

  // Добавление записи
  await prisma.rateLimitLog.create({
    data: {
      id: createId(),
      userId,
      action,
      timestamp: now
    }
  })
}

// Детекция подозрительной активности
export async function detectSuspiciousActivity(userId: string): Promise<boolean> {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)

  // Получить последние 5 действий
  const recentActions = await prisma.rateLimitLog.findMany({
    where: {
      userId,
      createdAt: { gte: fiveMinutesAgo }
    },
    orderBy: { createdAt: 'asc' },
    take: 5
  })

  if (recentActions.length < 3) {
    return false // Недостаточно данных
  }

  // Проверка равномерных интервалов (бот-подобное поведение)
  const intervals: number[] = []
  for (let i = 1; i < recentActions.length; i++) {
    const interval = recentActions[i].createdAt.getTime() - recentActions[i - 1].createdAt.getTime()
    intervals.push(interval)
  }

  // Вычисление variance
  const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length
  const variance = intervals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / intervals.length

  if (variance < 1000) {
    // Слишком равномерные интервалы
    await logSuspiciousActivity(userId, 'UNIFORM_INTERVALS', { intervals, variance })
    return true
  }

  // Проверка слишком частых действий
  if (recentActions.length >= 4) {
    const timeSpan = recentActions[recentActions.length - 1].createdAt.getTime() - recentActions[0].createdAt.getTime()
    const actionsPerMinute = (recentActions.length / timeSpan) * 60 * 1000

    if (actionsPerMinute > 3) {
      await logSuspiciousActivity(userId, 'TOO_FAST', { actionsPerMinute, timeSpan })
      return true
    }
  }

  return false
}

// Логирование подозрительной активности
async function logSuspiciousActivity(
  userId: string,
  reason: string,
  metadata: any
): Promise<void> {
  await prisma.suspiciousActivity.create({
    data: {
      id: createId(),
      userId,
      reason,
      metadata
    }
  })
}
