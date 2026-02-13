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
      .text('2-5 ресторанов', 'scale_5').row()
      .text('Более 5', 'scale_10')

    return ctx.reply(
      `Отлично! "${text}" - звучит здорово 🎉\n\nСколько у вас сейчас точек?`,
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

    await ctx.reply(`✅ Отлично! Ресторан "${text}" успешно добавлен!`)

    // Предлагаем выбор: создать новую группу или привязать существующую
    const chatKeyboard = new InlineKeyboard()
      .text('➕ Создать новую группу', `create_chat_${restaurant.id}`).row()
      .text('🔗 Привязать существующую', `bind_existing_${restaurant.id}`)

    await ctx.reply(
      `🎊 Регистрация почти завершена!\n\nПоследний шаг - настроить рабочий чат для ресторана "${text}".\n\n👥 В нем я буду собирать отчеты от менеджеров.`,
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
      '📱 Отлично! Теперь поделись контактом для завершения регистрации:',
      {
        reply_markup: {
          keyboard: [[{ text: '📱 Поделиться контактом', request_contact: true }]],
          one_time_keyboard: true,
          resize_keyboard: true
        }
      }
    )
    return
  }

  // Обработка создания новой группы
  if (data.startsWith('create_chat_')) {
    const restaurantId = data.replace('create_chat_', '')

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId }
    })

    await ctx.answerCallbackQuery()
    await ctx.reply(
      `➕ Создай новую группу для "${restaurant?.name}":\n\n1️⃣ Нажми на скрепку 📎 → "Новая группа"\n2️⃣ Назови группу (например: "Отчеты ${restaurant?.name}")\n3️⃣ Можешь добавить менеджеров сразу или позже\n4️⃣ Добавь меня (@${ctx.me.username}) в группу\n5️⃣ Сделай меня администратором\n6️⃣ Отправь в группу:\n\n<code>/bind ${restaurantId}</code>\n\n✅ Готово! Я буду собирать отчеты в этой группе.`,
      { parse_mode: 'HTML' }
    )

    return
  }

  // Обработка привязки к существующей группе
  if (data.startsWith('bind_existing_')) {
    const restaurantId = data.replace('bind_existing_', '')

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId }
    })

    await ctx.answerCallbackQuery()
    await ctx.reply(
      `🔗 Привяжи существующую группу к "${restaurant?.name}":\n\n1️⃣ Открой нужную группу\n2️⃣ Добавь меня (@${ctx.me.username}) в группу\n3️⃣ Сделай меня администратором\n4️⃣ Отправь в группу:\n\n<code>/bind ${restaurantId}</code>\n\n✅ Я привяжу эту группу к ресторану!`,
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

  await ctx.reply(`🎉 Регистрация завершена!\n\nОрганизация "${org.name}" успешно создана.`, {
    reply_markup: { remove_keyboard: true }
  })

  await ctx.reply(
    `Теперь давай добавим твой первый ресторан.\n\n🏪 Как его назовем?\n(например: "Центральный" или "Точка на Ленина")`
  )
})

// Команда /bind для привязки группы к ресторану
bot.command('bind', async (ctx) => {
  // Проверяем, что команда вызвана в группе
  if (ctx.chat.type !== 'group' && ctx.chat.type !== 'supergroup') {
    return ctx.reply('❌ Эта команда работает только в группах!')
  }

  // Получаем ID ресторана из команды
  const restaurantId = ctx.message.text.split(' ')[1]

  if (!restaurantId) {
    return ctx.reply('❌ Укажи ID ресторана!\nИспользуй: /bind RESTAURANT_ID')
  }

  // Проверяем, что ресторан существует
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId }
  })

  if (!restaurant) {
    return ctx.reply('❌ Ресторан с таким ID не найден!')
  }

  // Сохраняем ID чата в настройках ресторана
  await prisma.restaurant.update({
    where: { id: restaurantId },
    data: {
      settingsComment: JSON.stringify({
        ...JSON.parse(restaurant.settingsComment || '{}'),
        telegramChatId: ctx.chat.id.toString(),
        chatTitle: ctx.chat.title
      })
    }
  })

  // Обновляем состояние владельца на COMPLETED
  const owner = await prisma.user.findFirst({
    where: {
      organizationId: restaurant.organizationId,
      role: 'OWNER'
    }
  })

  if (owner && owner.botState === BotState.WAITING_CHAT_CHOICE) {
    await prisma.user.update({
      where: { id: owner.id },
      data: { botState: BotState.COMPLETED }
    })
  }

  await ctx.reply(`✅ Отлично! Эта группа теперь привязана к ресторану "${restaurant.name}"!\n\n👥 Менеджеры смогут отправлять сюда отчеты.\n\n🎊 Регистрация завершена!`)
})

// Обработка добавления бота в новую группу (через магическую ссылку)
bot.on('my_chat_member', async (ctx) => {
  const newStatus = ctx.myChatMember.new_chat_member.status

  // Бот был добавлен в группу
  if (newStatus === 'member' || newStatus === 'administrator') {
    const startParam = ctx.myChatMember.from.id.toString()

    // Проверяем, есть ли start parameter в deep link
    // Формат: new_RESTAURANT_ID
    if (startParam && startParam.startsWith('new_')) {
      const restaurantId = startParam.replace('new_', '')

      const restaurant = await prisma.restaurant.findUnique({
        where: { id: restaurantId }
      })

      if (restaurant) {
        // Сохраняем ID чата
        await prisma.restaurant.update({
          where: { id: restaurantId },
          data: {
            settingsComment: JSON.stringify({
              ...JSON.parse(restaurant.settingsComment || '{}'),
              telegramChatId: ctx.chat.id.toString()
            })
          }
        })

        await ctx.reply(`✅ Группа успешно создана и привязана к ресторану "${restaurant.name}"!\n\n👥 Менеджеры смогут отправлять сюда отчеты.`)
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
