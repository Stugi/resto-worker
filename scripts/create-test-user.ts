import { PrismaClient } from '@prisma/client'
import { createId } from '@paralleldrive/cuid2'

const prisma = new PrismaClient()

async function main() {
  // Создаем тестового пользователя с известным Telegram ID
  const testUser = await prisma.user.create({
    data: {
      id: createId(),
      telegramId: '123456789', // Тестовый ID
      name: 'Test User',
      role: 'OWNER',
      createdBy: 'script'
    }
  })

  console.log('✅ Тестовый пользователь создан:')
  console.log('ID:', testUser.id)
  console.log('Telegram ID:', testUser.telegramId)
  console.log('Имя:', testUser.name)
  console.log('Роль:', testUser.role)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
