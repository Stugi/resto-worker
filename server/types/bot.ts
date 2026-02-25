// Состояния онбординга пользователя в боте
// Флоу: /start -> СТАРТ -> Контакт -> Имя ресторана -> Масштаб -> Пример отчёта -> Поехали -> Создание всего
export const BotState = {
  WAITING_START: 'WAITING_START',
  WAITING_CONTACT: 'WAITING_CONTACT',
  WAITING_NAME: 'WAITING_NAME',
  WAITING_SCALE: 'WAITING_SCALE',
  WAITING_CONFIRM: 'WAITING_CONFIRM',
  COMPLETED: 'COMPLETED'
} as const

export type BotStateType = typeof BotState[keyof typeof BotState]
