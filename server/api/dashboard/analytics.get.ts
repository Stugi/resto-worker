/**
 * GET /api/dashboard/analytics — Расширенная аналитика
 *
 * Возвращает 7 блоков данных для графиков:
 * 1. KPI карточки
 * 2. Структура негатива (pie)
 * 3. Подкатегории еды (bar)
 * 4. Динамика по неделям (line)
 * 5. Рейтинг менеджеров (table)
 * 6. Блюда-лидеры по негативу (table)
 * 7. Тепловая карта (grid)
 *
 * Query: period=today|week|month|quarter|year, restaurantId?
 * Доступ: SUPER_ADMIN, OWNER
 */
import type { AnalyticsPeriod, AnalyticsResponse } from '../../types/analytics'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const query = getQuery(event)

  const period = (query.period as AnalyticsPeriod) || 'month'
  const restaurantId = query.restaurantId as string | undefined

  const orgId = user.organizationId

  // МСК (UTC+3)
  const mskOffset = 3 * 60 * 60 * 1000
  const now = new Date()
  const mskNow = new Date(now.getTime() + mskOffset)

  // Рассчитываем начало и конец периода
  const todayStart = new Date(Date.UTC(
    mskNow.getUTCFullYear(),
    mskNow.getUTCMonth(),
    mskNow.getUTCDate()
  ))
  todayStart.setTime(todayStart.getTime() - mskOffset)

  let periodStart: Date
  let periodEnd: Date = now

  switch (period) {
    case 'today':
      periodStart = todayStart
      break
    case 'week':
      periodStart = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000)
      break
    case 'month':
      periodStart = new Date(todayStart.getTime() - 29 * 24 * 60 * 60 * 1000)
      break
    case 'quarter':
      periodStart = new Date(todayStart.getTime() - 89 * 24 * 60 * 60 * 1000)
      break
    case 'year':
      periodStart = new Date(todayStart.getTime() - 364 * 24 * 60 * 60 * 1000)
      break
    default:
      periodStart = new Date(todayStart.getTime() - 29 * 24 * 60 * 60 * 1000)
  }

  // Предыдущий период (для тренда KPI)
  const prevPeriodDuration = periodEnd.getTime() - periodStart.getTime()
  const prevPeriodStart = new Date(periodStart.getTime() - prevPeriodDuration)
  const prevPeriodEnd = periodStart

  // Базовый фильтр
  const baseFilter: any = {
    createdAt: { gte: periodStart, lte: periodEnd },
    restaurant: {
      deletedAt: null,
      ...(orgId ? { organizationId: orgId } : {})
    }
  }
  if (restaurantId) {
    baseFilter.restaurantId = restaurantId
  }

  const prevFilter: any = {
    createdAt: { gte: prevPeriodStart, lte: prevPeriodEnd },
    restaurant: {
      deletedAt: null,
      ...(orgId ? { organizationId: orgId } : {})
    }
  }
  if (restaurantId) {
    prevFilter.restaurantId = restaurantId
  }

  // Параллельные запросы
  const [
    transcripts,
    prevCount,
    totalUsers,
    allTranscripts, // для тепловой карты
    restaurants, // для фильтра по ресторану
  ] = await Promise.all([
    // Все классифицированные транскрипции за период
    prisma.transcript.findMany({
      where: {
        ...baseFilter,
        classifiedAt: { not: null }
      },
      select: {
        id: true,
        sentiment: true,
        category: true,
        subcategory: true,
        dishes: true,
        severity: true,
        problemTypes: true,
        createdAt: true,
        userId: true,
        user: { select: { login: true, name: true } }
      }
    }),

    // Кол-во транскрипций за предыдущий период (для тренда)
    prisma.transcript.count({ where: prevFilter }),

    // Кол-во активных пользователей-менеджеров
    prisma.user.count({
      where: {
        deletedAt: null,
        ...(orgId ? { organizationId: orgId } : {}),
        role: { in: ['MANAGER', 'OWNER'] }
      }
    }),

    // Все транскрипции за период (для тепловой карты, включая неклассифицированные)
    prisma.transcript.findMany({
      where: baseFilter,
      select: { createdAt: true, classifiedAt: true }
    }),

    // Рестораны для фильтра
    prisma.restaurant.findMany({
      where: {
        deletedAt: null,
        ...(orgId ? { organizationId: orgId } : {})
      },
      select: { id: true, name: true },
      orderBy: { name: 'asc' }
    })
  ])

  const totalReviews = transcripts.length
  const totalAll = allTranscripts.length
  const totalUnclassified = allTranscripts.filter(t => !t.classifiedAt).length

  // --- 1. KPI ---
  const trendPercent = prevCount > 0
    ? Math.round(((totalAll - prevCount) / prevCount) * 100)
    : (totalAll > 0 ? 100 : 0)

  const avgPerEmployee = totalUsers > 0
    ? Math.round((totalAll / totalUsers) * 10) / 10
    : 0

  const sanitaryIncidents = transcripts.filter(t => t.severity && t.severity >= 4).length

  const kpi = {
    totalReviews: totalAll,
    trendPercent,
    avgPerEmployee,
    sanitaryIncidents
  }

  // --- 2. Структура негатива ---
  const categoryColors: Record<string, string> = {
    food: '#ef4444',
    service: '#f59e0b',
    atmosphere: '#8b5cf6',
    loyalty: '#3b82f6',
    wow: '#10b981'
  }
  const categoryNames: Record<string, string> = {
    food: 'Еда',
    service: 'Сервис',
    atmosphere: 'Атмосфера',
    loyalty: 'Лояльность',
    wow: 'WOW-эффект'
  }

  const negativeTranscripts = transcripts.filter(t => t.sentiment === 'negative' || t.sentiment === 'mixed')
  const categoryCounts: Record<string, number> = {}
  for (const t of negativeTranscripts) {
    if (t.category) {
      categoryCounts[t.category] = (categoryCounts[t.category] || 0) + 1
    }
  }

  const negativeStructure = Object.entries(categoryCounts)
    .map(([key, value]) => ({
      name: categoryNames[key] || key,
      value,
      color: categoryColors[key] || '#6b7280'
    }))
    .sort((a, b) => b.value - a.value)

  // --- 3. Подкатегории еды ---
  const subcategoryNames: Record<string, string> = {
    temperature: 'Температура',
    taste: 'Вкус',
    foreign_object: 'Инородный предмет',
    cooking: 'Приготовление',
    quality: 'Качество продуктов'
  }

  const foodTranscripts = transcripts.filter(t => t.category === 'food' && t.subcategory)
  const subCounts: Record<string, number> = {}
  for (const t of foodTranscripts) {
    if (t.subcategory) {
      subCounts[t.subcategory] = (subCounts[t.subcategory] || 0) + 1
    }
  }

  const foodCategories = Object.entries(subCounts)
    .map(([key, count]) => ({
      category: subcategoryNames[key] || key,
      count
    }))
    .sort((a, b) => b.count - a.count)

  // --- 4. Динамика по неделям ---
  const weekMs = 7 * 24 * 60 * 60 * 1000
  const weeksCount = Math.max(1, Math.ceil((periodEnd.getTime() - periodStart.getTime()) / weekMs))
  const trends: { week: string; total: number; negative: number; critical: number }[] = []

  for (let i = 0; i < weeksCount; i++) {
    const wStart = new Date(periodStart.getTime() + i * weekMs)
    const wEnd = new Date(Math.min(wStart.getTime() + weekMs, periodEnd.getTime()))
    const mskWStart = new Date(wStart.getTime() + mskOffset)

    const weekLabel = `${mskWStart.getUTCDate().toString().padStart(2, '0')}.${(mskWStart.getUTCMonth() + 1).toString().padStart(2, '0')}`

    const weekTranscripts = transcripts.filter(t =>
      t.createdAt >= wStart && t.createdAt < wEnd
    )

    trends.push({
      week: weekLabel,
      total: weekTranscripts.length,
      negative: weekTranscripts.filter(t => t.sentiment === 'negative').length,
      critical: weekTranscripts.filter(t => t.severity && t.severity >= 4).length
    })
  }

  // --- 5. Рейтинг менеджеров ---
  const managerMap: Record<string, { login: string; name: string | null; count: number }> = {}
  for (const t of allTranscripts) {
    // allTranscripts не содержат user, используем transcripts для классифицированных
  }
  // Используем transcripts (с user data)
  for (const t of transcripts) {
    const key = t.userId || 'unknown'
    if (!managerMap[key]) {
      managerMap[key] = {
        login: t.user?.login || 'неизвестный',
        name: t.user?.name || null,
        count: 0
      }
    }
    managerMap[key].count++
  }

  const managers = Object.values(managerMap)
    .map(m => ({
      login: m.login,
      name: m.name,
      reviewsCount: m.count
    }))
    .sort((a, b) => b.reviewsCount - a.reviewsCount)
    .slice(0, 10)

  // --- 6. Блюда-лидеры по негативу ---
  const dishMap: Record<string, { mentions: number; problems: Set<string> }> = {}
  for (const t of negativeTranscripts) {
    let dishes: string[] = []
    try { dishes = t.dishes ? JSON.parse(t.dishes) : [] } catch {}

    let problems: string[] = []
    try { problems = t.problemTypes ? JSON.parse(t.problemTypes) : [] } catch {}

    for (const dish of dishes) {
      const normalized = dish.toLowerCase().trim()
      if (!normalized) continue
      if (!dishMap[normalized]) {
        dishMap[normalized] = { mentions: 0, problems: new Set() }
      }
      dishMap[normalized].mentions++
      for (const p of problems) {
        dishMap[normalized].problems.add(p)
      }
    }
  }

  const problemTypeNames: Record<string, string> = {
    cold_food: 'Холодная еда',
    hair_found: 'Волос',
    insect: 'Насекомое',
    slow_service: 'Медленное обслуживание',
    rude_staff: 'Грубый персонал',
    wrong_order: 'Ошибка в заказе',
    dirty_table: 'Грязный стол',
    loud_music: 'Громкая музыка',
    broken_ac: 'Сломан кондиционер',
    bonus_not_applied: 'Бонус не начислен',
    boring_presentation: 'Скучная подача'
  }

  const dishes = Object.entries(dishMap)
    .map(([name, data]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      mentions: data.mentions,
      problemType: [...data.problems].map(p => problemTypeNames[p] || p).join(', ')
    }))
    .sort((a, b) => b.mentions - a.mentions)
    .slice(0, 10)

  // --- 7. Тепловая карта ---
  const dayNamesRu = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
  const heatmapData: Record<string, number[]> = {}

  // Инициализация
  for (const name of dayNamesRu) {
    heatmapData[name] = new Array(24).fill(0)
  }

  for (const t of allTranscripts) {
    const mskTime = new Date(t.createdAt.getTime() + mskOffset)
    const dayName = dayNamesRu[mskTime.getUTCDay()]
    const hour = mskTime.getUTCHours()
    heatmapData[dayName][hour]++
  }

  // Порядок: Пн, Вт, ..., Вс
  const orderedDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
  const heatmap = orderedDays.map(day => ({
    day,
    hours: heatmapData[day]
  }))

  // --- Ответ ---
  return {
    kpi,
    negativeStructure,
    foodCategories,
    trends,
    managers,
    dishes,
    heatmap,
    restaurants: restaurants.map(r => ({ id: r.id, name: r.name })),
    period,
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    totalClassified: totalReviews,
    totalUnclassified
  }
})
