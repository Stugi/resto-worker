import { UserRole } from '#shared/constants/roles'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  // Промпты доступны только SUPER_ADMIN
  if (user.role !== UserRole.SUPER_ADMIN) {
    throw createError({
      statusCode: 403,
      message: 'Доступ запрещен'
    })
  }

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
})
