import { Bot, InlineKeyboard, Keyboard } from 'grammy'
import { createId } from '@paralleldrive/cuid2'
import { BotState } from '../../types/bot'
import { UserRole } from '#shared/constants/roles'

const token = process.env.TELEGRAM_BOT_TOKEN
if (!token) {
  throw new Error('TELEGRAM_BOT_TOKEN is not set')
}

const bot = new Bot(token)

// --- КОМАНДЫ И ОБРАБОТЧИКИ ---

// Команда /start - начало онбординга
// Новый флоу: /start -> Контакт -> Имя орг -> Масштаб -> Авто-создание всего
bot.command('start', async (ctx) => {
  const tgId = ctx.from.id.toString()
  const firstName = ctx.from.first_name || 'друг'

  // Создаем или обновляем пользователя
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

// ШАГ 1: Обработка получения контакта
bot.on('message:contact', async (ctx) => {
  const tgId = ctx.from.id.toString()
  const user = await prisma.user.findUnique({ where: { telegramId: tgId } })

  if (!user || user.botState !== BotState.WAITING_CONTACT) {
    return
  }

  const phone = ctx.message.contact.phone_number

  // ПРОВЕРКА: Один номер = одна организация
  const existingUser = await prisma.user.findFirst({
    where: {
      phone,
      organizationId: { not: null },
      deletedAt: null
    }
  })

  if (existingUser) {
    await ctx.reply(
      'На этот номер уже зарегистрирована организация.\n\n' +
      'Для создания новой организации используй другой номер телефона.',
      { reply_markup: { remove_keyboard: true } }
    )

    // Сбросить состояние
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
      phone,
      name: ctx.from.first_name || 'Владелец',
      botState: BotState.WAITING_NAME
    }
  })

  await ctx.reply(
    'Отлично! Номер сохранен.\n\n' +
    '<b>Как называется твоя сеть ресторанов?</b>\n' +
    '<i>(например: "Вкусно и точка" или "Мой ресторан")</i>',
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

      // Создаем организацию + биллинг + ресторан в транзакции
      const { org, restaurant } = await prisma.$transaction(async (tx) => {
        const org = await tx.organization.create({
          data: {
            id: createId(),
            name: orgName,
            createdBy: user.id,
            billing: {
              create: {
                id: createId(),
                status: 'TRIAL',
                trialStartsAt: new Date(),
                createdBy: user.id
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
            createdBy: user.id
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
          restaurant.id
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

        // COMPLETED
        await prisma.user.update({
          where: { telegramId: tgId },
          data: { botState: BotState.COMPLETED }
        })

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

        await ctx.reply(
          `<b>Все готово!</b>\n\n` +
          `Организация: <b>${orgName}</b>\n` +
          `Ресторан: <b>${orgName}</b>\n` +
          `Группа: <b>${groupResult.chatTitle}</b>\n\n` +
          `<b>Что делать дальше:</b>\n\n` +
          `1. Отправляй голосовые отчеты в созданную группу\n` +
          `2. Я буду транскрибировать их и формировать еженедельные отчеты\n` +
          `3. Добавляй менеджеров в группу — они тоже смогут отправлять отчеты\n\n` +
          `<i>Если есть вопросы — пиши сюда!</i>`,
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

})

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
