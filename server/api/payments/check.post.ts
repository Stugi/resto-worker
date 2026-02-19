/**
 * POST /api/payments/check — Проверить статус платежа в Тинькофф
 *
 * Вызывается:
 * 1. Со страницы success/fail после редиректа от Тинькофф
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

  if (!payment.providerPaymentId) {
    throw createError({ statusCode: 400, message: 'Платёж не имеет providerPaymentId' })
  }

  // Проверяем статус в Тинькофф
  console.log(`[payments] Checking Tinkoff status for payment ${payment.id}, providerPaymentId=${payment.providerPaymentId}`)

  let tinkoffState
  try {
    tinkoffState = await getTinkoffPaymentState(payment.providerPaymentId)
  } catch (err: any) {
    console.error('[payments] Tinkoff status check failed:', err.message)
    throw createError({
      statusCode: 502,
      message: `Ошибка проверки статуса в банке: ${err.message}`
    })
  }

  console.log(`[payments] Tinkoff response: status=${tinkoffState.status}, errorCode=${tinkoffState.errorCode}`)

  // Обновляем providerStatus в платеже
  await prisma.payment.update({
    where: { id: payment.id },
    data: { providerStatus: tinkoffState.status }
  })

  // Проверяем: оплата успешна?
  if (isPaymentSuccessful(tinkoffState.status)) {
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

  // Оплата не прошла — проверяем финальные неуспешные статусы
  const failedStatuses = [
    TinkoffPaymentStatus.REJECTED,
    TinkoffPaymentStatus.CANCELED,
    TinkoffPaymentStatus.AUTH_FAIL,
    TinkoffPaymentStatus.DEADLINE_EXPIRED
  ]

  if (failedStatuses.includes(tinkoffState.status as any)) {
    console.log(`[payments] Payment ${payment.id} FAILED: status=${tinkoffState.status}`)

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'FAILED',
        error: tinkoffState.message || `${tinkoffState.status} (errorCode: ${tinkoffState.errorCode})`
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

  // Ещё в процессе (NEW, FORM_SHOWED, AUTHORIZING и т.д.)
  console.log(`[payments] Payment ${payment.id} still pending: tinkoffStatus=${tinkoffState.status}`)

  return {
    paymentId: payment.id,
    status: 'PENDING',
    amount: payment.amount,
    tariffName: payment.tariff?.name,
    providerStatus: tinkoffState.status
  }
})
