import { InlineKeyboard, Keyboard } from 'grammy'
import { createId } from '@paralleldrive/cuid2'
import { BotState } from '../../types/bot'
import { UserRole } from '#shared/constants/roles'
import {
  MSG_WELCOME, MSG_WELCOME_BACK, MSG_ALREADY_REGISTERED, MSG_PHONE_ALREADY_USED,
  MSG_CONTACT_REQUEST, MSG_PHONE_SAVED, MSG_ORG_NAME_CONFIRM, MSG_CONFIGURING,
  MSG_SETUP_COMPLETE, MSG_SETUP_NO_GROUP, MSG_SETUP_ERROR, MSG_GROUP_INSTRUCTION,
  MSG_SETTINGS_PRIVATE, MSG_GROUP_NOT_LINKED, MSG_USE_START,
  MSG_USE_START_SHORT, MSG_START_CALLBACK, MSG_SCHEDULE, MSG_SCHEDULE_TIME,
  MSG_SCHEDULE_SAVED_TOAST, MSG_SCHEDULE_DISABLED, MSG_SCHEDULE_SAVED,
  MSG_ORG_NOT_FOUND, MSG_TARIFF_NOT_FOUND, MSG_PAYMENT_ERROR, MSG_PAYMENT_SENT,
  MSG_PAYMENT_LINK, MSG_TRANSCRIPTION_LIMIT, MSG_SUBSCRIPTION_EXPIRED,
  MSG_BILLING_DISABLED, MSG_TRANSCRIPTION_DONE, MSG_TRANSCRIPTION_ERROR,
  MSG_EXAMPLE_REPORT, BTN_START, BTN_LETS_GO, BTN_SHARE_CONTACT,
  BTN_BUY_SUBSCRIPTION, BTN_SELECT_TIME, BTN_SAVE, BTN_BACK_TO_DAYS,
  MSG_HELP, MSG_HELP_SENT, MSG_HELP_FORWARDED,
  MSG_SUPPORT_REPLY_SENT, MSG_SUPPORT_REPLY_ERROR
} from '../../constants/bot-messages'

// Telegram ID администратора для пересылки сообщений поддержки
const SUPPORT_CHAT_ID = process.env.SUPPORT_CHAT_ID || '1003948911'

// --- ХЕЛПЕРЫ ---

// Нормализация chatId: MTProto отдаёт "123456789", Bot API для суперграупп "-100123456789"
function normalizeChatId(id: string): string {
  return id.replace(/^-100/, '').replace(/^-/, '')
}

// Поиск ресторана по chatId группы (из settingsComment.telegramChatId)
// При нахождении — автоматически обновляет chatId на актуальный Bot API формат
async function findRestaurantByChatId(chatId: string) {
  const normalizedInput = normalizeChatId(chatId)
  console.log(`[bot] findRestaurant: input="${chatId}" norm="${normalizedInput}"`)

  const restaurants = await prisma.restaurant.findMany({
    where: { deletedAt: null, settingsComment: { not: null } },
    select: { id: true, name: true, organizationId: true, settingsComment: true }
  })

  console.log(`[bot] findRestaurant: ${restaurants.length} restaurants to check`)

  const found = restaurants.find(r => {
    try {
      const settings = JSON.parse(r.settingsComment!)
      const storedRaw = settings.telegramChatId?.toString() || ''
      const storedNorm = normalizeChatId(storedRaw)
      const match = storedNorm === normalizedInput
      console.log(`[bot] findRestaurant: "${r.name}" stored="${storedRaw}" norm="${storedNorm}" match=${match}`)
      return match
    } catch { return false }
  }) || null

  // Автообновление chatId: если найден ресторан и сохранённый chatId отличается от Bot API chatId,
  // обновляем на актуальный (chatId из ctx.chat.id — это всегда правильный Bot API формат)
  if (found) {
    try {
      const settings = JSON.parse(found.settingsComment!)
      const storedRaw = settings.telegramChatId?.toString() || ''
      if (storedRaw !== chatId) {
        settings.telegramChatId = chatId
        await prisma.restaurant.update({
          where: { id: found.id },
          data: { settingsComment: JSON.stringify(settings) }
        })
        console.log(`[bot] findRestaurant: updated chatId for "${found.name}": "${storedRaw}" → "${chatId}"`)
      }
    } catch (err) {
      console.warn(`[bot] findRestaurant: failed to update chatId:`, err)
    }
  }

  return found
}

// --- КОМАНДЫ И ОБРАБОТЧИКИ ---

// Команда /start - начало онбординга
// Новый флоу: /start -> Контакт -> Имя орг -> Масштаб -> Авто-создание всего
bot.command('start', async (ctx) => {
  const tgId = ctx.from.id.toString()
  const firstName = ctx.from.first_name || 'друг'

  // Проверяем — есть ли уже зарегистрированная организация у этого пользователя
  const existingUser = await prisma.user.findUnique({
    where: { telegramId: tgId },
    include: {
      organization: { select: { id: true, name: true } },
      restaurant: { select: { id: true, name: true } }
    }
  })

  if (existingUser?.organizationId && existingUser.organization) {
    // У пользователя уже есть компания — не даём пройти онбординг заново
    const orgName = existingUser.organization.name
    const restName = existingUser.restaurant?.name || orgName

    await ctx.reply(MSG_WELCOME_BACK(firstName, orgName, restName), { parse_mode: 'HTML' })
    return
  }

  // Новый пользователь или без организации — запускаем онбординг
  await prisma.user.upsert({
    where: { telegramId: tgId },
    update: { botState: BotState.WAITING_START },
    create: {
      id: createId(),
      telegramId: tgId,
      botState: BotState.WAITING_START,
      role: UserRole.OWNER,
      createdBy: 'telegram_bot'
    }
  })

  const startKeyboard = new Keyboard()
    .text(BTN_START)
    .resized()
    .oneTime()

  await ctx.reply(MSG_WELCOME(firstName), {
    parse_mode: 'HTML',
    reply_markup: startKeyboard
  })
})

// Команда /help - поддержка (только в личке)
bot.command('help', async (ctx) => {
  if (ctx.chat.type !== 'private') return

  const tgId = ctx.from.id.toString()
  await prisma.user.updateMany({
    where: { telegramId: tgId },
    data: { botState: 'WAITING_HELP' }
  })

  await ctx.reply(MSG_HELP, { parse_mode: 'HTML' })
})

// Команда /settings - настройка расписания отчётов (только в группе)
bot.command('settings', async (ctx) => {
  // Работает только в группе
  if (ctx.chat.type === 'private') {
    await ctx.reply(MSG_SETTINGS_PRIVATE)
    return
  }

  const chatId = ctx.chat.id.toString()
  const restaurant = await findRestaurantByChatId(chatId)

  if (!restaurant) {
    await ctx.reply(MSG_GROUP_NOT_LINKED)
    return
  }

  // Парсим текущее расписание
  let currentSchedule: { days: number[], time: string } = { days: [], time: '17:00' }
  if (restaurant.settingsComment) {
    try {
      const settings = JSON.parse(restaurant.settingsComment)
      if (settings.reportSchedule) {
        currentSchedule = settings.reportSchedule
      }
    } catch {}
  }

  const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
  const keyboard = new InlineKeyboard()

  // Строка 1: Пн-Чт
  for (let d = 1; d <= 4; d++) {
    const selected = currentSchedule.days.includes(d)
    keyboard.text(selected ? `✅ ${dayNames[d - 1]}` : dayNames[d - 1], `sched_day:${d}`)
  }
  keyboard.row()

  // Строка 2: Пт-Вс
  for (let d = 5; d <= 7; d++) {
    const selected = currentSchedule.days.includes(d)
    keyboard.text(selected ? `✅ ${dayNames[d - 1]}` : dayNames[d - 1], `sched_day:${d}`)
  }
  keyboard.row()

  keyboard.text(BTN_SELECT_TIME, 'sched_time_menu').row()
  keyboard.text(BTN_SAVE, 'sched_save')

  const timeInfo = currentSchedule.days.length > 0
    ? `\n\nТекущее расписание: ${currentSchedule.days.map(d => dayNames[d - 1]).join(', ')} в ${currentSchedule.time}`
    : '\n\nРасписание не настроено'

  await ctx.reply(MSG_SCHEDULE(restaurant.name, timeInfo), { parse_mode: 'HTML', reply_markup: keyboard })
})

// ШАГ 1: Обработка получения контакта
bot.on('message:contact', async (ctx) => {
  const tgId = ctx.from.id.toString()
  const user = await prisma.user.findUnique({
    where: { telegramId: tgId },
    include: { organization: { select: { name: true } } }
  })

  // ПЕРВАЯ ПРОВЕРКА: У пользователя уже есть организация — блокируем + убираем клавиатуру
  if (user?.organizationId) {
    await ctx.reply(
      MSG_ALREADY_REGISTERED(user.organization?.name || 'Без имени'),
      { parse_mode: 'HTML', reply_markup: { remove_keyboard: true } }
    )

    // Сбросить онбординг-состояние если было
    if (user.botState !== BotState.COMPLETED) {
      await prisma.user.update({
        where: { telegramId: tgId },
        data: { botState: BotState.COMPLETED, tempOrgName: null }
      })
    }

    return
  }

  if (!user || user.botState !== BotState.WAITING_CONTACT) {
    return
  }

  const rawPhone = ctx.message.contact.phone_number
  // Нормализация телефона: убираем всё кроме цифр → BigInt
  const phoneDigits = rawPhone.replace(/\D/g, '')
  const phoneBigInt = BigInt(phoneDigits)

  // СРАЗУ сохраняем в Lead (даже если пользователь бросит онбординг)
  try {
    await prisma.lead.upsert({
      where: {
        telegramId_phone: {
          telegramId: tgId,
          phone: phoneBigInt
        }
      },
      update: {
        name: ctx.from.first_name || null,
        username: ctx.from.username || null
      },
      create: {
        telegramId: tgId,
        phone: phoneBigInt,
        name: ctx.from.first_name || null,
        username: ctx.from.username || null
      }
    })
  } catch (err) {
    console.error('[bot] Failed to save lead:', err)
  }

  // ПРОВЕРКА 2: Этот номер телефона уже привязан к другой организации?
  const existingUser = await prisma.user.findFirst({
    where: {
      phone: phoneBigInt,
      organizationId: { not: null },
      deletedAt: null,
      telegramId: { not: tgId } // Исключаем самого себя
    }
  })

  if (existingUser) {
    await ctx.reply(MSG_PHONE_ALREADY_USED, { reply_markup: { remove_keyboard: true } })

    await prisma.user.update({
      where: { telegramId: tgId },
      data: {
        botState: BotState.WAITING_CONTACT,
        tempOrgName: null
      }
    })

    return
  }

  // Сохраняем телефон и переходим к имени организации
  await prisma.user.update({
    where: { telegramId: tgId },
    data: {
      phone: phoneBigInt,
      name: ctx.from.first_name || 'Владелец',
      botState: BotState.WAITING_NAME
    }
  })

  await ctx.reply(MSG_PHONE_SAVED, {
    parse_mode: 'HTML',
    reply_markup: { remove_keyboard: true }
  })
})

// ШАГ 2: Обработка текстовых сообщений (имя организации)
bot.on('message:text', async (ctx) => {
  const tgId = ctx.from.id.toString()
  const user = await prisma.user.findUnique({ where: { telegramId: tgId } })
  const text = ctx.message.text

  if (!user) {
    return ctx.reply(MSG_USE_START)
  }

  // Обработка кнопки СТАРТ
  if (user.botState === BotState.WAITING_START && text === BTN_START) {
    await prisma.user.update({
      where: { telegramId: tgId },
      data: { botState: BotState.WAITING_CONTACT }
    })

    const contactKeyboard = new Keyboard()
      .requestContact(BTN_SHARE_CONTACT)
      .resized()
      .oneTime()

    return ctx.reply(MSG_CONTACT_REQUEST, {
      parse_mode: 'HTML',
      reply_markup: contactKeyboard
    })
  }

  // Ожидаем название ресторана
  if (user.botState === BotState.WAITING_NAME) {
    await prisma.user.update({
      where: { telegramId: tgId },
      data: {
        tempOrgName: text,
        botState: BotState.WAITING_SCALE
      }
    })

    const keyboard = new InlineKeyboard()
      .text('1 ресторан', 'scale_1').row()
      .text('2-10 ресторанов', 'scale_10').row()
      .text('Более 11', 'scale_11')

    return ctx.reply(MSG_ORG_NAME_CONFIRM(text), {
      parse_mode: 'HTML',
      reply_markup: keyboard
    })
  }

  // Обработка сообщения в поддержку
  if (user.botState === 'WAITING_HELP' && ctx.chat.type === 'private') {
    // Пересылаем сообщение администратору
    try {
      const userName = ctx.from.first_name + (ctx.from.last_name ? ` ${ctx.from.last_name}` : '')
      const orgName = user.organizationId
        ? (await prisma.organization.findUnique({ where: { id: user.organizationId }, select: { name: true } }))?.name
        : undefined

      // Отправляем инфо-заголовок
      await bot.api.sendMessage(
        SUPPORT_CHAT_ID,
        MSG_HELP_FORWARDED(userName, tgId, orgName || undefined),
        { parse_mode: 'HTML' }
      )

      // Пересылаем оригинальное сообщение
      await ctx.forwardMessage(SUPPORT_CHAT_ID)
    } catch (fwdErr: any) {
      console.error(`[bot] Failed to forward help message: ${fwdErr.message}`)
    }

    // Сбрасываем состояние
    await prisma.user.update({
      where: { telegramId: tgId },
      data: { botState: BotState.COMPLETED }
    })

    return ctx.reply(MSG_HELP_SENT)
  }

  // Обработка ответа администратора на сообщение пользователя
  if (tgId === SUPPORT_CHAT_ID && ctx.message.reply_to_message?.forward_from) {
    const targetUserId = ctx.message.reply_to_message.forward_from.id.toString()
    try {
      await bot.api.sendMessage(targetUserId, `💬 <b>Ответ поддержки:</b>\n\n${text}`, { parse_mode: 'HTML' })
      return ctx.reply(MSG_SUPPORT_REPLY_SENT)
    } catch (replyErr: any) {
      console.error(`[bot] Failed to send support reply: ${replyErr.message}`)
      return ctx.reply(MSG_SUPPORT_REPLY_ERROR)
    }
  }

  // Неизвестное состояние
  return ctx.reply(MSG_USE_START_SHORT)
})

// ШАГ 3: Обработка выбора масштаба -> Авто-создание всего
bot.on('callback_query:data', async (ctx) => {
  const tgId = ctx.from.id.toString()
  const user = await prisma.user.findUnique({ where: { telegramId: tgId } })

  if (!user) {
    await ctx.answerCallbackQuery({ text: MSG_START_CALLBACK })
    return
  }

  const data = ctx.callbackQuery.data

  // Обработка выбора масштаба → показать пример отчёта
  if (data.startsWith('scale_') && user.botState === BotState.WAITING_SCALE) {
    await ctx.answerCallbackQuery()

    // Отправляем пример отчёта
    await ctx.reply(MSG_EXAMPLE_REPORT, { parse_mode: 'HTML' })

    // Кнопка "Поехали"
    const confirmKeyboard = new InlineKeyboard()
      .text(BTN_LETS_GO, 'lets_go')

    await ctx.reply('👆 Готовы запустить систему в вашем ресторане?', {
      reply_markup: confirmKeyboard
    })

    // Переход в WAITING_CONFIRM
    await prisma.user.update({
      where: { telegramId: tgId },
      data: { botState: BotState.WAITING_CONFIRM }
    })

    return
  }

  // Обработка кнопки "Поехали" → создание орг/ресторана/группы
  if (data === 'lets_go' && user.botState === BotState.WAITING_CONFIRM) {
    await ctx.answerCallbackQuery()

    const orgName = user.tempOrgName || 'Мой ресторан'

    try {
      await ctx.reply(MSG_CONFIGURING)

      // Ищем триальный тариф
      const trialTariff = await prisma.tariff.findFirst({
        where: { isActive: true, deletedAt: null },
        orderBy: { price: 'asc' }
      })

      const now = new Date()
      const trialDays = trialTariff?.period ?? 7
      const trialEndsAt = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000)

      // Создаем организацию + биллинг + ресторан в транзакции
      const { org, restaurant } = await prisma.$transaction(async (tx) => {
        const org = await tx.organization.create({
          data: {
            id: createId(),
            name: orgName,
            createdBy: user.login || user.telegramId || user.id,
            billing: {
              create: {
                id: createId(),
                status: 'TRIAL',
                trialStartsAt: now,
                trialEndsAt,
                tariffId: trialTariff?.id || null,
                createdBy: user.login || user.telegramId || user.id
              }
            }
          }
        })

        const restaurant = await tx.restaurant.create({
          data: {
            id: createId(),
            name: orgName,
            organizationId: org.id,
            createdBy: user.login || user.telegramId || user.id
          }
        })

        await tx.user.update({
          where: { telegramId: tgId },
          data: {
            organizationId: org.id,
            restaurantId: restaurant.id,
            login: `owner_${tgId.slice(-6)}`,
            role: UserRole.OWNER
          }
        })

        return { org, restaurant }
      })

      // Создание группы через userbot
      try {
        await ctx.replyWithChatAction('typing')

        // Антифрод проверки
        await checkAndIncrement(user.id, 'create_group')
        const isSuspicious = await detectSuspiciousActivity(user.id)
        if (isSuspicious) {
          throw new Error('Обнаружена подозрительная активность')
        }

        const groupResult = await createRestaurantGroup(
          orgName,
          tgId,
          restaurant.id,
          org.id,
          orgName
        )

        if (!groupResult.success) {
          throw new Error(groupResult.error || 'Неизвестная ошибка')
        }

        // Сохранение chatId
        await prisma.restaurant.update({
          where: { id: restaurant.id },
          data: {
            settingsComment: JSON.stringify({
              telegramChatId: groupResult.chatId,
              chatTitle: groupResult.chatTitle,
              createdByUserbot: true
            })
          }
        })

        // Отправляем инструкцию в группу и закрепляем
        try {
          const rawChatId = groupResult.chatId.toString()
          const botChatId = rawChatId.startsWith('-') ? rawChatId : `-100${rawChatId}`

          const instructionMsg = await bot.api.sendMessage(
            botChatId,
            MSG_GROUP_INSTRUCTION(orgName),
            { parse_mode: 'HTML' }
          )
          await bot.api.pinChatMessage(botChatId, instructionMsg.message_id)
          console.log(`[bot] Instruction sent and pinned in group ${groupResult.chatId}`)
        } catch (instrErr: any) {
          console.warn(`[bot] Failed to send instruction to group: ${instrErr.message}`)
        }

        // COMPLETED
        await prisma.user.update({
          where: { telegramId: tgId },
          data: { botState: BotState.COMPLETED }
        })

        // Помечаем лид как сконвертированный
        if (user.phone) {
          try {
            await prisma.lead.updateMany({
              where: { telegramId: tgId, phone: user.phone },
              data: { converted: true }
            })
          } catch {}
        }

        // Формируем инфо о тарифе
        const tariffInfo = trialTariff
          ? `\n\nВаш тариф: <b>Триал</b> — ${trialTariff.period} дней, ${trialTariff.maxTranscriptions} транскрипций`
          : ''

        const setupCompleteMsg = MSG_SETUP_COMPLETE(orgName, groupResult.chatTitle, tariffInfo)

        // Отправляем в личку владельцу
        await ctx.reply(setupCompleteMsg, { parse_mode: 'HTML' })

        // Дублируем в группу ресторана
        try {
          const rawChatId2 = groupResult.chatId.toString()
          const botChatId2 = rawChatId2.startsWith('-') ? rawChatId2 : `-100${rawChatId2}`
          await bot.api.sendMessage(botChatId2, setupCompleteMsg, { parse_mode: 'HTML' })
        } catch (grpErr: any) {
          console.warn(`[bot] Failed to send setup complete to group: ${grpErr.message}`)
        }
      } catch (error: any) {
        console.error('Ошибка создания группы через userbot:', error)

        // Группа не создалась, но организация готова — ставим COMPLETED
        await prisma.user.update({
          where: { telegramId: tgId },
          data: { botState: BotState.COMPLETED }
        })

        await ctx.reply(MSG_SETUP_NO_GROUP(orgName), { parse_mode: 'HTML' })
      }
    } catch (error: any) {
      console.error('Ошибка создания организации:', error)
      await ctx.reply(MSG_SETUP_ERROR)
    }

    return
  }

  // Обработка переключения дня расписания
  if (data.startsWith('sched_day:')) {
    await ctx.answerCallbackQuery()
    const dayNum = parseInt(data.replace('sched_day:', ''))

    const chatId = ctx.chat?.id.toString()
    if (!chatId) return
    const schedRestaurant = await findRestaurantByChatId(chatId)
    if (!schedRestaurant) return

    // Парсим текущие настройки
    let settings: Record<string, any> = {}
    if (schedRestaurant.settingsComment) {
      try { settings = JSON.parse(schedRestaurant.settingsComment) } catch {}
    }
    const schedule = settings.reportSchedule || { days: [], time: '17:00' }

    // Выбор одного дня (заменяет предыдущий)
    schedule.days = [dayNum]
    settings.reportSchedule = schedule

    // Сохраняем промежуточное состояние
    await prisma.restaurant.update({
      where: { id: schedRestaurant.id },
      data: { settingsComment: JSON.stringify(settings) }
    })

    // Обновляем клавиатуру
    const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
    const kb = new InlineKeyboard()
    for (let d = 1; d <= 4; d++) {
      kb.text(schedule.days.includes(d) ? `✅ ${dayNames[d - 1]}` : dayNames[d - 1], `sched_day:${d}`)
    }
    kb.row()
    for (let d = 5; d <= 7; d++) {
      kb.text(schedule.days.includes(d) ? `✅ ${dayNames[d - 1]}` : dayNames[d - 1], `sched_day:${d}`)
    }
    kb.row()
    kb.text(BTN_SELECT_TIME, 'sched_time_menu').row()
    kb.text(BTN_SAVE, 'sched_save')

    const timeInfo = schedule.days.length > 0
      ? `\n\nТекущее расписание: ${schedule.days.map((d: number) => dayNames[d - 1]).join(', ')} в ${schedule.time}`
      : '\n\nРасписание не настроено'

    try {
      await ctx.editMessageText(MSG_SCHEDULE(schedRestaurant.name, timeInfo), { parse_mode: 'HTML', reply_markup: kb })
    } catch {}

    return
  }

  // Меню выбора времени
  if (data === 'sched_time_menu') {
    await ctx.answerCallbackQuery()

    const chatId = ctx.chat?.id.toString()
    if (!chatId) return
    const timeRestaurant = await findRestaurantByChatId(chatId)
    if (!timeRestaurant) return

    let currentTime = '17:00'
    if (timeRestaurant.settingsComment) {
      try {
        const s = JSON.parse(timeRestaurant.settingsComment)
        if (s.reportSchedule?.time) currentTime = s.reportSchedule.time
      } catch {}
    }

    // Кнопки времени: по 3 в ряд, чтобы помещались в Telegram
    const timeRows = [
      ['09:00', '12:00', '15:00'],
      ['17:00', '19:00', '21:00'],
    ]
    const kb = new InlineKeyboard()
    for (const row of timeRows) {
      for (const t of row) {
        kb.text(t === currentTime ? `✅ ${t}` : t, `sched_time:${t}`)
      }
      kb.row()
    }
    kb.text(BTN_BACK_TO_DAYS, 'sched_back')

    try {
      await ctx.editMessageText(MSG_SCHEDULE_TIME(currentTime), { parse_mode: 'HTML', reply_markup: kb })
    } catch {}

    return
  }

  // Выбор конкретного времени
  if (data.startsWith('sched_time:')) {
    await ctx.answerCallbackQuery()
    const selectedTime = data.replace('sched_time:', '')

    const chatId = ctx.chat?.id.toString()
    if (!chatId) return
    const selTimeRestaurant = await findRestaurantByChatId(chatId)
    if (!selTimeRestaurant) return

    let settings: Record<string, any> = {}
    if (selTimeRestaurant.settingsComment) {
      try { settings = JSON.parse(selTimeRestaurant.settingsComment) } catch {}
    }
    const schedule = settings.reportSchedule || { days: [], time: '17:00' }
    schedule.time = selectedTime
    settings.reportSchedule = schedule

    await prisma.restaurant.update({
      where: { id: selTimeRestaurant.id },
      data: { settingsComment: JSON.stringify(settings) }
    })

    // Возвращаемся к меню дней
    const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
    const kb = new InlineKeyboard()
    for (let d = 1; d <= 4; d++) {
      kb.text(schedule.days.includes(d) ? `✅ ${dayNames[d - 1]}` : dayNames[d - 1], `sched_day:${d}`)
    }
    kb.row()
    for (let d = 5; d <= 7; d++) {
      kb.text(schedule.days.includes(d) ? `✅ ${dayNames[d - 1]}` : dayNames[d - 1], `sched_day:${d}`)
    }
    kb.row()
    kb.text(BTN_SELECT_TIME, 'sched_time_menu').row()
    kb.text(BTN_SAVE, 'sched_save')

    const timeInfo = schedule.days.length > 0
      ? `\n\nТекущее расписание: ${schedule.days.map((d: number) => dayNames[d - 1]).join(', ')} в ${selectedTime}`
      : '\n\nРасписание не настроено'

    try {
      await ctx.editMessageText(MSG_SCHEDULE(selTimeRestaurant.name, timeInfo), { parse_mode: 'HTML', reply_markup: kb })
    } catch {}

    return
  }

  // Кнопка "Назад" из меню времени
  if (data === 'sched_back') {
    await ctx.answerCallbackQuery()

    const chatId = ctx.chat?.id.toString()
    if (!chatId) return
    const backRestaurant = await findRestaurantByChatId(chatId)
    if (!backRestaurant) return

    let schedule = { days: [] as number[], time: '17:00' }
    if (backRestaurant.settingsComment) {
      try {
        const s = JSON.parse(backRestaurant.settingsComment)
        if (s.reportSchedule) schedule = s.reportSchedule
      } catch {}
    }

    const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
    const kb = new InlineKeyboard()
    for (let d = 1; d <= 4; d++) {
      kb.text(schedule.days.includes(d) ? `✅ ${dayNames[d - 1]}` : dayNames[d - 1], `sched_day:${d}`)
    }
    kb.row()
    for (let d = 5; d <= 7; d++) {
      kb.text(schedule.days.includes(d) ? `✅ ${dayNames[d - 1]}` : dayNames[d - 1], `sched_day:${d}`)
    }
    kb.row()
    kb.text(BTN_SELECT_TIME, 'sched_time_menu').row()
    kb.text(BTN_SAVE, 'sched_save')

    const timeInfo = schedule.days.length > 0
      ? `\n\nТекущее расписание: ${schedule.days.map((d: number) => dayNames[d - 1]).join(', ')} в ${schedule.time}`
      : '\n\nРасписание не настроено'

    try {
      await ctx.editMessageText(MSG_SCHEDULE(backRestaurant.name, timeInfo), { parse_mode: 'HTML', reply_markup: kb })
    } catch {}

    return
  }

  // Сохранение расписания
  if (data === 'sched_save') {
    await ctx.answerCallbackQuery({ text: MSG_SCHEDULE_SAVED_TOAST })

    const chatId = ctx.chat?.id.toString()
    if (!chatId) return
    const saveRestaurant = await findRestaurantByChatId(chatId)
    if (!saveRestaurant) return

    let schedule = { days: [] as number[], time: '17:00' }
    if (saveRestaurant.settingsComment) {
      try {
        const s = JSON.parse(saveRestaurant.settingsComment)
        if (s.reportSchedule) schedule = s.reportSchedule
      } catch {}
    }

    const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

    if (schedule.days.length === 0) {
      try {
        await ctx.editMessageText(
          MSG_SCHEDULE_DISABLED(saveRestaurant.name),
          { parse_mode: 'HTML' }
        )
      } catch {}
    } else {
      try {
        await ctx.editMessageText(
          MSG_SCHEDULE_SAVED(saveRestaurant.name, schedule.days.map((d: number) => dayNames[d - 1]).join(', '), schedule.time),
          { parse_mode: 'HTML' }
        )
      } catch {}
    }

    return
  }

  // Обработка покупки подписки
  if (data.startsWith('buy_subscription:')) {
    await ctx.answerCallbackQuery()
    const orgId = data.replace('buy_subscription:', '')

    try {
      // Находим организацию и тариф
      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        include: { billing: { include: { tariff: true } } }
      })

      if (!org) {
        await ctx.reply(MSG_ORG_NOT_FOUND)
        return
      }

      // Ищем активный тариф для оплаты
      const tariff = await prisma.tariff.findFirst({
        where: { isActive: true, deletedAt: null },
        orderBy: { price: 'desc' }
      })

      if (!tariff) {
        await ctx.reply(MSG_TARIFF_NOT_FOUND)
        return
      }

      // Создаём платёж
      const paymentId = createId()
      const payment = await prisma.payment.create({
        data: {
          id: paymentId,
          organizationId: orgId,
          tariffId: tariff.id,
          amount: tariff.price,
          status: 'PENDING',
          createdBy: tgId
        }
      })

      // Создаём платёж в Тинькофф
      const tinkoff = await createTinkoffPayment({
        orderId: paymentId,
        amount: tariff.price,
        description: `Подписка RestoWorker — ${org.name}`,
        paymentId
      })

      // Обновляем платёж с ID от Тинькофф
      await prisma.payment.update({
        where: { id: paymentId },
        data: { providerPaymentId: tinkoff.paymentId }
      })

      // Отправляем ссылку на оплату пользователю в личку
      await bot.api.sendMessage(
        tgId,
        MSG_PAYMENT_LINK(org.name, tariff.name, tariff.price, tinkoff.paymentUrl),
        { parse_mode: 'HTML' }
      )

      await ctx.editMessageText(MSG_PAYMENT_SENT)
    } catch (error: any) {
      console.error('[bot] Buy subscription error:', error.message)
      await ctx.reply(MSG_PAYMENT_ERROR)
    }

    return
  }

})

// --- ГОЛОСОВЫЕ СООБЩЕНИЯ В ГРУППЕ ---

// Обработка голосовых (voice) и аудио (audio) сообщений
bot.on(['message:voice', 'message:audio'], async (ctx) => {
  const chatId = ctx.chat.id.toString()
  const tgUserId = ctx.from?.id.toString()

  // Работаем только в группах (не в личке)
  if (ctx.chat.type === 'private') {
    return
  }

  console.log(`[bot] Voice message received in chat ${chatId} from user ${tgUserId}`)

  // Ищем ресторан по chatId через хелпер
  const restaurant = await findRestaurantByChatId(chatId)

  if (!restaurant) {
    console.log(`[bot] No restaurant found for chat ${chatId}, ignoring voice message`)
    return
  }

  // Ищем пользователя
  const user = tgUserId
    ? await prisma.user.findUnique({ where: { telegramId: tgUserId } })
    : null

  // Проверяем лимит транскрипций
  const billing = await prisma.billing.findUnique({
    where: { organizationId: restaurant.organizationId },
    include: { tariff: true }
  })

  if (billing) {
    const maxTranscriptions = billing.tariff?.maxTranscriptions ?? 100
    if (billing.transcriptionsUsed >= maxTranscriptions) {
      console.log(`[bot] Transcription limit reached for org ${restaurant.organizationId}: ${billing.transcriptionsUsed}/${maxTranscriptions}`)
      await ctx.reply(
        MSG_TRANSCRIPTION_LIMIT,
        { reply_to_message_id: ctx.message.message_id }
      )
      return
    }

    // Проверяем что триал/подписка не истекли
    const now = new Date()
    if (billing.status === 'TRIAL' && billing.trialEndsAt && billing.trialEndsAt < now) {
      const buyKeyboard = new InlineKeyboard()
        .text(BTN_BUY_SUBSCRIPTION, `buy_subscription:${restaurant.organizationId}`)

      await ctx.reply(
        MSG_SUBSCRIPTION_EXPIRED,
        {
          reply_to_message_id: ctx.message.message_id,
          reply_markup: buyKeyboard
        }
      )
      return
    }
    if (billing.status === 'ACTIVE' && billing.activeUntil && billing.activeUntil < now) {
      const buyKeyboard = new InlineKeyboard()
        .text(BTN_BUY_SUBSCRIPTION, `buy_subscription:${restaurant.organizationId}`)

      await ctx.reply(
        MSG_SUBSCRIPTION_EXPIRED,
        {
          reply_to_message_id: ctx.message.message_id,
          reply_markup: buyKeyboard
        }
      )
      return
    }
    if (billing.status === 'DISABLED') {
      await ctx.reply(
        MSG_BILLING_DISABLED,
        { reply_to_message_id: ctx.message.message_id }
      )
      return
    }
  }

  // Получаем file_id
  const voice = ctx.message.voice || ctx.message.audio
  if (!voice) return

  const fileId = voice.file_id
  const duration = voice.duration || 0
  const fileSize = voice.file_size || null
  const mimeType = voice.mime_type || 'audio/ogg'

  // Сохраняем голосовое в БД
  const voiceMessage = await prisma.voiceMessage.create({
    data: {
      id: createId(),
      telegramFileId: fileId,
      telegramChatId: chatId,
      duration,
      fileSize,
      mimeType,
      restaurantId: restaurant.id,
      userId: user?.id || null,
      status: 'RECEIVED'
    }
  })

  console.log(`[bot] VoiceMessage saved: ${voiceMessage.id}, duration: ${duration}s, restaurant: ${restaurant.name}`)

  // Отправляем реакцию "обрабатываем"
  await ctx.replyWithChatAction('typing')

  // Транскрибируем асинхронно
  try {
    // Обновляем статус
    await prisma.voiceMessage.update({
      where: { id: voiceMessage.id },
      data: { status: 'TRANSCRIBING' }
    })

    // Скачиваем файл из Telegram
    console.log(`[bot] Voice: downloading file ${fileId}...`)
    const audioBuffer = await downloadTelegramFile(fileId)
    console.log(`[bot] Voice: file downloaded, size=${audioBuffer.length} bytes`)

    // Транскрибируем через Whisper
    console.log(`[bot] Voice: transcribing audio (${duration}s)...`)
    const result = await transcribeAudio(audioBuffer, `voice_${voiceMessage.id}.ogg`)

    if (!result.text || result.text.trim().length === 0) {
      throw new Error('Whisper вернул пустую транскрипцию')
    }

    console.log(`[bot] Voice: transcribed, text=${result.text.length} chars`)

    // Сохраняем транскрипцию
    const transcript = await prisma.transcript.create({
      data: {
        id: createId(),
        text: result.text,
        language: result.language || 'ru',
        durationMs: result.durationMs,
        voiceMessageId: voiceMessage.id,
        restaurantId: restaurant.id,
        userId: user?.id || null
      }
    })

    // Обновляем статус голосового
    await prisma.voiceMessage.update({
      where: { id: voiceMessage.id },
      data: { status: 'TRANSCRIBED' }
    })

    // Увеличиваем счётчик транскрипций
    if (billing) {
      await prisma.billing.update({
        where: { id: billing.id },
        data: { transcriptionsUsed: { increment: 1 } }
      })
    }

    console.log(`[bot] Transcript saved: ${transcript.id}, length: ${result.text.length} chars`)

    // Отправляем подтверждение с превью текста
    const preview = result.text.length > 200
      ? result.text.substring(0, 200) + '...'
      : result.text

    await ctx.reply(
      MSG_TRANSCRIPTION_DONE(duration, preview),
      { reply_to_message_id: ctx.message.message_id }
    )

    // Удаляем оригинальное голосовое сообщение
    try {
      await bot.api.deleteMessage(ctx.chat.id, ctx.message.message_id)
      console.log(`[bot] Original voice message deleted from chat ${chatId}`)
    } catch (delErr: any) {
      console.warn(`[bot] Failed to delete voice message: ${delErr.message}`)
    }

  } catch (error: any) {
    console.error(`[bot] Transcription failed for voice ${voiceMessage.id}:`, error.message)

    // Сохраняем ошибку
    await prisma.voiceMessage.update({
      where: { id: voiceMessage.id },
      data: {
        status: 'FAILED',
        error: error.message
      }
    })

    await ctx.reply(
      MSG_TRANSCRIPTION_ERROR,
      { reply_to_message_id: ctx.message.message_id }
    )
  }
})

// --- ИНИЦИАЛИЗАЦИЯ ---

// Инициализация бота (только один раз)
let botInitialized = false
async function ensureBotInitialized() {
  if (!botInitialized) {
    await bot.init()
    botInitialized = true
  }
}

// Экспорт обработчика для Nuxt
export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  // Логируем входящие апдейты для отладки
  console.log(`[webhook] ${JSON.stringify({
    update_id: body.update_id,
    chat_id: body.message?.chat?.id,
    chat_type: body.message?.chat?.type,
    voice: !!body.message?.voice,
    audio: !!body.message?.audio,
    text: body.message?.text?.substring(0, 30)
  })}`)

  try {
    await ensureBotInitialized()
    await bot.handleUpdate(body)
  } catch (err) {
    console.error('Bot Error:', err)
  }

  return { ok: true }
})
