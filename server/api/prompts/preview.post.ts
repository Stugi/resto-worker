import { UserRole } from '#shared/constants/roles'

/**
 * POST /api/prompts/preview — Генерация примера отчёта по шаблону
 * Использует фейковые данные для демонстрации
 * Доступ: только SUPER_ADMIN
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  if (user.role !== UserRole.SUPER_ADMIN) {
    throw createError({
      statusCode: 403,
      message: 'Доступ запрещен'
    })
  }

  const body = await readBody<{ template: string }>(event)

  if (!body.template?.trim()) {
    throw createError({
      statusCode: 400,
      message: 'Шаблон обязателен'
    })
  }

  // Фейковые данные для примера
  const fakeTranscripts = `--- Отчёт #1 (15.02.2026 09:30, Иван Петров, 45с) ---
Утро, открылись в 8:00. Завтраки идут хорошо, все 12 столов заняты к 9 утра. Пришла поставка от поставщика, всё по списку. Персонал в полном составе.

--- Отчёт #2 (15.02.2026 14:15, Мария Сидорова, 60с) ---
Обед прошёл отлично, средний чек 850 рублей. Выручка за обед около 45 тысяч. Закончилась сёмга, нужно заказать завтра. Новый повар Алексей справляется хорошо. Один столик пожаловался на время ожидания — 25 минут вместо обычных 15.

--- Отчёт #3 (15.02.2026 22:00, Иван Петров, 35с) ---
Вечерняя смена. Всего за день 78 гостей, выручка 124 тысячи. Бронирований на завтра уже 8 столов. Кондиционер в зале барахлит, нужно вызвать мастера.`

  try {
    const result = await generateReport({
      template: body.template,
      variables: {
        restaurant_name: 'Тестовый ресторан',
        period_start: '10.02.2026',
        period_end: '16.02.2026',
        transcripts: fakeTranscripts
      }
    })

    return {
      content: result.content,
      summary: result.summary,
      tokensUsed: result.tokensUsed,
      generationTimeMs: result.generationTimeMs
    }
  } catch (error: any) {
    throw createError({
      statusCode: 502,
      message: `Ошибка генерации: ${error.message}`
    })
  }
})
