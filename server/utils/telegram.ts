import crypto from 'crypto'

export interface TelegramAuthData {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}

/**
 * Проверяет подлинность данных от Telegram Login Widget
 * https://core.telegram.org/widgets/login#checking-authorization
 */
export function verifyTelegramAuth(authData: TelegramAuthData, botToken: string): boolean {
  const { hash, ...data } = authData

  // Создаем строку для проверки
  const dataCheckString = Object.keys(data)
    .sort()
    .map(key => `${key}=${data[key as keyof typeof data]}`)
    .join('\n')

  // Создаем секретный ключ из токена бота
  const secretKey = crypto
    .createHash('sha256')
    .update(botToken)
    .digest()

  // Вычисляем hash
  const computedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex')

  // Сравниваем hashes
  return computedHash === hash
}

/**
 * Проверяет, что данные авторизации не старше 24 часов
 */
export function isAuthDataFresh(authDate: number): boolean {
  const now = Math.floor(Date.now() / 1000)
  const maxAge = 24 * 60 * 60 // 24 часа в секундах

  return (now - authDate) < maxAge
}

/**
 * Форматирует Telegram ID в строку
 */
export function formatTelegramId(telegramId: number): string {
  return telegramId.toString()
}
