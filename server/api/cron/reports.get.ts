import { createId } from '@paralleldrive/cuid2'
import { batchClassifyTranscripts, analyzeDishesNegative, stripGptFormatting } from '../../utils/openai'
import {
  MSG_AUTO_REPORT_HEADER, MSG_AUTO_REPORT_NO_DATA, MSG_AUTO_REPORT_OWNER,
  MSG_AUTO_DISH_ANALYSIS_HEADER
} from '../../constants/bot-messages'

/**
 * GET /api/cron/reports — Автоматическая генерация отчётов по расписанию
 *
 * Вызывается внешним cron-сервисом (cron-job.org) каждые 15 минут.
 * Проверяет день недели + час для каждого ресторана и генерирует отчёты.
 *
 * Защита: проверяет заголовок Authorization: Bearer <CRON_SECRET>
 */
export default defineEventHandler(async (event) => {
  // Проверка авторизации cron
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = getHeader(event, 'authorization')
    if (auth !== `Bearer ${cronSecret}`) {
      throw createError({ statusCode: 401, message: 'Unauthorized' })
    }
  }

  // Текущее время в МСК (UTC+3)
  const now = new Date()
  const mskOffset = 3 * 60 * 60 * 1000
  const mskNow = new Date(now.getTime() + mskOffset)
  const currentHour = mskNow.getUTCHours()
  const currentMinute = mskNow.getUTCMinutes()

  // JS: 0=Вс, 1=Пн, ..., 6=Сб → конвертируем в наш формат: 1=Пн, ..., 7=Вс
  const jsDow = mskNow.getUTCDay()
  const currentDow = jsDow === 0 ? 7 : jsDow

  console.log(`[cron/reports] Running at MSK ${currentHour}:${currentMinute.toString().padStart(2, '0')}, dow=${currentDow}`)

  // Получаем все рестораны с настройками
  const restaurants = await prisma.restaurant.findMany({
    where: {
      deletedAt: null,
      settingsComment: { not: null }
    },
    include: {
      organization: {
        include: {
          billing: { include: { tariff: true } }
        }
      }
    }
  })

  const results: { restaurantId: string; restaurantName: string; status: string; error?: string }[] = []

  for (const restaurant of restaurants) {
    // Парсим настройки
    let settings: Record<string, any> = {}
    try {
      settings = JSON.parse(restaurant.settingsComment!)
    } catch {
      continue
    }

    const schedule = settings.reportSchedule
    if (!schedule || !schedule.days?.length || !schedule.time) {
      continue
    }

    // Проверяем день недели
    if (!schedule.days.includes(currentDow)) {
      continue
    }

    // Проверяем час и минуты (запускаем только в первые 15 минут часа,
    // т.к. cron-job.org вызывает каждые 15 мин)
    const [schedHour, schedMinute = 0] = schedule.time.split(':').map(Number)
    if (schedHour !== currentHour) {
      continue
    }
    if (Math.abs(currentMinute - schedMinute) > 14) {
      continue
    }

    console.log(`[cron/reports] Match: restaurant=${restaurant.name}, schedule=${JSON.stringify(schedule)}`)

    // Дедупликация: не генерировали ли уже автоотчёт в последние 60 минут
    const recentAutoReport = await prisma.report.findFirst({
      where: {
        restaurantId: restaurant.id,
        createdBy: 'cron',
        createdAt: { gte: new Date(now.getTime() - 60 * 60 * 1000) }
      }
    })
    if (recentAutoReport) {
      console.log(`[cron/reports] Skipping ${restaurant.name}: already generated report ${recentAutoReport.id} recently`)
      results.push({ restaurantId: restaurant.id, restaurantName: restaurant.name, status: 'skipped', error: 'already generated this hour' })
      continue
    }

    // Проверяем что подписка активна
    const billing = restaurant.organization?.billing
    if (billing) {
      const billingNow = new Date()
      if (billing.status === 'TRIAL' && billing.trialEndsAt && billing.trialEndsAt < billingNow) {
        results.push({ restaurantId: restaurant.id, restaurantName: restaurant.name, status: 'skipped', error: 'trial expired' })
        continue
      }
      if (billing.status === 'ACTIVE' && billing.activeUntil && billing.activeUntil < billingNow) {
        results.push({ restaurantId: restaurant.id, restaurantName: restaurant.name, status: 'skipped', error: 'subscription expired' })
        continue
      }
      if (billing.status === 'DISABLED') {
        results.push({ restaurantId: restaurant.id, restaurantName: restaurant.name, status: 'skipped', error: 'billing disabled' })
        continue
      }
    }

    // Определяем период: от последнего АВТО-отчёта (createdBy='cron') или 24ч назад
    // Смотрим только на автоотчёты, чтобы ручные отчёты не влияли на период
    const lastAutoReport = await prisma.report.findFirst({
      where: { restaurantId: restaurant.id, status: 'COMPLETED', createdBy: 'cron' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, periodEnd: true }
    })

    const periodStart = lastAutoReport?.periodEnd || new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const periodEnd = now

    console.log(`[cron/reports] ${restaurant.name}: period ${periodStart.toISOString()} — ${periodEnd.toISOString()}, lastAutoReport=${lastAutoReport?.id || 'none'}`)

    // Получаем транскрипции за период, исключая те, что уже были в предыдущих автоотчётах
    const transcripts = await prisma.transcript.findMany({
      where: {
        restaurantId: restaurant.id,
        createdAt: { gte: periodStart, lte: periodEnd },
        // Исключаем транскрипции, уже привязанные к автоотчётам (createdBy='cron')
        NOT: {
          reports: {
            some: {
              report: { createdBy: 'cron' }
            }
          }
        }
      },
      include: {
        user: { select: { name: true } },
        voiceMessage: { select: { duration: true } }
      },
      orderBy: { createdAt: 'asc' }
    })

    if (transcripts.length === 0) {
      // Уведомляем в группу что транскрипций нет
      const chatId = settings.telegramChatId
      if (chatId) {
        try {
          const rawChatId = chatId.toString()
          const botChatId = rawChatId.startsWith('-') ? rawChatId : `-100${rawChatId}`
          await bot.api.sendMessage(
            botChatId,
            MSG_AUTO_REPORT_NO_DATA(restaurant.name),
            { parse_mode: 'HTML' }
          )
        } catch (notifyErr: any) {
          console.error(`[cron/reports] Failed to notify no-transcripts: ${notifyErr.message}`)
        }
      }
      results.push({ restaurantId: restaurant.id, restaurantName: restaurant.name, status: 'skipped', error: 'no transcripts' })
      continue
    }

    // Ищем промпт
    const prompt = await prisma.reportPrompt.findFirst({
      where: {
        OR: [
          { restaurantId: restaurant.id, isActive: true, deletedAt: null },
          { isDefault: true, isActive: true, deletedAt: null }
        ]
      },
      orderBy: { isDefault: 'asc' }
    })

    if (!prompt) {
      results.push({ restaurantId: restaurant.id, restaurantName: restaurant.name, status: 'skipped', error: 'no prompt' })
      continue
    }

    try {
      // ---- STEP A: Batch-классификация всех неклассифицированных транскрипций ----
      const unclassified = transcripts.filter((t: any) => !t.classifiedAt)
      if (unclassified.length > 0) {
        console.log(`[cron/reports] Batch classifying ${unclassified.length} transcripts for ${restaurant.name}...`)
        try {
          const classificationMap = await batchClassifyTranscripts(
            unclassified.map(t => ({ id: t.id, text: t.text }))
          )
          for (const t of unclassified) {
            const classification = classificationMap.get(t.id)
            if (classification) {
              await prisma.transcript.update({
                where: { id: t.id },
                data: {
                  sentiment: classification.sentiment,
                  category: classification.category,
                  subcategory: classification.subcategory,
                  dishes: JSON.stringify(classification.dishes),
                  severity: classification.severity,
                  problemTypes: JSON.stringify(classification.problemTypes),
                  classifiedAt: new Date()
                }
              })
            }
          }
          console.log(`[cron/reports] Batch classification done: ${classificationMap.size}/${unclassified.length}`)
        } catch (classErr: any) {
          console.error(`[cron/reports] Batch classification failed for ${restaurant.name}: ${classErr.message}`)
          // Продолжаем — отчёт всё равно генерируется
        }
      }

      // ---- Формируем текст транскрипций ----
      const transcriptsText = transcripts.map((t, i) => {
        const date = t.createdAt.toLocaleDateString('ru-RU')
        const time = t.createdAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
        const author = t.user?.name || 'Неизвестный'
        const duration = t.voiceMessage?.duration ? `${t.voiceMessage.duration}с` : ''
        return `--- Отчёт #${i + 1} (${date} ${time}, ${author}, ${duration}) ---\n${t.text}`
      }).join('\n\n')

      // ---- STEP B: Промпт 1 — основной отчёт (generateReport) ----
      const result = await generateReport({
        template: prompt.template,
        variables: {
          restaurant_name: restaurant.name,
          period_start: periodStart.toLocaleDateString('ru-RU'),
          period_end: periodEnd.toLocaleDateString('ru-RU'),
          transcripts: transcriptsText
        }
      })

      // ---- STEP C: Промпт 2 — чистка форматирования (regex) ----
      const cleanReport = stripGptFormatting(result.content)
      const cleanSummary = result.summary ? stripGptFormatting(result.summary) : ''

      // ---- STEP D: Промпт 3 — анализ блюд по негативу ----
      let cleanDishAnalysis = ''
      let dishTokensUsed = 0
      let dishTimeMs = 0
      try {
        const dishResult = await analyzeDishesNegative(transcriptsText)
        // ---- STEP E: Промпт 4 — чистка форматирования (regex) ----
        cleanDishAnalysis = stripGptFormatting(dishResult.content)
        dishTokensUsed = dishResult.tokensUsed
        dishTimeMs = dishResult.generationTimeMs
        console.log(`[cron/reports] Dish analysis done for ${restaurant.name}: ${cleanDishAnalysis.length} chars`)
      } catch (dishErr: any) {
        console.error(`[cron/reports] Dish analysis failed for ${restaurant.name}: ${dishErr.message}`)
        // Продолжаем — основной отчёт всё равно отправляется
      }

      // ---- Сохраняем в БД ----
      const reportId = createId()
      await prisma.report.create({
        data: {
          id: reportId,
          title: `Автоотчёт за ${periodStart.toLocaleDateString('ru-RU')} — ${periodEnd.toLocaleDateString('ru-RU')}`,
          content: cleanReport,
          summary: cleanSummary,
          dishAnalysis: cleanDishAnalysis || null,
          status: 'COMPLETED',
          periodStart,
          periodEnd,
          restaurantId: restaurant.id,
          promptId: prompt.id,
          model: result.model,
          tokensUsed: result.tokensUsed + dishTokensUsed,
          generationTimeMs: result.generationTimeMs + dishTimeMs,
          createdBy: 'cron'
        }
      })

      // Связываем транскрипции с отчётом (для исключения из будущих автоотчётов)
      await prisma.reportTranscript.createMany({
        data: transcripts.map(t => ({
          id: createId(),
          reportId,
          transcriptId: t.id
        }))
      })

      // ---- Отправляем в Telegram группу ресторана ----
      const chatId = settings.telegramChatId
      if (chatId) {
        const rawChatId = chatId.toString()
        const botChatId = rawChatId.startsWith('-') ? rawChatId : `-100${rawChatId}`
        const periodStartStr = periodStart.toLocaleDateString('ru-RU')
        const periodEndStr = periodEnd.toLocaleDateString('ru-RU')

        // Сообщение 1: Основной отчёт
        try {
          const header = MSG_AUTO_REPORT_HEADER(restaurant.name, periodStartStr, periodEndStr)
          const maxLen = 4000 - header.length
          if (cleanReport.length <= maxLen) {
            await bot.api.sendMessage(botChatId, header + cleanReport, { parse_mode: 'HTML' })
          } else {
            await bot.api.sendMessage(botChatId, header + cleanReport.slice(0, maxLen), { parse_mode: 'HTML' })
            let remaining = cleanReport.slice(maxLen)
            while (remaining.length > 0) {
              const part = remaining.slice(0, 4000)
              remaining = remaining.slice(4000)
              await bot.api.sendMessage(botChatId, part)
            }
          }
          console.log(`[cron/reports] Report sent to chat ${chatId} for ${restaurant.name}`)
        } catch (sendErr: any) {
          console.error(`[cron/reports] Failed to send report to Telegram: ${sendErr.message}`)
        }

        // Сообщение 2: Анализ блюд по негативу
        if (cleanDishAnalysis && cleanDishAnalysis.trim().length > 0) {
          try {
            const dishHeader = MSG_AUTO_DISH_ANALYSIS_HEADER(restaurant.name, periodStartStr, periodEndStr)
            const maxDishLen = 4000 - dishHeader.length
            if (cleanDishAnalysis.length <= maxDishLen) {
              await bot.api.sendMessage(botChatId, dishHeader + cleanDishAnalysis, { parse_mode: 'HTML' })
            } else {
              await bot.api.sendMessage(botChatId, dishHeader + cleanDishAnalysis.slice(0, maxDishLen), { parse_mode: 'HTML' })
              let remaining = cleanDishAnalysis.slice(maxDishLen)
              while (remaining.length > 0) {
                const part = remaining.slice(0, 4000)
                remaining = remaining.slice(4000)
                await bot.api.sendMessage(botChatId, part)
              }
            }
            console.log(`[cron/reports] Dish analysis sent to chat ${chatId} for ${restaurant.name}`)
          } catch (dishSendErr: any) {
            console.error(`[cron/reports] Failed to send dish analysis to Telegram: ${dishSendErr.message}`)
          }
        }
      }

      // Также отправляем владельцу в личку
      const owner = await prisma.user.findFirst({
        where: {
          organizationId: restaurant.organizationId,
          role: 'OWNER',
          telegramId: { not: null },
          deletedAt: null
        }
      })

      if (owner?.telegramId) {
        try {
          const ownerMsg = MSG_AUTO_REPORT_OWNER(
            restaurant.name,
            periodStart.toLocaleDateString('ru-RU'),
            periodEnd.toLocaleDateString('ru-RU'),
            transcripts.length,
            cleanSummary || cleanReport.slice(0, 500)
          )

          await bot.api.sendMessage(owner.telegramId, ownerMsg, { parse_mode: 'HTML' })
        } catch (ownerErr: any) {
          console.warn(`[cron/reports] Failed to notify owner: ${ownerErr.message}`)
        }
      }

      results.push({ restaurantId: restaurant.id, restaurantName: restaurant.name, status: 'generated' })
      console.log(`[cron/reports] Report generated for ${restaurant.name}: ${reportId}`)

    } catch (genErr: any) {
      console.error(`[cron/reports] Failed to generate report for ${restaurant.name}: ${genErr.message}`)
      results.push({ restaurantId: restaurant.id, restaurantName: restaurant.name, status: 'failed', error: genErr.message })
    }
  }

  console.log(`[cron/reports] Done. Results: ${JSON.stringify(results)}`)

  return {
    ok: true,
    timestamp: now.toISOString(),
    mskTime: `${currentHour}:${currentMinute.toString().padStart(2, '0')}`,
    dow: currentDow,
    results
  }
})
