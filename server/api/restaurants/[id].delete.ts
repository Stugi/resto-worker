import { getUserFromSession } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  // Получаем текущего пользователя
  const user = await getUserFromSession(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Не авторизован'
    })
  }

  // Только OWNER и SUPER_ADMIN могут удалять рестораны
  if (!['OWNER', 'SUPER_ADMIN'].includes(user.role)) {
    throw createError({
      statusCode: 403,
      message: 'Недостаточно прав'
    })
  }

  const id = getRouterParam(event, 'id')

  // Проверяем существование ресторана
  // SUPER_ADMIN может удалять любой ресторан, OWNER - только своей организации
  const whereClause = user.role === 'SUPER_ADMIN'
    ? { id, deletedAt: null }
    : { id, organizationId: user.organizationId!, deletedAt: null }

  const existingRestaurant = await prisma.restaurant.findFirst({
    where: whereClause
  })

  if (!existingRestaurant) {
    throw createError({
      statusCode: 404,
      message: 'Ресторан не найден'
    })
  }

  // Soft delete
  await prisma.restaurant.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      deletedBy: user.id
    }
  })

  return { success: true }
})
