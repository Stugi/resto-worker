import crypto from 'crypto'
import { SessionExpiredError } from './userbot-errors'

const ALGORITHM = 'aes-256-gcm'

interface EncryptedSession {
  iv: string
  encrypted: string
  authTag: string
}

// Шифрование session string
export function encryptSession(sessionString: string, encryptionKey: string): string {
  const key = Buffer.from(encryptionKey, 'hex')
  const iv = crypto.randomBytes(16)

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  let encrypted = cipher.update(sessionString, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag()

  return JSON.stringify({
    iv: iv.toString('hex'),
    encrypted,
    authTag: authTag.toString('hex')
  })
}

// Расшифровка session string
export function decryptSession(encryptedData: string, encryptionKey: string): string {
  try {
    const { iv, encrypted, authTag } = JSON.parse(encryptedData) as EncryptedSession
    const key = Buffer.from(encryptionKey, 'hex')

    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      key,
      Buffer.from(iv, 'hex')
    )

    decipher.setAuthTag(Buffer.from(authTag, 'hex'))

    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  } catch (error) {
    throw new SessionExpiredError('Не удалось расшифровать session')
  }
}

// Получение активной сессии из env
export function getActiveSession(): string {
  const encryptedSession = process.env.USERBOT_SESSION_ENCRYPTED
  const encryptionKey = process.env.USERBOT_ENCRYPTION_KEY

  if (!encryptedSession || !encryptionKey) {
    throw new SessionExpiredError('USERBOT_SESSION_ENCRYPTED или USERBOT_ENCRYPTION_KEY не установлены')
  }

  return decryptSession(encryptedSession, encryptionKey)
}
