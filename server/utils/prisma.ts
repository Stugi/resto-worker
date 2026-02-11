import { PrismaClient } from '@prisma/client'
import { createId } from '@paralleldrive/cuid2'

const globalForPrisma = globalThis as unknown as { prisma: any }

// Создаем базовый клиент
const baseClient = globalForPrisma.prisma || new PrismaClient()

// Расширяем его для автоматической генерации CUID2
export const prisma = baseClient.$extends({
    query: {
        $allModels: {
            async create({ args, query }) {
                // Генерируем ID только если он не передан (например, для миграций или ручного ввода)
                if (!args.data.id) {
                    args.data.id = createId()
                }
                return query(args)
            },
            async createMany({ args, query }) {
                if (Array.isArray(args.data)) {
                    args.data = args.data.map(item => ({
                        ...item,
                        id: item.id || createId()
                    }))
                }
                return query(args)
            }
        }
    }
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = baseClient