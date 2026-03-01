import { UserRole } from '#shared/constants/roles'
import { createRestaurantGroup } from '../../../utils/userbot'

export default defineEventHandler(async (event) => {
  const user = await getUserFromSession(event)

  if (!user) {
    throw createError({ statusCode: 401, message: 'Не авторизован' })
  }

  if (![UserRole.OWNER, UserRole.SUPER_ADMIN].includes(user.role)) {
    throw createError({ statusCode: 403, message: 'Недостаточно прав' })
  }

  const id = getRouterParam(event, 'id')

  // Находим ресторан
  const whereClause = user.role === UserRole.SUPER_ADMIN
    ? { id, deletedAt: null }
    : { id, organizationId: user.organizationId!, deletedAt: null }

  const restaurant = await prisma.restaurant.findFirst({
    where: whereClause,
    include: {
      organization: { select: { id: true, name: true } }
    }
  })

  if (!restaurant) {
    throw createError({ statusCode: 404, message: 'Ресторан не найден' })
  }

  // Проверяем нет ли уже группы
  if (restaurant.settingsComment) {
    try {
      const settings = JSON.parse(restaurant.settingsComment)
      if (settings.telegramChatId) {
        throw createError({
          statusCode: 400,
          message: 'У ресторана уже есть привязанная группа. Сначала отвяжите текущую.'
        })
      }
    } catch (e: any) {
      if (e.statusCode) throw e // re-throw createError
    }
  }

  // Находим владельца ресторана
  const owner = await prisma.user.findFirst({
    where: {
      restaurantId: restaurant.id,
      role: UserRole.OWNER,
      deletedAt: null
    }
  })

  const ownerTelegramId = owner?.telegramId || user.telegramId || '0'
  const ownerPhone = owner?.phone?.toString()
  const orgName = restaurant.organization?.name || restaurant.name

  try {
    const groupResult = await createRestaurantGroup(
      restaurant.name,
      ownerTelegramId,
      restaurant.id,
      restaurant.organizationId,
      orgName,
      ownerPhone
    )

    if (!groupResult.success) {
      throw createError({
        statusCode: 500,
        message: `Ошибка создания группы: ${groupResult.error}`
      })
    }

    // Сохраняем в settingsComment
    let settings: Record<string, any> = {}
    if (restaurant.settingsComment) {
      try { settings = JSON.parse(restaurant.settingsComment) } catch { }
    }

    settings.telegramChatId = groupResult.chatId
    settings.chatTitle = groupResult.chatTitle
    settings.inviteLink = groupResult.inviteLink || null
    settings.createdByUserbot = true

    await prisma.restaurant.update({
      where: { id: restaurant.id },
      data: { settingsComment: JSON.stringify(settings) }
    })

    return {
      success: true,
      chatTitle: groupResult.chatTitle,
      chatId: groupResult.chatId,
      inviteLink: groupResult.inviteLink,
      ownerAdded: groupResult.ownerAdded
    }
  } catch (error: any) {
    if (error.statusCode) throw error // re-throw createError
    console.error('[create-group] Error:', error.message)
    throw createError({
      statusCode: 500,
      message: `Ошибка создания группы: ${error.message}`
    })
  }
})
