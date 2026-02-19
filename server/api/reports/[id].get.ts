/**
 * GET /api/reports/:id — Получить полный отчёт
 *
 * Возвращает отчёт с содержимым и списком транскрипций
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, message: 'ID отчёта обязателен' })
  }

  const report = await prisma.report.findUnique({
    where: { id },
    include: {
      restaurant: { select: { id: true, name: true } },
      prompt: { select: { id: true, name: true } },
      transcripts: {
        include: {
          transcript: {
            include: {
              user: { select: { id: true, name: true } },
              voiceMessage: { select: { duration: true } }
            }
          }
        },
        orderBy: { transcript: { createdAt: 'asc' } }
      }
    }
  })

  if (!report) {
    throw createError({ statusCode: 404, message: 'Отчёт не найден' })
  }

  // Проверяем доступ
  if (user.role !== 'SUPER_ADMIN') {
    if (user.role === 'OWNER' && user.organizationId) {
      const restaurant = await prisma.restaurant.findUnique({
        where: { id: report.restaurantId },
        select: { organizationId: true }
      })
      if (restaurant?.organizationId !== user.organizationId) {
        throw createError({ statusCode: 403, message: 'Нет доступа к этому отчёту' })
      }
    } else if (user.role === 'MANAGER') {
      if (report.restaurantId !== user.restaurantId) {
        throw createError({ statusCode: 403, message: 'Нет доступа к этому отчёту' })
      }
    }
  }

  return report
})
