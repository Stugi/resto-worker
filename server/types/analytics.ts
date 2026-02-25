// Результат GPT-классификации транскрипции
export interface ClassificationResult {
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed'
  category: 'food' | 'service' | 'atmosphere' | 'loyalty' | 'wow'
  subcategory: string | null
  dishes: string[]
  severity: number // 1-5
  problemTypes: string[]
}

// Фильтр по периоду
export type AnalyticsPeriod = 'today' | 'week' | 'month' | 'quarter' | 'year'

// Ответ API /api/dashboard/analytics
export interface AnalyticsResponse {
  // 1. KPI карточки
  kpi: {
    totalReviews: number
    trendPercent: number
    avgPerEmployee: number
    sanitaryIncidents: number
  }

  // 2. Структура негатива (пай-чарт)
  negativeStructure: {
    name: string
    value: number
    color: string
  }[]

  // 3. Подкатегории еды (бар-чарт)
  foodCategories: {
    category: string
    count: number
  }[]

  // 4. Динамика по неделям (линейный график)
  trends: {
    week: string
    total: number
    negative: number
    critical: number
  }[]

  // 5. Рейтинг менеджеров
  managers: {
    login: string
    name: string | null
    reviewsCount: number
  }[]

  // 6. Блюда-лидеры по негативу
  dishes: {
    name: string
    mentions: number
    problemType: string
  }[]

  // 7. Тепловая карта (7 дней × 24 часа)
  heatmap: {
    day: string
    hours: number[]
  }[]

  // Рестораны (для фильтра)
  restaurants: { id: string; name: string }[]

  // Метаданные
  period: AnalyticsPeriod
  periodStart: string
  periodEnd: string
  totalClassified: number
  totalUnclassified: number
}
