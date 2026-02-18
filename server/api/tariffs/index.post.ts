/**
 * POST /api/tariffs — Создать тариф
 *
 * Доступ: только SUPER_ADMIN
 *
 * Body:
 * - name: string (обязательно)
 * - description?: string
 * - price: number (в рублях, 0 = бесплатный)
 * - period?: number (дней, по умолчанию 30)
 * - maxRestaurants?: number
 * - maxUsers?: number
 * - maxTranscriptions?: number
 * - sortOrder?: number
 */
import { createId } from '@paralleldrive/cuid2'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  if (user.role !== 'SUPER_ADMIN') {
    throw createError({ statusCode: 403, message: 'Доступ запрещен' })
  }

  const body = await readBody<{
    name: string
    description?: string
    price?: number
    period?: number
    maxRestaurants?: number
    maxUsers?: number
    maxTranscriptions?: number
    sortOrder?: number
  }>(event)

  // Валидация
  if (!body.name || body.name.trim().length === 0) {
    throw createError({ statusCode: 400, message: 'Название тарифа обязательно' })
  }

  if (body.price !== undefined && body.price < 0) {
    throw createError({ statusCode: 400, message: 'Цена не может быть отрицательной' })
  }

  const tariff = await prisma.tariff.create({
    data: {
      id: createId(),
      name: body.name.trim(),
      description: body.description?.trim() || null,
      price: body.price ?? 0,
      period: body.period ?? 30,
      maxRestaurants: body.maxRestaurants ?? 1,
      maxUsers: body.maxUsers ?? 5,
      maxTranscriptions: body.maxTranscriptions ?? 100,
      sortOrder: body.sortOrder ?? 0,
      createdBy: user.id
    }
  })

  console.log(`[tariffs] Created tariff: ${tariff.id} "${tariff.name}" (${tariff.price} RUB)`)

  return tariff
})
