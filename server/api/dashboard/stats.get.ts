/**
 * GET /api/dashboard/stats — Статистика для дашборда
 *
 * Возвращает агрегированные данные по организации пользователя:
 * - transcriptsToday: кол-во транскрипций за сегодня + общая длительность
 * - reportsWeek: кол-во отчётов за неделю
 * - lastReport: последний сгенерированный отчёт
 * - restaurants: список ресторанов со статусом
 * - weekActivity: транскрипции по дням за последние 7 дней
 *
 * Доступ: все авторизованные
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const orgId = user.organizationId
  const now = new Date()

  // Начало сегодня (МСК, UTC+3)
  const mskOffset = 3 * 60 * 60 * 1000
  const mskNow = new Date(now.getTime() + mskOffset)
  const todayStart = new Date(Date.UTC(
    mskNow.getUTCFullYear(),
    mskNow.getUTCMonth(),
    mskNow.getUTCDate()
  ))
  todayStart.setTime(todayStart.getTime() - mskOffset) // конвертируем обратно в UTC

  // 7 дней назад
  const weekAgo = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000)

  // Условие фильтрации по организации
  const orgFilter = orgId
    ? { restaurant: { organizationId: orgId, deletedAt: null } }
    : { restaurant: { deletedAt: null } }

  // Параллельные запросы
  const [
    transcriptsToday,
    todayDuration,
    reportsWeek,
    lastReport,
    restaurants,
    weekTranscripts,
  ] = await Promise.all([
    // 1. Кол-во транскрипций за сегодня
    prisma.transcript.count({
      where: {
        ...orgFilter,
        createdAt: { gte: todayStart },
      },
    }),

    // 2. Общая длительность голосовых за сегодня
    prisma.voiceMessage.aggregate({
      where: {
        ...orgFilter,
        createdAt: { gte: todayStart },
        status: 'TRANSCRIBED',
      },
      _sum: { duration: true },
    }),

    // 3. Кол-во отчётов за неделю
    prisma.report.count({
      where: {
        ...orgFilter,
        status: 'COMPLETED',
        createdAt: { gte: weekAgo },
      },
    }),

    // 4. Последний отчёт
    prisma.report.findFirst({
      where: {
        ...orgFilter,
        status: 'COMPLETED',
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        createdAt: true,
        restaurant: { select: { name: true } },
      },
    }),

    // 5. Рестораны со статусом
    prisma.restaurant.findMany({
      where: {
        organizationId: orgId || undefined,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        settingsComment: true,
        _count: {
          select: {
            transcripts: {
              where: { createdAt: { gte: todayStart } },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    }),

    // 6. Транскрипции по дням за неделю (для графика)
    prisma.transcript.findMany({
      where: {
        ...orgFilter,
        createdAt: { gte: weekAgo },
      },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  // Группируем транскрипции по дням (МСК)
  const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
  const weekActivity: { date: string; day: string; count: number }[] = []

  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(todayStart.getTime() - i * 24 * 60 * 60 * 1000)
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)
    const mskDay = new Date(dayStart.getTime() + mskOffset)
    const count = weekTranscripts.filter(
      (t) => t.createdAt >= dayStart && t.createdAt < dayEnd
    ).length
    weekActivity.push({
      date: mskDay.toISOString().slice(0, 10),
      day: dayNames[mskDay.getUTCDay()],
      count,
    })
  }

  // Парсим статусы ресторанов
  const restaurantsList = restaurants.map((r) => {
    let hasGroup = false
    let schedule = null
    try {
      if (r.settingsComment) {
        const settings = JSON.parse(r.settingsComment)
        hasGroup = !!settings.telegramChatId
        schedule = settings.reportSchedule || null
      }
    } catch {
      // ignore
    }
    return {
      id: r.id,
      name: r.name,
      hasGroup,
      hasSchedule: !!(schedule?.days?.length && schedule?.time),
      transcriptsToday: r._count.transcripts,
    }
  })

  return {
    transcriptsToday,
    todayDurationSec: todayDuration._sum.duration || 0,
    reportsWeek,
    lastReport,
    restaurants: restaurantsList,
    weekActivity,
  }
})
