import { UserRole } from '#shared/constants/roles'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  // Только SUPER_ADMIN может просматривать все организации
  if (user.role !== UserRole.SUPER_ADMIN) {
    throw createError({
      statusCode: 403,
      message: 'Доступ запрещен'
    })
  }

  const organizations = await prisma.organization.findMany({
    where: {
      deletedAt: null
    },
    include: {
      billing: {
        include: {
          tariff: { select: { id: true, name: true, price: true } }
        }
      },
      _count: {
        select: {
          users: true,
          restaurants: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  return organizations
})
