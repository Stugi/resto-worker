/**
 * PATCH /api/tariffs/:id — Обновить тариф
 *
 * Доступ: только SUPER_ADMIN
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  if (user.role !== 'SUPER_ADMIN') {
    throw createError({ statusCode: 403, message: 'Доступ запрещен' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'ID тарифа обязателен' })
  }

  const existing = await prisma.tariff.findUnique({
    where: { id, deletedAt: null }
  })

  if (!existing) {
    throw createError({ statusCode: 404, message: 'Тариф не найден' })
  }

  const body = await readBody<{
    name?: string
    description?: string
    price?: number
    period?: number
    maxRestaurants?: number
    maxUsers?: number
    maxTranscriptions?: number
    isActive?: boolean
    sortOrder?: number
  }>(event)

  // Валидация
  if (body.name !== undefined && body.name.trim().length === 0) {
    throw createError({ statusCode: 400, message: 'Название тарифа не может быть пустым' })
  }

  if (body.price !== undefined && body.price < 0) {
    throw createError({ statusCode: 400, message: 'Цена не может быть отрицательной' })
  }

  const tariff = await prisma.tariff.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name.trim() }),
      ...(body.description !== undefined && { description: body.description?.trim() || null }),
      ...(body.price !== undefined && { price: body.price }),
      ...(body.period !== undefined && { period: body.period }),
      ...(body.maxRestaurants !== undefined && { maxRestaurants: body.maxRestaurants }),
      ...(body.maxUsers !== undefined && { maxUsers: body.maxUsers }),
      ...(body.maxTranscriptions !== undefined && { maxTranscriptions: body.maxTranscriptions }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
      ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
      updatedBy: user.id
    }
  })

  console.log(`[tariffs] Updated tariff: ${tariff.id} "${tariff.name}"`)

  return tariff
})
