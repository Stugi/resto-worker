import 'dotenv/config'

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const WEBHOOK_URL = process.argv[2]

if (!TELEGRAM_BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN не установлен в .env')
  process.exit(1)
}

if (!WEBHOOK_URL) {
  console.error('❌ Укажите URL для webhook')
  console.log('Использование: tsx scripts/set-webhook.ts <WEBHOOK_URL>')
  console.log('Пример: tsx scripts/set-webhook.ts https://your-domain.com/api/bot/webhook')
  process.exit(1)
}

async function setWebhook() {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook?url=${WEBHOOK_URL}`

  try {
    const response = await fetch(url)
    const data = await response.json()

    if (data.ok) {
      console.log('✅ Webhook успешно установлен!')
      console.log(`📍 URL: ${WEBHOOK_URL}`)
    } else {
      console.error('❌ Ошибка при установке webhook:', data.description)
    }
  } catch (error) {
    console.error('❌ Ошибка:', error)
  }
}

setWebhook()
