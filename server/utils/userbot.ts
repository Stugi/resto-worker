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
  inviteLink?: string
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

/**
 * Генерация названия группы: CosmicAI XX-0001 | Restaurant Name
 * XX = первые 2 буквы названия организации (uppercase, транслит)
 * 0001 = порядковый номер ресторана в организации
 */
export async function generateGroupTitle(
  restaurantName: string,
  organizationId: string,
  organizationName: string
): Promise<string> {
  // Первые 2 буквы организации (транслит + uppercase)
  const translit: Record<string, string> = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
    'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sh', 'э': 'e',
    'ю': 'yu', 'я': 'ya', 'ы': 'y', 'ъ': '', 'ь': ''
  }

  const orgLetters = organizationName
    .toLowerCase()
    .split('')
    .map(ch => translit[ch] || ch)
    .join('')
    .replace(/[^a-z]/g, '')
    .slice(0, 2)
    .toUpperCase() || 'XX'

  // Считаем количество ресторанов в организации для номера
  const count = await prisma.restaurant.count({
    where: { organizationId }
  })
  const seq = String(count).padStart(4, '0')

  return `CosmicAI ${orgLetters}-${seq} | ${restaurantName}`
}

// Создание группы для ресторана
export async function createRestaurantGroup(
  restaurantName: string,
  ownerTelegramId: string,
  restaurantId: string,
  organizationId?: string,
  organizationName?: string
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
    if (organizationId && organizationName) {
      chatTitle = await generateGroupTitle(restaurantName, organizationId, organizationName)
    } else {
      chatTitle = `CosmicAI | ${restaurantName}`
    }

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
    // messages.InvitedUsers возвращает: { updates: { updates: [...], chats: [...], ... } }
    // Updates/UpdatesCombined возвращает: { updates: [...], chats: [...], ... }
    const res = result as any

    // Определяем где искать — на верхнем уровне или внутри res.updates
    const topLevel = res
    const nested = res.updates || {}

    console.log('[userbot] topLevel keys:', Object.keys(topLevel))
    console.log('[userbot] nested keys:', nested ? Object.keys(nested) : 'none')

    // Способ 1: chats[] на верхнем уровне (Updates / UpdatesCombined)
    if (topLevel.chats && Array.isArray(topLevel.chats) && topLevel.chats.length > 0) {
      chatId = topLevel.chats[0].id?.toString()
      console.log('[userbot] chatId from topLevel.chats[]:', chatId)
    }

    // Способ 2: chats[] внутри updates (messages.InvitedUsers)
    if (!chatId && nested.chats && Array.isArray(nested.chats) && nested.chats.length > 0) {
      chatId = nested.chats[0].id?.toString()
      console.log('[userbot] chatId from nested.chats[]:', chatId)
    }

    // Способ 3: updates[] на верхнем уровне — ищем peerId.chatId
    if (!chatId && topLevel.updates && Array.isArray(topLevel.updates)) {
      for (const update of topLevel.updates) {
        const cid = update.message?.peerId?.chatId || update.participants?.chatId
        if (cid) {
          chatId = cid.toString()
          console.log('[userbot] chatId from topLevel.updates[]:', chatId)
          break
        }
      }
    }

    // Способ 4: updates[] внутри nested — ищем peerId.chatId
    if (!chatId && nested.updates && Array.isArray(nested.updates)) {
      for (const update of nested.updates) {
        const cid = update.message?.peerId?.chatId || update.participants?.chatId
        if (cid) {
          chatId = cid.toString()
          console.log('[userbot] chatId from nested.updates[]:', chatId)
          break
        }
      }
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

    // 3. Назначаем владельца админом (отдельно, чтобы ошибка не блокировала бота)
    try {
      console.log(`[userbot] Promoting owner ${ownerTelegramId} to admin`)
      await promoteToAdmin(chatId, ownerTelegramId)
      console.log('[userbot] Owner promoted successfully')
      await logUserbotAction({
        action: 'PROMOTE_ADMIN',
        userId: ownerTelegramId,
        restaurantId,
        chatId,
        success: true,
        metadata: { promotedUser: ownerTelegramId, role: 'owner' }
      })
    } catch (error: any) {
      console.error('[userbot] Failed to promote owner:', error.message || error)
      await logUserbotAction({
        action: 'PROMOTE_ADMIN',
        userId: ownerTelegramId,
        restaurantId,
        chatId,
        success: false,
        error: error.message || String(error),
        metadata: { promotedUser: ownerTelegramId, role: 'owner' }
      })
    }

    // 4. Назначаем бота админом (критично для транскрипции!)
    try {
      console.log(`[userbot] Promoting bot @${botUsername} to admin`)
      await promoteToAdmin(chatId, `@${botUsername}`)
      console.log('[userbot] Bot promoted successfully')
      await logUserbotAction({
        action: 'PROMOTE_ADMIN',
        userId: ownerTelegramId,
        restaurantId,
        chatId,
        success: true,
        metadata: { promotedUser: botUsername, role: 'bot' }
      })
    } catch (error: any) {
      console.error('[userbot] Failed to promote bot:', error.message || error)
      await logUserbotAction({
        action: 'PROMOTE_ADMIN',
        userId: ownerTelegramId,
        restaurantId,
        chatId,
        success: false,
        error: error.message || String(error),
        metadata: { promotedUser: botUsername, role: 'bot' }
      })
    }

    // 5. Генерируем invite-ссылку для группы
    let inviteLink: string | undefined
    try {
      console.log(`[userbot] Exporting invite link for chat ${chatId}`)
      const inviteResult = await client.invoke(
        new Api.messages.ExportChatInvite({
          peer: new Api.InputPeerChat({ chatId: BigInt(chatId) })
        })
      )
      inviteLink = (inviteResult as any).link
      console.log(`[userbot] Invite link generated: ${inviteLink}`)

      await logUserbotAction({
        action: 'EXPORT_INVITE_LINK',
        userId: ownerTelegramId,
        restaurantId,
        chatId,
        success: true,
        metadata: { inviteLink }
      })
    } catch (error: any) {
      console.warn(`[userbot] Failed to export invite link: ${error.message}`)
      await logUserbotAction({
        action: 'EXPORT_INVITE_LINK',
        userId: ownerTelegramId,
        restaurantId,
        chatId,
        success: false,
        error: error.message || String(error)
      })
    }

    return {
      success: true,
      chatId,
      chatTitle,
      inviteLink
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
  // Для числовых ID (например "123456789") getInputEntity() не работает —
  // нужно передать BigInt, чтобы gramjs нашёл пользователя в кеше
  const isNumericId = /^\d+$/.test(userIdOrUsername)
  const userEntity = isNumericId
    ? await client.getInputEntity(BigInt(userIdOrUsername))
    : await client.getInputEntity(userIdOrUsername)

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
