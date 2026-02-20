import { createId } from '@paralleldrive/cuid2'

/**
 * GET /api/cron/reports — Автоматическая генерация отчётов по расписанию
 *
 * Вызывается Vercel Cron 3 раза в день (08:00, 14:00, 18:00 МСК).
 * Проверяет день недели + час и генерирует отчёты для подходящих ресторанов.
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

    // Проверяем час (расписание "14:00" → запускаем когда currentHour === 14)
    const [schedHour] = schedule.time.split(':').map(Number)
    if (schedHour !== currentHour) {
      continue
    }

    console.log(`[cron/reports] Match: restaurant=${restaurant.name}, schedule=${JSON.stringify(schedule)}`)

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

    // Определяем период: от последнего отчёта (или 24ч назад) до сейчас
    const lastReport = await prisma.report.findFirst({
      where: { restaurantId: restaurant.id, status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
      select: { periodEnd: true }
    })

    const periodStart = lastReport?.periodEnd || new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const periodEnd = now

    console.log(`[cron/reports] ${restaurant.name}: period ${periodStart.toISOString()} — ${periodEnd.toISOString()}`)

    // Получаем транскрипции за период
    const transcripts = await prisma.transcript.findMany({
      where: {
        restaurantId: restaurant.id,
        createdAt: { gte: periodStart, lte: periodEnd }
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
            `📊 <b>Автоотчёт</b>\n${restaurant.name}\n\nНовых транскрипций за период нет — отчёт не сформирован.\nОтправляйте голосовые сообщения в группу для сбора данных.`,
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
      // Формируем текст транскрипций
      const transcriptsText = transcripts.map((t, i) => {
        const date = t.createdAt.toLocaleDateString('ru-RU')
        const time = t.createdAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
        const author = t.user?.name || 'Неизвестный'
        const duration = t.voiceMessage?.duration ? `${t.voiceMessage.duration}с` : ''
        return `--- Отчёт #${i + 1} (${date} ${time}, ${author}, ${duration}) ---\n${t.text}`
      }).join('\n\n')

      // Генерируем отчёт
      const result = await generateReport({
        template: prompt.template,
        variables: {
          restaurant_name: restaurant.name,
          period_start: periodStart.toLocaleDateString('ru-RU'),
          period_end: periodEnd.toLocaleDateString('ru-RU'),
          transcripts: transcriptsText
        }
      })

      // Сохраняем в БД
      const reportId = createId()
      await prisma.report.create({
        data: {
          id: reportId,
          title: `Автоотчёт за ${periodStart.toLocaleDateString('ru-RU')} — ${periodEnd.toLocaleDateString('ru-RU')}`,
          content: result.content,
          summary: result.summary,
          status: 'COMPLETED',
          periodStart,
          periodEnd,
          restaurantId: restaurant.id,
          promptId: prompt.id,
          model: result.model,
          tokensUsed: result.tokensUsed,
          generationTimeMs: result.generationTimeMs,
          createdBy: 'cron'
        }
      })

      // Отправляем в Telegram группу ресторана
      const chatId = settings.telegramChatId
      if (chatId) {
        try {
          // Для Bot API суперграуппы нужен формат -100<chatId>
          const rawChatId = chatId.toString()
          const botChatId = rawChatId.startsWith('-') ? rawChatId : `-100${rawChatId}`
          const header = `📊 <b>Автоматический отчёт</b>\n${restaurant.name}\n${periodStart.toLocaleDateString('ru-RU')} — ${periodEnd.toLocaleDateString('ru-RU')}\n\n`

          const maxLen = 4000 - header.length
          if (result.content.length <= maxLen) {
            await bot.api.sendMessage(botChatId, header + result.content, { parse_mode: 'HTML' })
          } else {
            // Отправляем заголовок + части
            await bot.api.sendMessage(botChatId, header + result.content.slice(0, maxLen), { parse_mode: 'HTML' })
            let remaining = result.content.slice(maxLen)
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
          const ownerMsg =
            `📊 <b>Новый автоотчёт</b>\n\n` +
            `Ресторан: ${restaurant.name}\n` +
            `Период: ${periodStart.toLocaleDateString('ru-RU')} — ${periodEnd.toLocaleDateString('ru-RU')}\n` +
            `Транскрипций: ${transcripts.length}\n\n` +
            (result.summary || result.content.slice(0, 500))

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
