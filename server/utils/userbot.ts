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

    // Логируем полную структуру ответа для отладки
    const safeStringify = (obj: any) => JSON.stringify(obj, (_, v) =>
      typeof v === 'bigint' ? v.toString() : v
    ).slice(0, 2000)

    console.log('[userbot] CreateChat result className:', result?.className)
    console.log('[userbot] CreateChat result:', safeStringify(result))

    // Получаем chatId из результата
    // CreateChat может вернуть: Updates, UpdatesCombined, messages.InvitedUsers
    const res = result as any

    // Способ 1: chats[] — основной (Updates / UpdatesCombined)
    if (res.chats && Array.isArray(res.chats) && res.chats.length > 0) {
      const chat = res.chats[0]
      chatId = chat.id?.toString()
      console.log('[userbot] chatId from chats[]:', chatId)
    }

    // Способ 2: updates[] — ищем в списке обновлений
    if (!chatId && res.updates && Array.isArray(res.updates)) {
      for (const update of res.updates) {
        if (update.message?.peerId?.chatId) {
          chatId = update.message.peerId.chatId.toString()
          console.log('[userbot] chatId from updates[]:', chatId)
          break
        }
      }
    }

    // Способ 3: missingUpdates / messages.InvitedUsers — chatId может быть в другом месте
    if (!chatId && res.missingUpdates) {
      for (const update of Array.isArray(res.missingUpdates) ? res.missingUpdates : []) {
        if (update.message?.peerId?.chatId) {
          chatId = update.message.peerId.chatId.toString()
          console.log('[userbot] chatId from missingUpdates[]:', chatId)
          break
        }
      }
    }

    // Способ 4: Если ответ сам содержит chatId (InvitedUsers)
    if (!chatId && res.chatId) {
      chatId = res.chatId.toString()
      console.log('[userbot] chatId from result.chatId:', chatId)
    }

    if (!chatId) {
      console.error('[userbot] Failed to extract chatId. Full result:', safeStringify(result))
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
      console.log(`[userbot] Adding bot @${botUsername} to chat ${chatId}`)
      const botEntity = await client.getInputEntity(`@${botUsername}`)
      console.log('[userbot] Bot entity resolved:', botEntity?.className)

      await client.invoke(
        new Api.messages.AddChatUser({
          chatId: BigInt(chatId),
          userId: botEntity
        })
      )
      console.log('[userbot] Bot added to group successfully')

      await logUserbotAction({
        action: 'ADD_USER',
        userId: ownerTelegramId,
        restaurantId,
        chatId,
        success: true,
        metadata: { username: botUsername }
      })
    } catch (error: any) {
      console.error('[userbot] Failed to add bot to group:', error.message || error)
      await logUserbotAction({
        action: 'ADD_USER',
        userId: ownerTelegramId,
        restaurantId,
        chatId,
        success: false,
        error: error.message || String(error)
      })
    }

    // 3. Назначаем владельца и бота админами
    try {
      console.log(`[userbot] Promoting owner ${ownerTelegramId} to admin`)
      await promoteToAdmin(chatId, ownerTelegramId)
      console.log(`[userbot] Promoting bot @${botUsername} to admin`)
      await promoteToAdmin(chatId, `@${botUsername}`)
      console.log('[userbot] Admins promoted successfully')

      await logUserbotAction({
        action: 'PROMOTE_ADMIN',
        userId: ownerTelegramId,
        restaurantId,
        chatId,
        success: true,
        metadata: { promotedUsers: [ownerTelegramId, botUsername] }
      })
    } catch (error: any) {
      console.error('[userbot] Failed to promote admins:', error.message || error)
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
