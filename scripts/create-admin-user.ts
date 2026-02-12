import { PrismaClient } from '@prisma/client'
import { createId } from '@paralleldrive/cuid2'
import { hash } from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  const passwordHash = await hash('admin123', 10)

  const user = await prisma.user.create({
    data: {
      id: createId(),
      login: 'admin@resto.worker',
      passwordHash,
      name: 'Admin User',
      role: 'SUPER_ADMIN'
    }
  })

  console.log('✅ Админ создан:')
  console.log('ID:', user.id)
  console.log('Логин:', user.login)
  console.log('Пароль: admin123')
  console.log('Роль:', user.role)
}

main()
  .catch((e) => {
    console.error('❌ Ошибка:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
