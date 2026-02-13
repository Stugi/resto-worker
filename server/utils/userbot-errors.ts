// Базовая ошибка userbot
export class UserbotError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UserbotError'
  }
}

// Превышение лимитов
export class TooManyRequestsError extends UserbotError {
  constructor(message: string = 'Слишком много запросов. Попробуйте позже.') {
    super(message)
    this.name = 'TooManyRequestsError'
  }
}

// Session устарел
export class SessionExpiredError extends UserbotError {
  constructor(message: string = 'Сессия userbot устарела. Требуется реавторизация.') {
    super(message)
    this.name = 'SessionExpiredError'
  }
}

// Пользователь не найден в Telegram
export class UserNotFoundError extends UserbotError {
  constructor(telegramId: string) {
    super(`Пользователь с telegramId ${telegramId} не найден в Telegram`)
    this.name = 'UserNotFoundError'
  }
}

// Telegram Flood Limit
export class FloodWaitError extends UserbotError {
  public waitSeconds: number

  constructor(waitSeconds: number) {
    super(`Telegram flood limit. Ожидание ${waitSeconds} секунд.`)
    this.name = 'FloodWaitError'
    this.waitSeconds = waitSeconds
  }
}

// Общая ошибка создания группы
export class GroupCreationError extends UserbotError {
  constructor(message: string) {
    super(`Не удалось создать группу: ${message}`)
    this.name = 'GroupCreationError'
  }
}
