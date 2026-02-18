/**
 * DELETE /api/tariffs/:id — Удалить тариф (soft delete)
 *
 * Доступ: только SUPER_ADMIN
 *
 * Проверяет что на тариф нет активных подписок.
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
    where: { id, deletedAt: null },
    include: {
      _count: {
        select: { billings: true }
      }
    }
  })

  if (!existing) {
    throw createError({ statusCode: 404, message: 'Тариф не найден' })
  }

  // Проверяем активные подписки
  if (existing._count.billings > 0) {
    console.warn(`[tariffs] Cannot delete tariff ${id}: has ${existing._count.billings} active billings`)
    throw createError({
      statusCode: 400,
      message: `Нельзя удалить тариф — на него привязано ${existing._count.billings} подписок. Деактивируйте его вместо удаления.`
    })
  }

  await prisma.tariff.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      deletedBy: user.id
    }
  })

  console.log(`[tariffs] Soft-deleted tariff: ${id} "${existing.name}"`)

  return { success: true, message: 'Тариф удален' }
})
