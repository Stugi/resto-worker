/**
 * POST /api/payments/create — Создать платёж и получить ссылку на оплату
 *
 * Поток оплаты:
 * 1. Фронтенд вызывает этот эндпоинт с tariffId и organizationId
 * 2. Мы создаём заказ в Альфа-Банке (register.do)
 * 3. Получаем formUrl — ссылку на платёжную форму
 * 4. Возвращаем formUrl фронтенду для редиректа
 * 5. После оплаты Альфа-Банк редиректит на success/fail страницу
 * 6. Фронтенд вызывает /api/payments/check для проверки статуса
 *
 * Доступ: SUPER_ADMIN или OWNER своей организации
 *
 * Body:
 * - tariffId: string (обязательно)
 * - organizationId: string (обязательно)
 */
import { createId } from '@paralleldrive/cuid2'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const body = await readBody<{
    tariffId: string
    organizationId: string
  }>(event)

  if (!body.tariffId || !body.organizationId) {
    throw createError({ statusCode: 400, message: 'tariffId и organizationId обязательны' })
  }

  // Проверяем доступ к организации
  if (user.role !== 'SUPER_ADMIN') {
    if (user.organizationId !== body.organizationId) {
      throw createError({ statusCode: 403, message: 'Нет доступа к этой организации' })
    }
  }

  // Проверяем тариф
  const tariff = await prisma.tariff.findUnique({
    where: { id: body.tariffId, deletedAt: null, isActive: true }
  })

  if (!tariff) {
    throw createError({ statusCode: 404, message: 'Тариф не найден или неактивен' })
  }

  if (tariff.price <= 0) {
    throw createError({ statusCode: 400, message: 'Бесплатный тариф не требует оплаты' })
  }

  // Проверяем организацию
  const organization = await prisma.organization.findUnique({
    where: { id: body.organizationId, deletedAt: null },
    include: { billing: true }
  })

  if (!organization) {
    throw createError({ statusCode: 404, message: 'Организация не найдена' })
  }

  // Создаём запись платежа
  const paymentId = createId()
  const orderNumber = `RW-${Date.now()}-${paymentId.slice(-6)}`

  // Считаем период подписки
  const periodStart = new Date()
  const periodEnd = new Date()
  periodEnd.setDate(periodEnd.getDate() + tariff.period)

  console.log(`[payments] Creating payment: org=${body.organizationId}, tariff=${tariff.name}, amount=${tariff.price} RUB`)

  // Создаём заказ в Альфа-Банке
  let alfaOrder
  try {
    alfaOrder = await createAlfaOrder({
      orderNumber,
      amount: tariff.price,
      description: `Подписка "${tariff.name}" — ${tariff.period} дней`,
      paymentId
    })
  } catch (err: any) {
    console.error('[payments] Alfa-Bank order creation failed:', err.message)
    throw createError({
      statusCode: 502,
      message: `Ошибка создания заказа в банке: ${err.message}`
    })
  }

  // Сохраняем платёж в БД
  const payment = await prisma.payment.create({
    data: {
      id: paymentId,
      amount: tariff.price,
      status: 'CREATED',
      organizationId: body.organizationId,
      tariffId: body.tariffId,
      billingId: organization.billing?.id || null,
      alfaOrderId: alfaOrder.orderId,
      alfaFormUrl: alfaOrder.formUrl,
      periodStart,
      periodEnd
    }
  })

  console.log(`[payments] Payment created: ${payment.id}, alfaOrderId=${alfaOrder.orderId}, formUrl=${alfaOrder.formUrl}`)

  return {
    paymentId: payment.id,
    formUrl: alfaOrder.formUrl,
    amount: tariff.price,
    tariffName: tariff.name
  }
})
