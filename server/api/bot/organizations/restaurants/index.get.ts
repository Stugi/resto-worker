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

  // Только OWNER и SUPER_ADMIN могут просматривать рестораны
  if (![UserRole.OWNER, UserRole.SUPER_ADMIN].includes(user.role)) {
    throw createError({
      statusCode: 403,
      message: 'Недостаточно прав'
    })
  }

  // SUPER_ADMIN видит все рестораны
  // OWNER видит только рестораны своей организации
  const whereClause = user.role === UserRole.SUPER_ADMIN
    ? { deletedAt: null }
    : { organizationId: user.organizationId!, deletedAt: null }

  const restaurants = await prisma.restaurant.findMany({
    where: whereClause,
    include: {
      organization: {
        select: {
          id: true,
          name: true
        }
      },
      _count: {
        select: {
          users: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  return restaurants
})
