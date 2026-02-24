import {
  MSG_REPORT_HEADER, MSG_REPORT_SENT, MSG_REPORT_SEND_ERROR
} from '../../../constants/bot-messages'

/**
 * POST /api/reports/:id/send-to-group — Отправить отчёт в Telegram группу
 *
 * Берёт отчёт из БД, находит telegramChatId ресторана и отправляет через бот.
 *
 * Доступ: SUPER_ADMIN, OWNER, MANAGER
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, message: 'ID отчёта обязателен' })
  }

  // Получаем отчёт с рестораном
  const report = await prisma.report.findUnique({
    where: { id },
    include: {
      restaurant: {
        select: { id: true, name: true, settingsComment: true, organizationId: true }
      }
    }
  })

  if (!report) {
    throw createError({ statusCode: 404, message: 'Отчёт не найден' })
  }

  if (report.status !== 'COMPLETED') {
    throw createError({ statusCode: 400, message: 'Отчёт ещё не сформирован' })
  }

  // Проверяем доступ
  if (user.role === 'OWNER' && report.restaurant?.organizationId !== user.organizationId) {
    throw createError({ statusCode: 403, message: 'Нет доступа к этому отчёту' })
  }

  // Получаем telegramChatId из настроек ресторана
  let settings: Record<string, any> = {}
  try {
    if (report.restaurant?.settingsComment) {
      settings = JSON.parse(report.restaurant.settingsComment)
    }
  } catch {
    // ignore
  }

  const chatId = settings.telegramChatId
  if (!chatId) {
    throw createError({
      statusCode: 400,
      message: 'Telegram-группа не настроена для этого ресторана. Подключите группу в настройках ресторана.'
    })
  }

  // Формируем сообщение
  const rawChatId = chatId.toString()
  const botChatId = rawChatId.startsWith('-') ? rawChatId : `-100${rawChatId}`

  const periodStart = report.periodStart
    ? new Date(report.periodStart).toLocaleDateString('ru-RU')
    : ''
  const periodEnd = report.periodEnd
    ? new Date(report.periodEnd).toLocaleDateString('ru-RU')
    : ''

  const header = MSG_REPORT_HEADER(report.restaurant?.name || '', periodStart, periodEnd)

  try {
    const maxLen = 4000 - header.length
    if (report.content.length <= maxLen) {
      await bot.api.sendMessage(botChatId, header + report.content, { parse_mode: 'HTML' })
    } else {
      // Отправляем частями
      await bot.api.sendMessage(botChatId, header + report.content.slice(0, maxLen), { parse_mode: 'HTML' })
      let remaining = report.content.slice(maxLen)
      while (remaining.length > 0) {
        const part = remaining.slice(0, 4000)
        remaining = remaining.slice(4000)
        await bot.api.sendMessage(botChatId, part)
      }
    }

    console.log(`[reports] Report ${id} sent to chat ${chatId} by ${user.login || user.id}`)

    return { ok: true, message: MSG_REPORT_SENT }
  } catch (err: any) {
    console.error(`[reports] Failed to send report ${id} to chat ${chatId}: ${err.message}`)
    throw createError({
      statusCode: 502,
      message: MSG_REPORT_SEND_ERROR(err.message)
    })
  }
})
