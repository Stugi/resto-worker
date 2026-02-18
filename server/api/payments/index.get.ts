/**
 * GET /api/payments — История платежей
 *
 * Доступ:
 * - SUPER_ADMIN: все платежи
 * - OWNER: только платежи своей организации
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const query = getQuery(event)
  const organizationId = query.organizationId as string | undefined

  let where: any = {}

  if (user.role === 'SUPER_ADMIN') {
    // SUPER_ADMIN видит все, с опциональным фильтром по организации
    if (organizationId) {
      where.organizationId = organizationId
    }
  } else if (user.role === 'OWNER') {
    // OWNER видит только свои
    if (!user.organizationId) {
      throw createError({ statusCode: 400, message: 'У пользователя нет организации' })
    }
    where.organizationId = user.organizationId
  } else {
    throw createError({ statusCode: 403, message: 'Доступ запрещен' })
  }

  const payments = await prisma.payment.findMany({
    where,
    include: {
      tariff: { select: { id: true, name: true, price: true, period: true } },
      organization: { select: { id: true, name: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: 50
  })

  console.log(`[payments] Listed ${payments.length} payments (user=${user.id}, role=${user.role})`)

  return payments
})
