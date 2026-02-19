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

  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'ID обязателен'
    })
  }

  const prompt = await prisma.reportPrompt.findFirst({
    where: { id, deletedAt: null },
    include: {
      restaurant: {
        select: { id: true, name: true }
      }
    }
  })

  if (!prompt) {
    throw createError({
      statusCode: 404,
      message: 'Промпт не найден'
    })
  }

  return prompt
})
