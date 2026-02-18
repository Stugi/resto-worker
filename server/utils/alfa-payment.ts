/**
 * Альфа-Банк Интернет-Эквайринг — утилиты для работы с API
 *
 * Документация:
 * - REST API: https://ecom.alfabank.ru/assets/instructions/merchantManual/pages/index/rest.html
 * - Песочница: https://web.rbsuat.com (тестовые данные из .env)
 *
 * Основные методы:
 * - register.do — создание заказа, получение ссылки на оплату
 * - getOrderStatusExtended.do — проверка статуса оплаты
 *
 * Тестовые карты:
 * - 4300 0000 0000 0777 (12/30, CVV 111) — Успешная оплата
 * - 4000 0000 0000 0119 (12/30, CVV 111) — Для отмен/возвратов
 */

// Статусы заказа от Альфа-Банка
export const AlfaOrderStatus = {
  REGISTERED: 0,        // Заказ зарегистрирован, но не оплачен
  PRE_AUTHORIZED: 1,    // Предавторизованная сумма захолдирована
  COMPLETED: 2,         // Проведена полная авторизация
  REVERSED: 3,          // Авторизация отменена
  REFUNDED: 4,          // По транзакции была проведена операция возврата
  AUTHORIZED_ACS: 5,    // Инициирована авторизация через ACS
  DECLINED: 6           // Авторизация отклонена
} as const

// Конфигурация
function getConfig() {
  const login = process.env.ALFA_MERCHANT_LOGIN
  const password = process.env.ALFA_MERCHANT_PASSWORD
  const baseUrl = process.env.ALFA_API_URL || 'https://web.rbsuat.com/payment/rest'
  const returnUrl = process.env.ALFA_RETURN_URL || `${process.env.APP_URL || 'https://resto-worker.vercel.app'}/payment/success`
  const failUrl = process.env.ALFA_FAIL_URL || `${process.env.APP_URL || 'https://resto-worker.vercel.app'}/payment/fail`

  if (!login || !password) {
    throw new Error('ALFA_MERCHANT_LOGIN и ALFA_MERCHANT_PASSWORD обязательны')
  }

  return { login, password, baseUrl, returnUrl, failUrl }
}

/**
 * Создать заказ в Альфа-Банке
 * Возвращает orderId и formUrl (ссылка на страницу оплаты)
 */
export async function createAlfaOrder(params: {
  orderNumber: string      // Уникальный номер заказа в нашей системе
  amount: number           // Сумма в рублях
  description?: string     // Описание заказа
  paymentId: string        // Наш ID платежа — добавляется в returnUrl/failUrl
}): Promise<{
  orderId: string          // ID заказа в Альфа-Банке
  formUrl: string          // URL для перенаправления на оплату
}> {
  const config = getConfig()

  // Альфа-Банк принимает сумму в копейках
  const amountInKopecks = Math.round(params.amount * 100)

  // Добавляем paymentId в URL для идентификации платежа после редиректа
  const returnUrl = `${config.returnUrl}?paymentId=${params.paymentId}`
  const failUrl = `${config.failUrl}?paymentId=${params.paymentId}`

  const searchParams = new URLSearchParams({
    userName: config.login,
    password: config.password,
    orderNumber: params.orderNumber,
    amount: amountInKopecks.toString(),
    returnUrl,
    failUrl,
    description: params.description || 'Оплата подписки RestoWorker'
  })

  console.log(`[alfa] Creating order: ${params.orderNumber}, amount: ${params.amount} RUB`)

  const response = await $fetch<{
    orderId?: string
    formUrl?: string
    errorCode?: string
    errorMessage?: string
  }>(`${config.baseUrl}/register.do`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: searchParams.toString()
  })

  if (response.errorCode && response.errorCode !== '0') {
    console.error('[alfa] Error creating order:', response)
    throw new Error(`Альфа-Банк: ${response.errorMessage || 'Ошибка создания заказа'}`)
  }

  if (!response.orderId || !response.formUrl) {
    throw new Error('Альфа-Банк: Не получен orderId или formUrl')
  }

  console.log(`[alfa] Order created: ${response.orderId}`)

  return {
    orderId: response.orderId,
    formUrl: response.formUrl
  }
}

/**
 * Проверить статус заказа в Альфа-Банке
 */
export async function getAlfaOrderStatus(orderId: string): Promise<{
  orderStatus: number
  amount: number          // В копейках
  errorCode: string
  errorMessage: string
  orderNumber: string
  actionCode: number      // 0 = успех
}> {
  const config = getConfig()

  const searchParams = new URLSearchParams({
    userName: config.login,
    password: config.password,
    orderId
  })

  console.log(`[alfa] Checking order status: ${orderId}`)

  const response = await $fetch<any>(`${config.baseUrl}/getOrderStatusExtended.do`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: searchParams.toString()
  })

  console.log(`[alfa] Order status: ${response.orderStatus}, actionCode: ${response.actionCode}`)

  return response
}

/**
 * Проверяем — оплата прошла успешно?
 */
export function isPaymentSuccessful(orderStatus: number): boolean {
  return orderStatus === AlfaOrderStatus.COMPLETED || orderStatus === AlfaOrderStatus.PRE_AUTHORIZED
}
