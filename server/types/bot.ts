// Состояния онбординга пользователя в боте
export const BotState = {
  WAITING_NAME: 'WAITING_NAME',
  WAITING_SCALE: 'WAITING_SCALE',
  WAITING_CONTACT: 'WAITING_CONTACT',
  WAITING_FIRST_REST: 'WAITING_FIRST_REST',
  WAITING_CHAT_CHOICE: 'WAITING_CHAT_CHOICE',
  COMPLETED: 'COMPLETED'
} as const

export type BotStateType = typeof BotState[keyof typeof BotState]
