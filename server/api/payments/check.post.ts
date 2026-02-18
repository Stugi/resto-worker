/**
 * POST /api/payments/check — Проверить статус платежа в Альфа-Банке
 *
 * Вызывается:
 * 1. Со страницы success/fail после редиректа от Альфа-Банка
 * 2. Вручную из админки для проверки статуса
 *
 * Если оплата прошла:
 * - Обновляем Payment.status = COMPLETED
 * - Обновляем Billing: tariffId, activeUntil, status = ACTIVE
 * - Сбрасываем счётчик транскрипций
 *
 * Body:
 * - paymentId: string (обязательно)
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<{ paymentId: string }>(event)

  if (!body.paymentId) {
    throw createError({ statusCode: 400, message: 'paymentId обязателен' })
  }

  const payment = await prisma.payment.findUnique({
    where: { id: body.paymentId },
    include: {
      tariff: true,
      organization: { include: { billing: true } }
    }
  })

  if (!payment) {
    throw createError({ statusCode: 404, message: 'Платёж не найден' })
  }

  // Если платёж уже обработан, просто возвращаем статус
  if (payment.status === 'COMPLETED' || payment.status === 'FAILED' || payment.status === 'REFUNDED') {
    console.log(`[payments] Payment ${payment.id} already processed: ${payment.status}`)
    return {
      paymentId: payment.id,
      status: payment.status,
      amount: payment.amount,
      tariffName: payment.tariff?.name
    }
  }

  if (!payment.alfaOrderId) {
    throw createError({ statusCode: 400, message: 'Платёж не имеет alfaOrderId' })
  }

  // Проверяем статус в Альфа-Банке
  console.log(`[payments] Checking Alfa-Bank status for payment ${payment.id}, alfaOrderId=${payment.alfaOrderId}`)

  let alfaStatus
  try {
    alfaStatus = await getAlfaOrderStatus(payment.alfaOrderId)
  } catch (err: any) {
    console.error('[payments] Alfa-Bank status check failed:', err.message)
    throw createError({
      statusCode: 502,
      message: `Ошибка проверки статуса в банке: ${err.message}`
    })
  }

  console.log(`[payments] Alfa-Bank response: orderStatus=${alfaStatus.orderStatus}, actionCode=${alfaStatus.actionCode}`)

  // Обновляем alfaStatus в платеже
  await prisma.payment.update({
    where: { id: payment.id },
    data: { alfaStatus: alfaStatus.orderStatus }
  })

  // Проверяем: оплата успешна?
  if (isPaymentSuccessful(alfaStatus.orderStatus)) {
    console.log(`[payments] Payment ${payment.id} SUCCESSFUL! Activating subscription...`)

    // Обновляем платёж
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date()
      }
    })

    // Обновляем биллинг организации
    if (payment.organization.billing) {
      await prisma.billing.update({
        where: { id: payment.organization.billing.id },
        data: {
          status: 'ACTIVE',
          tariffId: payment.tariffId,
          activeUntil: payment.periodEnd,
          transcriptionsUsed: 0 // Сброс счётчика при оплате
        }
      })

      console.log(`[payments] Billing updated: org=${payment.organizationId}, activeUntil=${payment.periodEnd}, tariff=${payment.tariff?.name}`)
    }

    return {
      paymentId: payment.id,
      status: 'COMPLETED',
      amount: payment.amount,
      tariffName: payment.tariff?.name,
      activeUntil: payment.periodEnd
    }
  }

  // Оплата не прошла
  const isDeclined = alfaStatus.orderStatus === 6 // DECLINED

  if (isDeclined) {
    console.log(`[payments] Payment ${payment.id} DECLINED (actionCode=${alfaStatus.actionCode})`)

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'FAILED',
        error: alfaStatus.errorMessage || `Declined (actionCode: ${alfaStatus.actionCode})`
      }
    })

    return {
      paymentId: payment.id,
      status: 'FAILED',
      amount: payment.amount,
      tariffName: payment.tariff?.name,
      error: 'Оплата отклонена банком'
    }
  }

  // Ещё в процессе (REGISTERED, PENDING, ACS и т.д.)
  console.log(`[payments] Payment ${payment.id} still pending: alfaStatus=${alfaStatus.orderStatus}`)

  return {
    paymentId: payment.id,
    status: 'PENDING',
    amount: payment.amount,
    tariffName: payment.tariff?.name,
    alfaStatus: alfaStatus.orderStatus
  }
})
