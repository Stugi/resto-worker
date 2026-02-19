/**
 * Тинькофф Касса — утилиты для работы с API
 *
 * Документация: https://www.tinkoff.ru/kassa/develop/api/payments/
 *
 * Основные методы:
 * - Init — создание платежа, получение ссылки на оплату
 * - GetState — проверка статуса платежа
 *
 * Sandbox: https://rest-api-test.tinkoff.ru/v2
 * Production: https://securepay.tinkoff.ru/v2
 */
import { createHash } from 'crypto'

// Статусы платежа Тинькофф
export const TinkoffPaymentStatus = {
  NEW: 'NEW',                       // Платёж создан
  FORM_SHOWED: 'FORM_SHOWED',      // Форма оплаты открыта
  AUTHORIZING: 'AUTHORIZING',      // Авторизация
  AUTHORIZED: 'AUTHORIZED',        // Сумма захолдирована
  AUTH_FAIL: 'AUTH_FAIL',           // Авторизация отклонена
  CONFIRMING: 'CONFIRMING',        // Подтверждение
  CONFIRMED: 'CONFIRMED',          // Платёж подтверждён (успех)
  REJECTED: 'REJECTED',            // Отклонён банком
  CANCELED: 'CANCELED',            // Отменён
  REFUNDING: 'REFUNDING',          // Возврат в процессе
  REFUNDED: 'REFUNDED',            // Полный возврат
  PARTIAL_REFUNDED: 'PARTIAL_REFUNDED', // Частичный возврат
  DEADLINE_EXPIRED: 'DEADLINE_EXPIRED', // Срок оплаты истёк
  REVERSED: 'REVERSED',            // Холд отменён
} as const

// Конфигурация
function getConfig() {
  const terminalKey = process.env.TINKOFF_TERMINAL_KEY
  const password = process.env.TINKOFF_PASSWORD
  const baseUrl = process.env.TINKOFF_API_URL || 'https://rest-api-test.tinkoff.ru/v2'
  const returnUrl = process.env.TINKOFF_RETURN_URL || `${process.env.APP_URL || 'https://resto-worker.vercel.app'}/payment/success`
  const failUrl = process.env.TINKOFF_FAIL_URL || `${process.env.APP_URL || 'https://resto-worker.vercel.app'}/payment/fail`

  if (!terminalKey || !password) {
    throw new Error('TINKOFF_TERMINAL_KEY и TINKOFF_PASSWORD обязательны')
  }

  return { terminalKey, password, baseUrl, returnUrl, failUrl }
}

/**
 * Генерация Token для подписи запроса
 *
 * 1. Добавить Password к параметрам
 * 2. Отсортировать по ключу
 * 3. Конкатенировать значения
 * 4. SHA-256
 */
function generateToken(params: Record<string, string | number | boolean>, password: string): string {
  const paramsWithPassword: Record<string, string> = { Password: password }

  for (const [key, value] of Object.entries(params)) {
    if (key === 'Token' || key === 'Receipt' || key === 'DATA') continue
    paramsWithPassword[key] = String(value)
  }

  const sortedKeys = Object.keys(paramsWithPassword).sort()
  const concatenated = sortedKeys.map(key => paramsWithPassword[key]).join('')

  return createHash('sha256').update(concatenated).digest('hex')
}

/**
 * Создать платёж в Тинькофф (Init)
 * Возвращает PaymentId и PaymentURL (ссылка на страницу оплаты)
 */
export async function createTinkoffPayment(params: {
  orderId: string         // Уникальный номер заказа в нашей системе
  amount: number          // Сумма в рублях
  description?: string    // Описание заказа
  paymentId: string       // Наш ID платежа — добавляется в SuccessURL/FailURL
}): Promise<{
  paymentId: string       // PaymentId от Тинькофф
  paymentUrl: string      // URL для перенаправления на оплату
}> {
  const config = getConfig()

  // Тинькофф принимает сумму в копейках
  const amountInKopecks = Math.round(params.amount * 100)

  // Добавляем наш paymentId в URL для идентификации после редиректа
  const successUrl = `${config.returnUrl}?paymentId=${params.paymentId}`
  const failUrl = `${config.failUrl}?paymentId=${params.paymentId}`

  const requestParams: Record<string, string | number> = {
    TerminalKey: config.terminalKey,
    Amount: amountInKopecks,
    OrderId: params.orderId,
    Description: params.description || 'Оплата подписки RestoWorker',
    SuccessURL: successUrl,
    FailURL: failUrl,
  }

  const token = generateToken(requestParams, config.password)

  console.log(`[tinkoff] Creating payment: ${params.orderId}, amount: ${params.amount} RUB`)

  const response = await $fetch<{
    Success: boolean
    PaymentId?: string
    PaymentURL?: string
    Status?: string
    ErrorCode?: string
    Message?: string
    Details?: string
  }>(`${config.baseUrl}/Init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { ...requestParams, Token: token }
  })

  if (!response.Success || !response.PaymentId || !response.PaymentURL) {
    console.error('[tinkoff] Error creating payment:', response)
    throw new Error(`Тинькофф: ${response.Message || response.Details || 'Ошибка создания платежа'}`)
  }

  console.log(`[tinkoff] Payment created: ${response.PaymentId}`)

  return {
    paymentId: response.PaymentId,
    paymentUrl: response.PaymentURL
  }
}

/**
 * Проверить статус платежа в Тинькофф (GetState)
 */
export async function getTinkoffPaymentState(paymentId: string): Promise<{
  status: string
  amount: number         // В копейках
  orderId: string
  errorCode: string
  message: string
}> {
  const config = getConfig()

  const requestParams: Record<string, string> = {
    TerminalKey: config.terminalKey,
    PaymentId: paymentId
  }

  const token = generateToken(requestParams, config.password)

  console.log(`[tinkoff] Checking payment status: ${paymentId}`)

  const response = await $fetch<any>(`${config.baseUrl}/GetState`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { ...requestParams, Token: token }
  })

  console.log(`[tinkoff] Payment status: ${response.Status}, errorCode: ${response.ErrorCode}`)

  return {
    status: response.Status,
    amount: response.Amount,
    orderId: response.OrderId,
    errorCode: response.ErrorCode || '0',
    message: response.Message || ''
  }
}

/**
 * Проверяем — оплата прошла успешно?
 */
export function isPaymentSuccessful(status: string): boolean {
  return status === TinkoffPaymentStatus.CONFIRMED || status === TinkoffPaymentStatus.AUTHORIZED
}
