import { TelegramClient, Api } from 'telegram'
import { StringSession } from 'telegram/sessions'
import { getActiveSession } from './userbot-session'
import { prisma } from './prisma'
import { createId } from '@paralleldrive/cuid2'
import {
  UserbotError,
  FloodWaitError,
  UserNotFoundError,
  GroupCreationError
} from './userbot-errors'

interface GroupResult {
  success: boolean
  chatId?: string
  chatTitle?: string
  error?: string
}

let clientInstance: TelegramClient | null = null

// Получение инициализированного клиента
export async function getUserbotClient(): Promise<TelegramClient> {
  // Feature flag
  if (process.env.USERBOT_ENABLED !== 'true') {
    throw new UserbotError('Userbot отключен')
  }

  const apiId = process.env.USERBOT_API_ID
  const apiHash = process.env.USERBOT_API_HASH

  if (!apiId || !apiHash) {
    throw new UserbotError('USERBOT_API_ID или USERBOT_API_HASH не установлены')
  }

  // Переиспользуем существующий клиент
  if (clientInstance && clientInstance.connected) {
    return clientInstance
  }

  const sessionString = getActiveSession()
  const session = new StringSession(sessionString)

  const client = new TelegramClient(
    session,
    Number(apiId),
    apiHash,
    {
      connectionRetries: 5,
      useWSS: true
    }
  )

  await client.connect()

  clientInstance = client
  return client
}

// Создание группы для ресторана
export async function createRestaurantGroup(
  restaurantName: string,
  ownerTelegramId: string,
  restaurantId: string
): Promise<GroupResult> {
  const startTime = Date.now()
  let chatId: string | undefined
  let chatTitle: string | undefined

  try {
    const client = await getUserbotClient()
    const botUsername = process.env.TELEGRAM_BOT_USERNAME

    if (!botUsername) {
      throw new UserbotError('TELEGRAM_BOT_USERNAME не установлен')
    }

    // Название группы
    chatTitle = `Отчёты: ${restaurantName}`

    // 1. Создаём группу
    const result = await client.invoke(
      new Api.messages.CreateChat({
        title: chatTitle,
        users: [ownerTelegramId]
      })
    )

    // Получаем chatId из результата
    // CreateChat может вернуть Updates, UpdatesCombined или messages.InvitedUsers
    const updates = result as any

    // Ищем chatId в chats
    if (updates.chats && updates.chats.length > 0) {
      const chat = updates.chats[0]
      chatId = chat.id?.toString()
    }

    // Если не нашли в chats, ищем в updates
    if (!chatId && updates.updates) {
      for (const update of updates.updates) {
        if (update.message?.peerId?.chatId) {
          chatId = update.message.peerId.chatId.toString()
          break
        }
      }
    }

    if (!chatId) {
      console.error('CreateChat result structure:', JSON.stringify(result, (_, v) =>
        typeof v === 'bigint' ? v.toString() : v
      ).slice(0, 1000))
      throw new GroupCreationError('Не удалось получить chatId созданной группы')
    }

    // Логирование создания группы
    await logUserbotAction({
      action: 'CREATE_GROUP',
      userId: ownerTelegramId,
      restaurantId,
      chatId,
      success: true,
      metadata: {
        chatTitle,
        duration: Date.now() - startTime
      }
    })

    // 2. Добавляем бота в группу
    try {
      // Резолвим бота по username в InputUser
      const botEntity = await client.getInputEntity(`@${botUsername}`)

      await client.invoke(
        new Api.messages.AddChatUser({
          chatId: BigInt(chatId),
          userId: botEntity
        })
      )

      await logUserbotAction({
        action: 'ADD_USER',
        userId: ownerTelegramId,
        restaurantId,
        chatId,
        success: true,
        metadata: { username: botUsername }
      })
    } catch (error: any) {
      console.error('Не удалось добавить бота в группу:', error)
      // Не фатально - владелец может добавить вручную
    }

    // 3. Назначаем владельца и бота админами
    try {
      await promoteToAdmin(chatId, ownerTelegramId)
      await promoteToAdmin(chatId, `@${botUsername}`)

      await logUserbotAction({
        action: 'PROMOTE_ADMIN',
        userId: ownerTelegramId,
        restaurantId,
        chatId,
        success: true,
        metadata: { promotedUsers: [ownerTelegramId, botUsername] }
      })
    } catch (error: any) {
      console.error('Не удалось назначить админов:', error)
      // Не фатально
    }

    return {
      success: true,
      chatId,
      chatTitle
    }
  } catch (error: any) {
    // Обработка Telegram Flood Wait
    if (error.errorMessage === 'FLOOD_WAIT') {
      const waitSeconds = error.seconds || 60
      await logUserbotAction({
        action: 'CREATE_GROUP',
        userId: ownerTelegramId,
        restaurantId,
        success: false,
        error: `FLOOD_WAIT: ${waitSeconds}s`
      })
      throw new FloodWaitError(waitSeconds)
    }

    // Логирование ошибки
    await logUserbotAction({
      action: 'CREATE_GROUP',
      userId: ownerTelegramId,
      restaurantId,
      chatId,
      success: false,
      error: error.message || String(error),
      metadata: { duration: Date.now() - startTime }
    })

    return {
      success: false,
      error: error.message || 'Неизвестная ошибка'
    }
  }
}

// Назначение админа
async function promoteToAdmin(chatId: string, userIdOrUsername: string): Promise<void> {
  const client = await getUserbotClient()

  // Резолвим пользователя в InputUser
  const userEntity = await client.getInputEntity(userIdOrUsername)

  await client.invoke(
    new Api.messages.EditChatAdmin({
      chatId: BigInt(chatId),
      userId: userEntity,
      isAdmin: true
    })
  )
}

// Логирование действий userbot
async function logUserbotAction(data: {
  action: string
  userId: string
  restaurantId?: string
  chatId?: string
  success: boolean
  error?: string
  metadata?: any
}): Promise<void> {
  await prisma.userbotAction.create({
    data: {
      id: createId(),
      ...data
    }
  })
}

// Health check userbot
export async function checkUserbotHealth(): Promise<{
  connected: boolean
  error?: string
}> {
  try {
    const client = await getUserbotClient()
    const me = await client.getMe()

    return {
      connected: true
    }
  } catch (error: any) {
    return {
      connected: false,
      error: error.message
    }
  }
}
