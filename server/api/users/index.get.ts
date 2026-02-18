import { UserRole } from '#shared/constants/roles'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  // Только SUPER_ADMIN и OWNER могут видеть пользователей
  if (user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.OWNER) {
    throw createError({
      statusCode: 403,
      message: 'Доступ запрещен'
    })
  }

  // SUPER_ADMIN видит всех пользователей
  if (user.role === UserRole.SUPER_ADMIN) {
    const users = await prisma.user.findMany({
      where: { deletedAt: null },
      include: {
        organization: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return users
  }

  // OWNER видит только пользователей своей организации
  if (user.role === UserRole.OWNER) {
    if (!user.organizationId) {
      throw createError({
        statusCode: 400,
        message: 'Организация не найдена'
      })
    }

    const users = await prisma.user.findMany({
      where: {
        organizationId: user.organizationId,
        deletedAt: null
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return users
  }

  return []
})
