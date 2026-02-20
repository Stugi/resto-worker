import { InlineKeyboard, Keyboard } from 'grammy'
import { createId } from '@paralleldrive/cuid2'
import { BotState } from '../../types/bot'
import { UserRole } from '#shared/constants/roles'

// --- ХЕЛПЕРЫ ---

// Поиск ресторана по chatId группы (из settingsComment.telegramChatId)
async function findRestaurantByChatId(chatId: string) {
  const restaurants = await prisma.restaurant.findMany({
    where: { deletedAt: null, settingsComment: { not: null } },
    select: { id: true, name: true, organizationId: true, settingsComment: true }
  })
  return restaurants.find(r => {
    try {
      const settings = JSON.parse(r.settingsComment!)
      return settings.telegramChatId?.toString() === chatId
    } catch { return false }
  }) || null
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

    await ctx.reply(
      `<b>Привет, ${firstName}!</b>\n\n` +
      `У тебя уже есть организация: <b>${orgName}</b>\n` +
      `Ресторан: <b>${restName}</b>\n\n` +
      `📊 /report — получить отчёт за 24ч\n` +
      `⚙️ /settings — расписание отчётов\n\n` +
      `<i>Отправляй голосовые в группу для транскрипции!</i>`,
      { parse_mode: 'HTML' }
    )
    return
  }

  // Новый пользователь или без организации — запускаем онбординг
  await prisma.user.upsert({
    where: { telegramId: tgId },
    update: { botState: BotState.WAITING_CONTACT },
    create: {
      id: createId(),
      telegramId: tgId,
      botState: BotState.WAITING_CONTACT,
      role: UserRole.OWNER,
      createdBy: 'telegram_bot'
    }
  })

  const contactKeyboard = new Keyboard()
    .requestContact('Поделиться номером')
    .resized()
    .oneTime()

  await ctx.reply(
    `<b>Добро пожаловать в RestoWorker!</b>\n\n` +
    `Привет, ${firstName}!\n\n` +
    `Я помогу настроить систему управления твоим рестораном за пару минут.\n\n` +
    `<b>Для начала поделись своим номером телефона:</b>`,
    {
      parse_mode: 'HTML',
      reply_markup: contactKeyboard
    }
  )
})

// Команда /settings - настройка расписания отчётов (только в группе)
bot.command('settings', async (ctx) => {
  // Работает только в группе
  if (ctx.chat.type === 'private') {
    await ctx.reply('Команда /settings доступна только в группе ресторана')
    return
  }

  const chatId = ctx.chat.id.toString()
  const restaurant = await findRestaurantByChatId(chatId)

  if (!restaurant) {
    await ctx.reply('Эта группа не привязана к ресторану.')
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

  keyboard.text('⏰ Выбрать время', 'sched_time_menu').row()
  keyboard.text('💾 Сохранить', 'sched_save')

  const timeInfo = currentSchedule.days.length > 0
    ? `\n\nТекущее расписание: ${currentSchedule.days.map(d => dayNames[d - 1]).join(', ')} в ${currentSchedule.time}`
    : '\n\nРасписание не настроено'

  await ctx.reply(
    `⚙️ <b>Расписание отчётов</b>\n` +
    `Ресторан: <b>${restaurant.name}</b>\n\n` +
    `Выберите дни, в которые нужен автоматический отчёт:` +
    timeInfo,
    { parse_mode: 'HTML', reply_markup: keyboard }
  )
})

// Команда /report - мгновенный отчёт за последние 24ч (только в группе)
bot.command('report', async (ctx) => {
  const tgId = ctx.from.id.toString()

  // Работает только в группе
  if (ctx.chat.type === 'private') {
    await ctx.reply('Команда /report доступна только в группе ресторана')
    return
  }

  const chatId = ctx.chat.id.toString()
  const restaurant = await findRestaurantByChatId(chatId)

  if (!restaurant) {
    await ctx.reply('Эта группа не привязана к ресторану.')
    return
  }

  await ctx.replyWithChatAction('typing')

  const now = new Date()
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  // Получаем транскрипции за 24ч
  const transcripts = await prisma.transcript.findMany({
    where: {
      restaurantId: restaurant.id,
      createdAt: { gte: dayAgo, lte: now }
    },
    include: {
      user: { select: { name: true } },
      voiceMessage: { select: { duration: true } }
    },
    orderBy: { createdAt: 'asc' }
  })

  if (transcripts.length === 0) {
    await ctx.reply('За последние 24 часа нет транскрипций для формирования отчёта.')
    return
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
    await ctx.reply('Нет доступного промпта для генерации отчёта. Обратитесь к администратору.')
    return
  }

  try {
    await ctx.reply(`📊 Генерирую отчёт по ${transcripts.length} транскрипциям...`)

    const transcriptsText = transcripts.map((t, i) => {
      const date = t.createdAt.toLocaleDateString('ru-RU')
      const time = t.createdAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
      const author = t.user?.name || 'Неизвестный'
      const duration = t.voiceMessage?.duration ? `${t.voiceMessage.duration}с` : ''
      return `--- Отчёт #${i + 1} (${date} ${time}, ${author}, ${duration}) ---\n${t.text}`
    }).join('\n\n')

    const result = await generateReport({
      template: prompt.template,
      variables: {
        restaurant_name: restaurant.name,
        period_start: dayAgo.toLocaleDateString('ru-RU'),
        period_end: now.toLocaleDateString('ru-RU'),
        transcripts: transcriptsText
      }
    })

    // Сохраняем отчёт в БД
    const reportId = createId()
    await prisma.report.create({
      data: {
        id: reportId,
        title: `Отчёт за ${dayAgo.toLocaleDateString('ru-RU')} — ${now.toLocaleDateString('ru-RU')}`,
        content: result.content,
        summary: result.summary,
        status: 'COMPLETED',
        periodStart: dayAgo,
        periodEnd: now,
        restaurantId: restaurant.id,
        promptId: prompt.id,
        model: result.model,
        tokensUsed: result.tokensUsed,
        generationTimeMs: result.generationTimeMs,
        createdBy: tgId
      }
    })

    // Telegram ограничение: 4096 символов на сообщение
    const maxLen = 4000
    if (result.content.length <= maxLen) {
      await ctx.reply(result.content, { parse_mode: 'Markdown' })
    } else {
      const parts = []
      let remaining = result.content
      while (remaining.length > 0) {
        parts.push(remaining.slice(0, maxLen))
        remaining = remaining.slice(maxLen)
      }
      for (const part of parts) {
        await ctx.reply(part, { parse_mode: 'Markdown' })
      }
    }
  } catch (error: any) {
    console.error('[bot] /report error:', error.message)
    await ctx.reply('Ошибка при генерации отчёта. Попробуйте позже.')
  }
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
      `У тебя уже есть организация: <b>${user.organization?.name || 'Без имени'}</b>\n\n` +
      `Повторная регистрация невозможна.\n` +
      `📊 /report — получить отчёт\n` +
      `⚙️ /settings — расписание отчётов`,
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
    await ctx.reply(
      'Этот номер телефона уже используется в другой организации.\n\n' +
      'Для регистрации используй другой номер.',
      { reply_markup: { remove_keyboard: true } }
    )

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

  await ctx.reply(
    'Отлично! Номер сохранен.\n\n' +
    '<b>Как называется твоя сеть ресторанов?</b>\n' +
    '<i>(например: "Пицца и Суши" или "Мой ресторан")</i>',
    {
      parse_mode: 'HTML',
      reply_markup: { remove_keyboard: true }
    }
  )
})

// ШАГ 2: Обработка текстовых сообщений (имя организации)
bot.on('message:text', async (ctx) => {
  const tgId = ctx.from.id.toString()
  const user = await prisma.user.findUnique({ where: { telegramId: tgId } })
  const text = ctx.message.text

  if (!user) {
    return ctx.reply('Напиши /start для начала работы')
  }

  // Ожидаем название организации
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

    return ctx.reply(
      `<b>"${text}"</b> — отличное название!\n\n` +
      `<b>Сколько у вас сейчас точек?</b>`,
      {
        parse_mode: 'HTML',
        reply_markup: keyboard
      }
    )
  }

  // Неизвестное состояние
  return ctx.reply('Используй /start для начала')
})

// ШАГ 3: Обработка выбора масштаба -> Авто-создание всего
bot.on('callback_query:data', async (ctx) => {
  const tgId = ctx.from.id.toString()
  const user = await prisma.user.findUnique({ where: { telegramId: tgId } })

  if (!user) {
    await ctx.answerCallbackQuery({ text: 'Начни с /start' })
    return
  }

  const data = ctx.callbackQuery.data

  // Обработка выбора масштаба
  if (data.startsWith('scale_') && user.botState === BotState.WAITING_SCALE) {
    await ctx.answerCallbackQuery()

    const orgName = user.tempOrgName || 'Мой ресторан'

    try {
      await ctx.reply('Настраиваю систему...')

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

        // Ресторан создается автоматически с именем организации
        const restaurant = await tx.restaurant.create({
          data: {
            id: createId(),
            name: orgName,
            organizationId: org.id,
            createdBy: user.login || user.telegramId || user.id
          }
        })

        // Обновляем пользователя
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
          const botChatId = `-${groupResult.chatId}`
          const instructionText =
            `👋 Добро пожаловать в группу отчётов!\n\n` +
            `📝 Как пользоваться:\n` +
            `1. Отправляйте голосовые сообщения с отчётом о работе\n` +
            `2. Бот автоматически транскрибирует их в текст\n` +
            `3. На основе транскрипций формируются аналитические отчёты\n\n` +
            `🎤 Просто запишите голосовое — всё остальное сделаю я!`

          const instructionMsg = await bot.api.sendMessage(botChatId, instructionText)
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

        // TODO: раскомментировать когда будет готова админка
        // const adminUrl = process.env.APP_URL || 'https://restoworker.ru'
        // const password = `rw_${tgId.slice(-6)}`
        // await ctx.reply(
        //   `<b>Данные для входа в админ-панель:</b>\n\n` +
        //   `Ссылка: ${adminUrl}\n` +
        //   `Логин: owner_${tgId.slice(-6)}\n` +
        //   `Пароль: ${password}\n\n` +
        //   `<i>Сохрани эти данные!</i>`,
        //   { parse_mode: 'HTML' }
        // )

        // Формируем инфо о тарифе
        const tariffInfo = trialTariff
          ? `\n\nВаш тариф: <b>Триал</b> — ${trialTariff.period} дней, ${trialTariff.maxTranscriptions} транскрипций`
          : ''

        await ctx.reply(
          `<b>Все готово!</b>\n\n` +
          `Организация: <b>${orgName}</b>\n` +
          `Ресторан: <b>${orgName}</b>\n` +
          `Группа: <b>${groupResult.chatTitle}</b>\n\n` +
          `<b>Что делать дальше:</b>\n\n` +
          `1. Отправляй голосовые отчеты в созданную группу\n` +
          `2. Я буду транскрибировать их и формировать еженедельные отчеты\n` +
          `3. Добавляй менеджеров в группу — они тоже смогут отправлять отчеты` +
          tariffInfo +
          `\n\n<i>Если есть вопросы — пиши сюда!</i>`,
          { parse_mode: 'HTML' }
        )
      } catch (error: any) {
        console.error('Ошибка создания группы через userbot:', error)

        // Группа не создалась, но организация готова — ставим COMPLETED
        await prisma.user.update({
          where: { telegramId: tgId },
          data: { botState: BotState.COMPLETED }
        })

        await ctx.reply(
          `<b>Организация "${orgName}" создана!</b>\n\n` +
          `Группу для отчетов создадим чуть позже.\n\n` +
          `<i>Если есть вопросы — пиши сюда!</i>`,
          { parse_mode: 'HTML' }
        )
      }
    } catch (error: any) {
      console.error('Ошибка создания организации:', error)
      await ctx.reply(
        'Произошла ошибка при настройке. Попробуй еще раз: /start'
      )
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

    // Toggle день
    const idx = schedule.days.indexOf(dayNum)
    if (idx >= 0) {
      schedule.days.splice(idx, 1)
    } else {
      schedule.days.push(dayNum)
      schedule.days.sort((a: number, b: number) => a - b)
    }
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
    kb.text('⏰ Выбрать время', 'sched_time_menu').row()
    kb.text('💾 Сохранить', 'sched_save')

    const timeInfo = schedule.days.length > 0
      ? `\n\nТекущее расписание: ${schedule.days.map((d: number) => dayNames[d - 1]).join(', ')} в ${schedule.time}`
      : '\n\nРасписание не настроено'

    try {
      await ctx.editMessageText(
        `⚙️ <b>Расписание отчётов</b>\n` +
        `Ресторан: <b>${schedRestaurant.name}</b>\n\n` +
        `Выберите дни, в которые нужен автоматический отчёт:` +
        timeInfo,
        { parse_mode: 'HTML', reply_markup: kb }
      )
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

    const times = ['10:00', '13:00', '17:00', '19:00', '21:00']
    const kb = new InlineKeyboard()
    for (const t of times) {
      kb.text(t === currentTime ? `✅ ${t}` : t, `sched_time:${t}`)
    }
    kb.row()
    kb.text('← Назад к дням', 'sched_back')

    try {
      await ctx.editMessageText(
        `⏰ <b>Выберите время отправки отчёта:</b>\n\n` +
        `Текущее время: <b>${currentTime}</b> (МСК)`,
        { parse_mode: 'HTML', reply_markup: kb }
      )
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
    kb.text('⏰ Выбрать время', 'sched_time_menu').row()
    kb.text('💾 Сохранить', 'sched_save')

    const timeInfo = schedule.days.length > 0
      ? `\n\nТекущее расписание: ${schedule.days.map((d: number) => dayNames[d - 1]).join(', ')} в ${selectedTime}`
      : '\n\nРасписание не настроено'

    try {
      await ctx.editMessageText(
        `⚙️ <b>Расписание отчётов</b>\n` +
        `Ресторан: <b>${selTimeRestaurant.name}</b>\n\n` +
        `Выберите дни, в которые нужен автоматический отчёт:` +
        timeInfo,
        { parse_mode: 'HTML', reply_markup: kb }
      )
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
    kb.text('⏰ Выбрать время', 'sched_time_menu').row()
    kb.text('💾 Сохранить', 'sched_save')

    const timeInfo = schedule.days.length > 0
      ? `\n\nТекущее расписание: ${schedule.days.map((d: number) => dayNames[d - 1]).join(', ')} в ${schedule.time}`
      : '\n\nРасписание не настроено'

    try {
      await ctx.editMessageText(
        `⚙️ <b>Расписание отчётов</b>\n` +
        `Ресторан: <b>${backRestaurant.name}</b>\n\n` +
        `Выберите дни, в которые нужен автоматический отчёт:` +
        timeInfo,
        { parse_mode: 'HTML', reply_markup: kb }
      )
    } catch {}

    return
  }

  // Сохранение расписания
  if (data === 'sched_save') {
    await ctx.answerCallbackQuery({ text: 'Расписание сохранено!' })

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
          `⚙️ <b>Расписание отчётов отключено</b>\n\n` +
          `Ресторан: ${saveRestaurant.name}\n\n` +
          `Автоматические отчёты не будут генерироваться.\n` +
          `Чтобы настроить — используй /settings`,
          { parse_mode: 'HTML' }
        )
      } catch {}
    } else {
      try {
        await ctx.editMessageText(
          `✅ <b>Расписание сохранено!</b>\n\n` +
          `Ресторан: ${saveRestaurant.name}\n` +
          `Дни: <b>${schedule.days.map((d: number) => dayNames[d - 1]).join(', ')}</b>\n` +
          `Время: <b>${schedule.time}</b> (МСК)\n\n` +
          `Отчёты будут автоматически генерироваться и отправляться в эту группу.\n` +
          `Чтобы изменить — используй /settings`,
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
        await ctx.reply('Организация не найдена')
        return
      }

      // Ищем активный тариф для оплаты
      const tariff = await prisma.tariff.findFirst({
        where: { isActive: true, deletedAt: null },
        orderBy: { price: 'desc' }
      })

      if (!tariff) {
        await ctx.reply('Тариф не найден. Обратитесь к администратору.')
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
        `💳 <b>Оплата подписки</b>\n\n` +
        `Организация: ${org.name}\n` +
        `Тариф: ${tariff.name}\n` +
        `Сумма: ${tariff.price} ₽\n\n` +
        `<a href="${tinkoff.paymentUrl}">Перейти к оплате →</a>`,
        { parse_mode: 'HTML' }
      )

      await ctx.editMessageText(
        'Ссылка на оплату отправлена вам в личные сообщения 💬'
      )
    } catch (error: any) {
      console.error('[bot] Buy subscription error:', error.message)
      await ctx.reply('Произошла ошибка при создании платежа. Попробуйте позже.')
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
        'Достигнут лимит транскрипций для текущего тарифа.\n' +
        'Обратитесь к администратору для продления подписки.',
        { reply_to_message_id: ctx.message.message_id }
      )
      return
    }

    // Проверяем что триал/подписка не истекли
    const now = new Date()
    if (billing.status === 'TRIAL' && billing.trialEndsAt && billing.trialEndsAt < now) {
      const buyKeyboard = new InlineKeyboard()
        .text('💳 Купить подписку', `buy_subscription:${restaurant.organizationId}`)

      await ctx.reply(
        'Подписка истекла. Хотите оформить подписку за 950₽ на 250 транскрипций?',
        {
          reply_to_message_id: ctx.message.message_id,
          reply_markup: buyKeyboard
        }
      )
      return
    }
    if (billing.status === 'ACTIVE' && billing.activeUntil && billing.activeUntil < now) {
      const buyKeyboard = new InlineKeyboard()
        .text('💳 Купить подписку', `buy_subscription:${restaurant.organizationId}`)

      await ctx.reply(
        'Подписка истекла. Хотите оформить подписку за 950₽ на 250 транскрипций?',
        {
          reply_to_message_id: ctx.message.message_id,
          reply_markup: buyKeyboard
        }
      )
      return
    }
    if (billing.status === 'DISABLED') {
      await ctx.reply(
        'Подписка отключена. Обратитесь к администратору.',
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
    const audioBuffer = await downloadTelegramFile(fileId)

    // Транскрибируем через Whisper
    const result = await transcribeAudio(audioBuffer, `voice_${voiceMessage.id}.ogg`)

    if (!result.text || result.text.trim().length === 0) {
      throw new Error('Whisper вернул пустую транскрипцию')
    }

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
      `Транскрипция (${duration}с):\n\n${preview}`,
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
      'Не удалось обработать голосовое сообщение. Попробуйте ещё раз.',
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

  try {
    await ensureBotInitialized()
    await bot.handleUpdate(body)
  } catch (err) {
    console.error('Bot Error:', err)
  }

  return { ok: true }
})
