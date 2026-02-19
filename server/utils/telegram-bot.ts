/**
 * Общий экземпляр Telegram бота (Grammy)
 *
 * Используется в:
 * - server/api/bot/webhook.post.ts — обработка входящих сообщений
 * - server/api/payments/send-to-telegram.post.ts — отправка ссылок на оплату
 */
import { Bot } from 'grammy'

const token = process.env.TELEGRAM_BOT_TOKEN

if (!token) {
  throw new Error('TELEGRAM_BOT_TOKEN is not set')
}

export const bot = new Bot(token)
