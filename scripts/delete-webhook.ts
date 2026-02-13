import 'dotenv/config'

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

if (!TELEGRAM_BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN не установлен в .env')
  process.exit(1)
}

async function deleteWebhook() {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteWebhook`

  try {
    const response = await fetch(url)
    const data = await response.json()

    if (data.ok) {
      console.log('✅ Webhook успешно удален!')
    } else {
      console.error('❌ Ошибка при удалении webhook:', data.description)
    }
  } catch (error) {
    console.error('❌ Ошибка:', error)
  }
}

deleteWebhook()
