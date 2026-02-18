import { UserRole } from '#shared/constants/roles'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  if (user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.OWNER) {
    throw createError({
      statusCode: 403,
      message: 'Доступ запрещен'
    })
  }

  // SUPER_ADMIN видит все промпты
  if (user.role === UserRole.SUPER_ADMIN) {
    return prisma.reportPrompt.findMany({
      where: { deletedAt: null },
      include: {
        restaurant: {
          select: { id: true, name: true }
        }
      },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' }
      ]
    })
  }

  // OWNER видит дефолтные + промпты ресторанов своей организации
  if (!user.organizationId) {
    throw createError({
      statusCode: 400,
      message: 'Организация не найдена'
    })
  }

  const orgRestaurants = await prisma.restaurant.findMany({
    where: {
      organizationId: user.organizationId,
      deletedAt: null
    },
    select: { id: true }
  })

  const restaurantIds = orgRestaurants.map(r => r.id)

  return prisma.reportPrompt.findMany({
    where: {
      deletedAt: null,
      OR: [
        { isDefault: true },
        { restaurantId: { in: restaurantIds } }
      ]
    },
    include: {
      restaurant: {
        select: { id: true, name: true }
      }
    },
    orderBy: [
      { isDefault: 'desc' },
      { createdAt: 'desc' }
    ]
  })
})
