import { UserRole } from '#shared/constants/roles'

export default defineEventHandler(async (event) => {
  // Получаем текущего пользователя
  const user = await getUserFromSession(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Не авторизован'
    })
  }

  // Только OWNER и SUPER_ADMIN могут редактировать рестораны
  if (![UserRole.OWNER, UserRole.SUPER_ADMIN].includes(user.role)) {
    throw createError({
      statusCode: 403,
      message: 'Недостаточно прав'
    })
  }

  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  // Проверяем существование ресторана
  // SUPER_ADMIN может редактировать любой ресторан, OWNER - только своей организации
  const whereClause = user.role === UserRole.SUPER_ADMIN
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

  // Валидация
  if (!body.name?.trim()) {
    throw createError({
      statusCode: 400,
      message: 'Название ресторана обязательно'
    })
  }

  // Обновляем ресторан
  const restaurant = await prisma.restaurant.update({
    where: { id },
    data: {
      name: body.name.trim(),
      settingsComment: body.settingsComment?.trim() || null,
      updatedBy: user.login || user.id
    },
    include: {
      organization: {
        select: {
          id: true,
          name: true
        }
      }
    }
  })

  return restaurant
})
