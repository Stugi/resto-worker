import { Bot, InlineKeyboard } from 'grammy'
import { prisma } from '../../utils/prisma'
import { createId } from '@paralleldrive/cuid2'

const token = process.env.TELEGRAM_BOT_TOKEN
if (!token) {
  throw new Error('TELEGRAM_BOT_TOKEN is not set')
}

const bot = new Bot(token)

// --- КОМАНДЫ И ОБРАБОТЧИКИ ---

// Команда /start - начало онбординга
bot.command('start', async (ctx) => {
  const tgId = ctx.from.id.toString()
  const firstName = ctx.from.first_name || 'друг'

  // Создаем или обновляем пользователя
  await prisma.user.upsert({
    where: { telegramId: tgId },
    update: { botState: 'WAITING_NAME' },
    create: {
      id: createId(),
      telegramId: tgId,
      botState: 'WAITING_NAME',
      role: 'OWNER',
      createdBy: 'telegram_bot'
    }
  })

  await ctx.reply(
    `Привет, ${firstName}! 👋\n\nЯ помогу тебе запустить систему управления рестораном.\n\n📝 Как называется твоя сеть ресторанов?`
  )
})

// Обработка текстовых сообщений
bot.on('message:text', async (ctx) => {
  const tgId = ctx.from.id.toString()
  const user = await prisma.user.findUnique({ where: { telegramId: tgId } })
  const text = ctx.message.text

  if (!user) {
    return ctx.reply('Напиши /start для начала работы')
  }

  // ШАГ 1: Ожидаем название организации
  if (user.botState === 'WAITING_NAME') {
    await prisma.user.update({
      where: { telegramId: tgId },
      data: {
        tempOrgName: text,
        botState: 'WAITING_SCALE'
      }
    })

    const keyboard = new InlineKeyboard()
      .text('1 ресторан', 'scale_1').row()
      .text('2-5 ресторанов', 'scale_5').row()
      .text('Более 5', 'scale_10')

    return ctx.reply(
      `Отлично! "${text}" - звучит здорово 🎉\n\nСколько у вас сейчас точек?`,
      { reply_markup: keyboard }
    )
  }

  // ШАГ 4: Ожидаем название первого ресторана
  if (user.botState === 'WAITING_FIRST_REST') {
    const restaurant = await prisma.restaurant.create({
      data: {
        id: createId(),
        name: text,
        organizationId: user.organizationId!,
        createdBy: user.id
      }
    })

    await prisma.user.update({
      where: { telegramId: tgId },
      data: { botState: 'COMPLETED' }
    })

    await ctx.reply(`✅ Отлично! Ресторан "${text}" успешно добавлен!`)

    // Генерируем магическую ссылку для создания группового чата
    const botUsername = ctx.me.username
    const magicLink = `https://t.me/${botUsername}?startgroup=reg_${restaurant.id}`

    const magicKeyboard = new InlineKeyboard()
      .url('🪄 Создать чат ресторана в 1 клик', magicLink)

    await ctx.reply(
      `🎊 Регистрация почти завершена!\n\nТеперь последний и самый важный шаг: создайте рабочий чат этого ресторана в Telegram.\n\n👥 Я буду там собирать отчеты от менеджеров.`,
      { reply_markup: magicKeyboard }
    )

    return
  }

  // Неизвестное состояние
  return ctx.reply('Используй /start для начала')
})

// Обработка кнопок выбора масштаба
bot.on('callback_query:data', async (ctx) => {
  const tgId = ctx.from.id.toString()
  const user = await prisma.user.findUnique({ where: { telegramId: tgId } })

  if (!user) {
    await ctx.answerCallbackQuery({ text: 'Начни с /start' })
    return
  }

  const data = ctx.callbackQuery.data

  // Обработка выбора масштаба
  if (data.startsWith('scale_')) {
    await prisma.user.update({
      where: { telegramId: tgId },
      data: { botState: 'WAITING_CONTACT' }
    })

    await ctx.answerCallbackQuery()
    await ctx.reply(
      '📱 Отлично! Теперь поделись контактом для завершения регистрации:',
      {
        reply_markup: {
          keyboard: [[{ text: '📱 Поделиться контактом', request_contact: true }]],
          one_time_keyboard: true,
          resize_keyboard: true
        }
      }
    )
  }
})

// Обработка получения контакта
bot.on('message:contact', async (ctx) => {
  const tgId = ctx.from.id.toString()
  const user = await prisma.user.findUnique({ where: { telegramId: tgId } })

  if (!user || user.botState !== 'WAITING_CONTACT') {
    return
  }

  const phone = ctx.message.contact.phone_number

  // Создаем организацию и биллинг в транзакции
  const org = await prisma.organization.create({
    data: {
      id: createId(),
      name: user.tempOrgName || 'Моя сеть',
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

  // Обновляем пользователя
  await prisma.user.update({
    where: { telegramId: tgId },
    data: {
      phone,
      organizationId: org.id,
      botState: 'WAITING_FIRST_REST',
      login: `owner_${tgId.slice(-6)}`,
      name: ctx.from.first_name || 'Владелец'
    }
  })

  await ctx.reply(`🎉 Регистрация завершена!\n\nОрганизация "${org.name}" успешно создана.`, {
    reply_markup: { remove_keyboard: true }
  })

  await ctx.reply(
    `Теперь давай добавим твой первый ресторан.\n\n🏪 Как его назовем?\n(например: "Центральный" или "Точка на Ленина")`
  )
})

// Экспорт обработчика для Nuxt
export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  try {
    await bot.handleUpdate(body)
  } catch (err) {
    console.error('Bot Error:', err)
  }

  return { ok: true }
})
