import { TelegramClient } from 'telegram'
import { StringSession } from 'telegram/sessions'
import { input } from '@inquirer/prompts'
import crypto from 'crypto'

async function initUserbot() {
  console.log('=== Инициализация Userbot ===\n')

  // 1. Запросить credentials
  console.log('Получи API credentials на https://my.telegram.org/apps\n')

  const apiId = await input({ message: 'API ID:' })
  const apiHash = await input({ message: 'API Hash:' })

  // 2. Создать клиент
  const stringSession = new StringSession('')
  const client = new TelegramClient(
    stringSession,
    Number(apiId),
    apiHash,
    { connectionRetries: 5 }
  )

  console.log('\nНачинаем авторизацию...\n')

  // 3. Авторизация
  await client.start({
    phoneNumber: async () => await input({
      message: 'Номер телефона (например +79991234567):'
    }),
    password: async () => {
      const pwd = await input({
        message: '2FA пароль (если включен, иначе нажми Enter):',
      })
      return pwd || undefined
    },
    phoneCode: async () => await input({
      message: 'Код из Telegram:'
    }),
    onError: (err) => {
      console.error('Ошибка авторизации:', err)
      throw err
    }
  })

  console.log('\n✅ Авторизация успешна!\n')

  // 4. Получить session string
  const sessionString = stringSession.save() as string

  // 5. Сгенерировать encryption key
  const encryptionKey = crypto.randomBytes(32).toString('hex')

  // 6. Зашифровать session
  const encrypted = encryptSession(sessionString, encryptionKey)

  console.log('=== Добавь в .env файл ===\n')
  console.log(`USERBOT_API_ID="${apiId}"`)
  console.log(`USERBOT_API_HASH="${apiHash}"`)
  console.log(`USERBOT_SESSION_ENCRYPTED='${encrypted}'`)
  console.log(`USERBOT_ENCRYPTION_KEY="${encryptionKey}"`)
  console.log(`\nТакже добавь:`)
  console.log(`TELEGRAM_BOT_USERNAME="твой_бот_username"`)
  console.log(`USERBOT_ENABLED="true"`)

  console.log('\n⚠️  ВАЖНО: Храни эти данные в безопасности!')
  console.log('Не коммить в Git!')
  console.log('\nДобавь их в .env локально и в Vercel Environment Variables\n')

  await client.disconnect()
  process.exit(0)
}

function encryptSession(sessionString: string, encryptionKey: string): string {
  const algorithm = 'aes-256-gcm'
  const key = Buffer.from(encryptionKey, 'hex')
  const iv = crypto.randomBytes(16)

  const cipher = crypto.createCipheriv(algorithm, key, iv)
  let encrypted = cipher.update(sessionString, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag()

  return JSON.stringify({
    iv: iv.toString('hex'),
    encrypted,
    authTag: authTag.toString('hex')
  })
}

initUserbot().catch((err) => {
  console.error('FATAL ERROR:', err)
  process.exit(1)
})
