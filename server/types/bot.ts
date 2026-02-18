// Состояния онбординга пользователя в боте
// Новый флоу: /start -> Контакт -> Имя орг -> Масштаб -> Авто-создание всего
export const BotState = {
  WAITING_CONTACT: 'WAITING_CONTACT',
  WAITING_NAME: 'WAITING_NAME',
  WAITING_SCALE: 'WAITING_SCALE',
  COMPLETED: 'COMPLETED'
} as const

export type BotStateType = typeof BotState[keyof typeof BotState]
