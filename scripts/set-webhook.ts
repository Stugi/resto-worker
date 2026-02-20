import 'dotenv/config'

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const WEBHOOK_URL = process.argv[2]

if (!TELEGRAM_BOT_TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN not set in .env')
  process.exit(1)
}

const API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`

async function getWebhookInfo() {
  const response = await fetch(`${API}/getWebhookInfo`)
  const data = await response.json() as any

  console.log('\n--- Current Webhook Info ---')
  console.log(`URL: ${data.result?.url || '(not set)'}`)
  console.log(`Pending updates: ${data.result?.pending_update_count ?? '?'}`)
  console.log(`Last error: ${data.result?.last_error_message || '(none)'}`)
  if (data.result?.last_error_date) {
    console.log(`Last error date: ${new Date(data.result.last_error_date * 1000).toISOString()}`)
  }
  console.log(`Allowed updates: ${JSON.stringify(data.result?.allowed_updates || '(default)')}`)
  console.log('---\n')

  return data.result
}

async function setWebhook() {
  // Show current info first
  await getWebhookInfo()

  if (!WEBHOOK_URL) {
    console.log('Usage: tsx scripts/set-webhook.ts <WEBHOOK_URL>')
    console.log('Example: tsx scripts/set-webhook.ts https://your-domain.com/api/bot/webhook')
    console.log('\nNo URL provided — showing current webhook info only.')
    return
  }

  try {
    const response = await fetch(`${API}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: WEBHOOK_URL,
        allowed_updates: ['message', 'callback_query', 'my_chat_member']
      })
    })
    const data = await response.json() as any

    if (data.ok) {
      console.log('Webhook set successfully!')
      console.log(`URL: ${WEBHOOK_URL}`)
      console.log('Allowed updates: message, callback_query, my_chat_member')
    } else {
      console.error('Error setting webhook:', data.description)
    }
  } catch (error) {
    console.error('Error:', error)
  }
}

setWebhook()
