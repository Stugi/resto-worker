import { Bot, InlineKeyboard } from 'grammy'
import { prisma } from '../../utils/prisma'
import { createId } from '@paralleldrive/cuid2'
import { BotState } from '../../types/bot'

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
    update: { botState: BotState.WAITING_NAME },
    create: {
      id: createId(),
      telegramId: tgId,
      botState: BotState.WAITING_NAME,
      role: 'OWNER',
      createdBy: 'telegram_bot'
    }
  })

  await ctx.reply(
    `Привет, ${firstName}! 👋\n\nЯ помогу тебе запустить систему управления рестораном.\n\n✍️ Как называется твоя сеть ресторанов?`
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
  if (user.botState === BotState.WAITING_NAME) {
    await prisma.user.update({
      where: { telegramId: tgId },
      data: {
        tempOrgName: text,
        botState: BotState.WAITING_SCALE
      }
    })

    const keyboard = new InlineKeyboard()
      .text('🏪 1 ресторан', 'scale_1').row()
      .text('🏬 2-5 ресторанов', 'scale_5').row()
      .text('🏢 Более 5', 'scale_10')

    return ctx.reply(
      `Отлично! "${text}" — звучит здорово ✨\n\nСколько у вас сейчас точек?`,
      { reply_markup: keyboard }
    )
  }

  // ШАГ 4: Ожидаем название первого ресторана
  if (user.botState === BotState.WAITING_FIRST_REST) {
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
      data: { botState: BotState.WAITING_CHAT_CHOICE }
    })

    await ctx.reply(`✅ Ресторан "${text}" успешно добавлен!`)

    // Одна кнопка для настройки чата
    const chatKeyboard = new InlineKeyboard()
      .text('💬 Настроить чат', `setup_chat_${restaurant.id}`)

    await ctx.reply(
      `🎯 Последний шаг — настроить рабочий чат для "${text}".\n\n💼 В нем я буду собирать отчеты от менеджеров.`,
      { reply_markup: chatKeyboard }
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
      data: { botState: BotState.WAITING_CONTACT }
    })

    await ctx.answerCallbackQuery()
    await ctx.reply(
      '📞 Поделись контактом для завершения регистрации:',
      {
        reply_markup: {
          keyboard: [[{ text: '📞 Поделиться номером', request_contact: true }]],
          one_time_keyboard: true,
          resize_keyboard: true
        }
      }
    )
    return
  }

  // Обработка настройки чата
  if (data.startsWith('setup_chat_')) {
    const restaurantId = data.replace('setup_chat_', '')

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId }
    })

    await ctx.answerCallbackQuery()
    await ctx.reply(
      `💬 <b>Настройка чата для "${restaurant?.name}"</b>\n\n<b>Всего 3 простых шага:</b>\n\n1️⃣ Создай группу или открой существующую\n   (Нажми на скрепку 📎 → "Новая группа")\n\n2️⃣ Добавь меня @${ctx.me.username} в группу\n\n3️⃣ Готово! Я автоматически привяжусь ✨\n\n💡 <i>Никакие команды не нужны!</i>`,
      { parse_mode: 'HTML' }
    )

    return
  }
})

// Обработка получения контакта
bot.on('message:contact', async (ctx) => {
  const tgId = ctx.from.id.toString()
  const user = await prisma.user.findUnique({ where: { telegramId: tgId } })

  if (!user || user.botState !== BotState.WAITING_CONTACT) {
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
      botState: BotState.WAITING_FIRST_REST,
      login: `owner_${tgId.slice(-6)}`,
      name: ctx.from.first_name || 'Владелец'
    }
  })

  await ctx.reply(`🎉 Организация "${org.name}" успешно создана!`, {
    reply_markup: { remove_keyboard: true }
  })

  await ctx.reply(
    `🏪 Теперь добавь свой первый ресторан.\n\nКак его назовем?\n<i>(например: "Центральный" или "Точка на Ленина")</i>`,
    { parse_mode: 'HTML' }
  )
})

// Обработка добавления бота в группу (автоматическая привязка)
bot.on('my_chat_member', async (ctx) => {
  const newStatus = ctx.myChatMember.new_chat_member.status

  // Бот был добавлен в группу
  if (newStatus === 'member' || newStatus === 'administrator') {
    const tgId = ctx.from.id.toString()

    // Находим пользователя который добавил бота
    const user = await prisma.user.findUnique({
      where: { telegramId: tgId }
    })

    // Если пользователь в состоянии ожидания настройки чата
    if (user && user.botState === BotState.WAITING_CHAT_CHOICE) {
      // Находим последний созданный ресторан этого пользователя
      const restaurant = await prisma.restaurant.findFirst({
        where: {
          organizationId: user.organizationId!,
          settingsComment: {
            not: {
              contains: 'telegramChatId'
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      if (restaurant) {
        // Привязываем чат к ресторану
        await prisma.restaurant.update({
          where: { id: restaurant.id },
          data: {
            settingsComment: JSON.stringify({
              ...JSON.parse(restaurant.settingsComment || '{}'),
              telegramChatId: ctx.chat.id.toString(),
              chatTitle: ctx.chat.title
            })
          }
        })

        // Обновляем состояние пользователя
        await prisma.user.update({
          where: { id: user.id },
          data: { botState: BotState.COMPLETED }
        })

        await ctx.reply(
          `✅ Группа "${ctx.chat.title}" привязана к ресторану "${restaurant.name}"!\n\n💼 Теперь менеджеры смогут отправлять сюда отчеты.\n\n🎊 Регистрация завершена!`
        )
      }
    }
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
