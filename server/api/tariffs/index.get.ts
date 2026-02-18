/**
 * GET /api/tariffs — Список тарифов
 *
 * Доступ:
 * - SUPER_ADMIN: все тарифы (включая неактивные)
 * - OWNER/MANAGER: только активные тарифы
 * - Без авторизации: только активные тарифы (для лендинга)
 */
export default defineEventHandler(async (event) => {
  // Тарифы могут быть публичными (для лендинга), но авторизованные видят больше
  let showAll = false

  try {
    const user = await requireAuth(event)
    if (user.role === 'SUPER_ADMIN') {
      showAll = true
    }
  } catch {
    // Неавторизованные — только активные
  }

  const tariffs = await prisma.tariff.findMany({
    where: showAll
      ? { deletedAt: null }
      : { deletedAt: null, isActive: true },
    orderBy: { sortOrder: 'asc' },
    include: {
      _count: {
        select: {
          billings: true,
          payments: true
        }
      }
    }
  })

  console.log(`[tariffs] Listed ${tariffs.length} tariffs (showAll: ${showAll})`)

  return tariffs
})
