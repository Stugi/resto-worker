/**
 * POST /api/payments/send-to-telegram — Создать платёж и отправить ссылку в Telegram
 *
 * Поток:
 * 1. Создаём платёж в Тинькофф (Init) — как в create.post.ts
 * 2. Находим владельца организации с telegramId
 * 3. Отправляем сообщение со ссылкой на оплату в Telegram бот
 *
 * Body:
 * - tariffId: string
 * - organizationId: string
 */
import { createId } from '@paralleldrive/cuid2'
import { MSG_PAYMENT_LINK_PLAIN } from '../../constants/bot-messages'

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

  // Находим владельца с telegramId
  const owner = await prisma.user.findFirst({
    where: {
      organizationId: body.organizationId,
      telegramId: { not: null }
    },
    orderBy: { createdAt: 'asc' }
  })

  if (!owner?.telegramId) {
    throw createError({ statusCode: 400, message: 'Не найден пользователь с Telegram для этой организации' })
  }

  // Создаём запись платежа
  const paymentId = createId()
  const orderNumber = `RW-${Date.now()}-${paymentId.slice(-6)}`

  const periodStart = new Date()
  const periodEnd = new Date()
  periodEnd.setDate(periodEnd.getDate() + tariff.period)

  console.log(`[payments] Creating payment for Telegram: org=${body.organizationId}, tariff=${tariff.name}, amount=${tariff.price} RUB`)

  // Создаём платёж в Тинькофф
  let tinkoffPayment
  try {
    tinkoffPayment = await createTinkoffPayment({
      orderId: orderNumber,
      amount: tariff.price,
      description: `Подписка "${tariff.name}" — ${tariff.period} дней`,
      paymentId
    })
  } catch (err: any) {
    console.error('[payments] Tinkoff payment creation failed:', err.message)
    throw createError({
      statusCode: 502,
      message: `Ошибка создания платежа: ${err.message}`
    })
  }

  // Сохраняем платёж в БД
  await prisma.payment.create({
    data: {
      id: paymentId,
      amount: tariff.price,
      status: 'CREATED',
      organizationId: body.organizationId,
      tariffId: body.tariffId,
      billingId: organization.billing?.id || null,
      providerPaymentId: tinkoffPayment.paymentId,
      paymentUrl: tinkoffPayment.paymentUrl,
      periodStart,
      periodEnd
    }
  })

  // Отправляем ссылку в Telegram
  const message = MSG_PAYMENT_LINK_PLAIN(organization.name, tariff.name, tariff.price, tariff.period, tinkoffPayment.paymentUrl)

  try {
    await bot.api.sendMessage(owner.telegramId, message)
    console.log(`[payments] Payment link sent to Telegram: user=${owner.telegramId}, payment=${paymentId}`)
  } catch (err: any) {
    console.error('[payments] Failed to send Telegram message:', err.message)
    // Платёж уже создан — возвращаем успех, но с предупреждением
    return {
      paymentId,
      sent: false,
      formUrl: tinkoffPayment.paymentUrl,
      warning: 'Платёж создан, но не удалось отправить в Telegram. Ссылка на оплату доступна.'
    }
  }

  return {
    paymentId,
    sent: true,
    formUrl: tinkoffPayment.paymentUrl
  }
})
