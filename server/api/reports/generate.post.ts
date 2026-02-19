/**
 * POST /api/reports/generate — Сгенерировать отчёт по транскрипциям
 *
 * Собирает транскрипции за указанный период и генерирует отчёт через GPT.
 *
 * Доступ: SUPER_ADMIN, OWNER
 *
 * Body:
 * - restaurantId: string (обязательно)
 * - periodStart: string (ISO date, обязательно)
 * - periodEnd: string (ISO date, обязательно)
 * - promptId?: string (ID промпта, если не указан — используется дефолтный)
 */
import { createId } from '@paralleldrive/cuid2'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  if (user.role !== 'SUPER_ADMIN' && user.role !== 'OWNER') {
    throw createError({ statusCode: 403, message: 'Доступ запрещен' })
  }

  const body = await readBody<{
    restaurantId: string
    periodStart: string
    periodEnd: string
    promptId?: string
  }>(event)

  if (!body.restaurantId || !body.periodStart || !body.periodEnd) {
    throw createError({ statusCode: 400, message: 'restaurantId, periodStart и periodEnd обязательны' })
  }

  const periodStart = new Date(body.periodStart)
  const periodEnd = new Date(body.periodEnd)

  // Проверяем ресторан
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: body.restaurantId, deletedAt: null },
    select: { id: true, name: true, organizationId: true }
  })

  if (!restaurant) {
    throw createError({ statusCode: 404, message: 'Ресторан не найден' })
  }

  // Проверяем доступ OWNER
  if (user.role === 'OWNER' && restaurant.organizationId !== user.organizationId) {
    throw createError({ statusCode: 403, message: 'Нет доступа к этому ресторану' })
  }

  // Получаем промпт
  let prompt = body.promptId
    ? await prisma.reportPrompt.findUnique({
        where: { id: body.promptId, deletedAt: null, isActive: true }
      })
    : null

  // Если промпт не указан — ищем дефолтный
  if (!prompt) {
    prompt = await prisma.reportPrompt.findFirst({
      where: {
        OR: [
          { restaurantId: body.restaurantId, isActive: true, deletedAt: null },
          { isDefault: true, isActive: true, deletedAt: null }
        ]
      },
      orderBy: { isDefault: 'asc' } // Сначала кастомный, потом дефолтный
    })
  }

  if (!prompt) {
    throw createError({
      statusCode: 400,
      message: 'Нет доступного промпта для генерации отчёта. Создайте промпт в разделе "Настройки → Промпты".'
    })
  }

  // Получаем транскрипции за период
  const transcripts = await prisma.transcript.findMany({
    where: {
      restaurantId: body.restaurantId,
      createdAt: {
        gte: periodStart,
        lte: periodEnd
      }
    },
    include: {
      user: { select: { name: true } },
      voiceMessage: { select: { duration: true } }
    },
    orderBy: { createdAt: 'asc' }
  })

  if (transcripts.length === 0) {
    throw createError({
      statusCode: 400,
      message: `Нет транскрипций за период ${periodStart.toLocaleDateString('ru-RU')} — ${periodEnd.toLocaleDateString('ru-RU')}`
    })
  }

  console.log(`[reports] Generating report: restaurant=${restaurant.name}, period=${body.periodStart}..${body.periodEnd}, transcripts=${transcripts.length}, prompt=${prompt.name}`)

  // Формируем текст транскрипций для промпта
  const transcriptsText = transcripts.map((t, i) => {
    const date = t.createdAt.toLocaleDateString('ru-RU')
    const time = t.createdAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    const author = t.user?.name || 'Неизвестный'
    const duration = t.voiceMessage?.duration ? `${t.voiceMessage.duration}с` : ''
    return `--- Отчёт #${i + 1} (${date} ${time}, ${author}, ${duration}) ---\n${t.text}`
  }).join('\n\n')

  // Создаём запись отчёта в БД (статус GENERATING)
  const reportId = createId()
  const report = await prisma.report.create({
    data: {
      id: reportId,
      title: `Отчёт за ${periodStart.toLocaleDateString('ru-RU')} — ${periodEnd.toLocaleDateString('ru-RU')}`,
      content: '',
      status: 'GENERATING',
      periodStart,
      periodEnd,
      restaurantId: body.restaurantId,
      promptId: prompt.id,
      createdBy: user.login || user.id
    }
  })

  // Связываем транскрипции с отчётом
  await prisma.reportTranscript.createMany({
    data: transcripts.map(t => ({
      id: createId(),
      reportId: report.id,
      transcriptId: t.id
    }))
  })

  // Генерируем отчёт через GPT
  try {
    const result = await generateReport({
      template: prompt.template,
      variables: {
        restaurant_name: restaurant.name,
        period_start: periodStart.toLocaleDateString('ru-RU'),
        period_end: periodEnd.toLocaleDateString('ru-RU'),
        transcripts: transcriptsText
      }
    })

    // Обновляем отчёт
    const updatedReport = await prisma.report.update({
      where: { id: report.id },
      data: {
        content: result.content,
        summary: result.summary,
        status: 'COMPLETED',
        model: result.model,
        tokensUsed: result.tokensUsed,
        generationTimeMs: result.generationTimeMs
      },
      include: {
        restaurant: { select: { id: true, name: true } },
        _count: { select: { transcripts: true } }
      }
    })

    console.log(`[reports] Report generated: ${report.id}, tokens: ${result.tokensUsed}, time: ${result.generationTimeMs}ms`)

    return updatedReport

  } catch (error: any) {
    console.error(`[reports] Report generation failed for ${report.id}:`, error.message)

    await prisma.report.update({
      where: { id: report.id },
      data: {
        status: 'FAILED',
        error: error.message
      }
    })

    throw createError({
      statusCode: 502,
      message: `Ошибка генерации отчёта: ${error.message}`
    })
  }
})
