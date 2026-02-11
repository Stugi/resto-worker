import { PrismaClient, Role, BillingStatus } from '@prisma/client'
import { createId } from '@paralleldrive/cuid2'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Начинаем seeding базы данных...')

  // Очищаем существующие данные
  await prisma.restaurantStat.deleteMany()
  await prisma.restaurant.deleteMany()
  await prisma.user.deleteMany()
  await prisma.billing.deleteMany()
  await prisma.organization.deleteMany()

  console.log('✅ Очистка завершена')

  // Создаем организацию #1
  const org1 = await prisma.organization.create({
    data: {
      id: createId(),
      name: 'Сеть "Вкусно"',
      createdBy: 'seed'
    }
  })

  // Создаем биллинг для организации #1
  await prisma.billing.create({
    data: {
      id: createId(),
      organizationId: org1.id,
      status: BillingStatus.TRIAL,
      trialStartsAt: new Date(),
      createdBy: 'seed'
    }
  })

  console.log(`✅ Создана организация: ${org1.name}`)

  // Создаем организацию #2
  const org2 = await prisma.organization.create({
    data: {
      id: createId(),
      name: 'Premium Dining Group',
      createdBy: 'seed'
    }
  })

  // Создаем биллинг для организации #2
  await prisma.billing.create({
    data: {
      id: createId(),
      organizationId: org2.id,
      status: BillingStatus.ACTIVE,
      trialStartsAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 дней назад
      createdBy: 'seed'
    }
  })

  console.log(`✅ Создана организация: ${org2.name}`)

  // Хешируем пароли
  const adminHash = await bcrypt.hash('admin123', 10)
  const ownerHash = await bcrypt.hash('owner123', 10)
  const managerHash = await bcrypt.hash('manager123', 10)

  // Создаем SUPER_ADMIN
  const superAdmin = await prisma.user.create({
    data: {
      id: createId(),
      login: 'admin@resto.worker',
      passwordHash: adminHash,
      name: 'Супер Админ',
      phone: '+7 (999) 000-00-00',
      role: Role.SUPER_ADMIN,
      createdBy: 'seed'
    }
  })

  console.log(`✅ Создан SUPER_ADMIN: ${superAdmin.login}`)

  // Создаем OWNER для организации #1
  const owner1 = await prisma.user.create({
    data: {
      id: createId(),
      login: 'owner@vkusno.ru',
      passwordHash: ownerHash,
      name: 'Иванов Иван Иванович',
      phone: '+7 (999) 111-11-11',
      role: Role.OWNER,
      organizationId: org1.id,
      createdBy: 'seed'
    }
  })

  console.log(`✅ Создан OWNER для "${org1.name}": ${owner1.login}`)

  // Создаем OWNER для организации #2
  const owner2 = await prisma.user.create({
    data: {
      id: createId(),
      login: 'owner@premium.dining',
      passwordHash: ownerHash,
      name: 'Петрова Мария Сергеевна',
      phone: '+7 (999) 222-22-22',
      role: Role.OWNER,
      organizationId: org2.id,
      createdBy: 'seed'
    }
  })

  console.log(`✅ Создан OWNER для "${org2.name}": ${owner2.login}`)

  // Создаем рестораны для организации #1
  const restaurant1 = await prisma.restaurant.create({
    data: {
      id: createId(),
      name: 'Вкусно - Центр',
      organizationId: org1.id,
      settingsComment: JSON.stringify({
        address: 'Москва, ул. Тверская, 15',
        phone: '+7 (495) 000-00-01',
        workingHours: '9:00 - 23:00'
      }),
      createdBy: owner1.id
    }
  })

  const restaurant2 = await prisma.restaurant.create({
    data: {
      id: createId(),
      name: 'Вкусно - Север',
      organizationId: org1.id,
      settingsComment: JSON.stringify({
        address: 'Москва, просп. Мира, 88',
        phone: '+7 (495) 000-00-02',
        workingHours: '8:00 - 22:00'
      }),
      createdBy: owner1.id
    }
  })

  const restaurant3 = await prisma.restaurant.create({
    data: {
      id: createId(),
      name: 'Вкусно - Юг',
      organizationId: org1.id,
      settingsComment: JSON.stringify({
        address: 'Москва, ул. Профсоюзная, 42',
        phone: '+7 (495) 000-00-03',
        workingHours: '9:00 - 23:00'
      }),
      createdBy: owner1.id
    }
  })

  console.log(`✅ Создано 3 ресторана для "${org1.name}"`)

  // Создаем рестораны для организации #2
  const restaurant4 = await prisma.restaurant.create({
    data: {
      id: createId(),
      name: 'Premium Fine Dining',
      organizationId: org2.id,
      settingsComment: JSON.stringify({
        address: 'Москва, Кутузовский просп., 12',
        phone: '+7 (495) 000-00-04',
        workingHours: '12:00 - 00:00'
      }),
      createdBy: owner2.id
    }
  })

  console.log(`✅ Создан 1 ресторан для "${org2.name}"`)

  // Создаем MANAGER для ресторанов
  const manager1 = await prisma.user.create({
    data: {
      id: createId(),
      login: 'manager.center@vkusno.ru',
      passwordHash: managerHash,
      name: 'Сидоров Сергей Сергеевич',
      phone: '+7 (999) 333-33-33',
      role: Role.MANAGER,
      organizationId: org1.id,
      restaurantId: restaurant1.id,
      createdBy: owner1.id
    }
  })

  const manager2 = await prisma.user.create({
    data: {
      id: createId(),
      login: 'manager.north@vkusno.ru',
      passwordHash: managerHash,
      name: 'Николаев Николай Николаевич',
      phone: '+7 (999) 444-44-44',
      role: Role.MANAGER,
      organizationId: org1.id,
      restaurantId: restaurant2.id,
      createdBy: owner1.id
    }
  })

  const manager3 = await prisma.user.create({
    data: {
      id: createId(),
      login: 'manager.south@vkusno.ru',
      passwordHash: managerHash,
      name: 'Кузнецова Лариса Михайловна',
      phone: '+7 (999) 555-55-55',
      role: Role.MANAGER,
      organizationId: org1.id,
      restaurantId: restaurant3.id,
      createdBy: owner1.id
    }
  })

  const manager4 = await prisma.user.create({
    data: {
      id: createId(),
      login: 'manager@premium.dining',
      passwordHash: managerHash,
      name: 'Смирнов Андрей Викторович',
      phone: '+7 (999) 666-66-66',
      role: Role.MANAGER,
      organizationId: org2.id,
      restaurantId: restaurant4.id,
      createdBy: owner2.id
    }
  })

  console.log(`✅ Создано 4 менеджера`)

  // Создаем тестовую статистику за последние 7 дней
  const today = new Date()
  const metricTypes = [
    'revenue',
    'orders_count',
    'average_check',
    'feedback_positive',
    'feedback_negative',
    'nps_score'
  ]

  const restaurants = [restaurant1, restaurant2, restaurant3, restaurant4]

  for (const restaurant of restaurants) {
    for (let i = 0; i < 7; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)

      for (const metricName of metricTypes) {
        let value = 0

        switch (metricName) {
          case 'revenue':
            value = Math.floor(Math.random() * 50000) + 30000 // 30k-80k
            break
          case 'orders_count':
            value = Math.floor(Math.random() * 100) + 50 // 50-150
            break
          case 'average_check':
            value = Math.floor(Math.random() * 1000) + 500 // 500-1500
            break
          case 'feedback_positive':
            value = Math.floor(Math.random() * 40) + 20 // 20-60
            break
          case 'feedback_negative':
            value = Math.floor(Math.random() * 10) + 2 // 2-12
            break
          case 'nps_score':
            value = Math.floor(Math.random() * 30) + 40 // 40-70
            break
        }

        await prisma.restaurantStat.create({
          data: {
            id: createId(),
            restaurantId: restaurant.id,
            date: date,
            metricName: metricName,
            value: value
          }
        })
      }
    }
  }

  console.log(`✅ Создана статистика за последние 7 дней для всех ресторанов`)

  console.log('\n🎉 Seeding завершен успешно!\n')
  console.log('📊 Создано:')
  console.log(`   - 2 организации`)
  console.log(`   - 2 биллинга`)
  console.log(`   - 6 пользователей (1 admin, 2 owner, 4 manager)`)
  console.log(`   - 4 ресторана`)
  console.log(`   - ${7 * 6 * 4} записей статистики`)
  console.log('\n👤 Тестовые аккаунты:')
  console.log('   SUPER_ADMIN: admin@resto.worker / admin123')
  console.log('   OWNER #1: owner@vkusno.ru / owner123')
  console.log('   OWNER #2: owner@premium.dining / owner123')
  console.log('   MANAGER: manager.center@vkusno.ru / manager123')
}

main()
  .catch((e) => {
    console.error('❌ Ошибка при seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
