import { createId } from '@paralleldrive/cuid2'
import { getUserFromSession } from '../../utils/auth'
import { UserRole } from '../../../../../shared/constants/roles'

export default defineEventHandler(async (event) => {
  // Получаем текущего пользователя
  const user = await getUserFromSession(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Не авторизован'
    })
  }

  // Только OWNER и SUPER_ADMIN могут создавать рестораны
  if (![UserRole.OWNER, UserRole.SUPER_ADMIN].includes(user.role)) {
    throw createError({
      statusCode: 403,
      message: 'Недостаточно прав'
    })
  }

  const body = await readBody(event)

  // Валидация
  if (!body.name?.trim()) {
    throw createError({
      statusCode: 400,
      message: 'Название ресторана обязательно'
    })
  }

  // Для SUPER_ADMIN требуется указать organizationId
  if (user.role === UserRole.SUPER_ADMIN && !body.organizationId) {
    throw createError({
      statusCode: 400,
      message: 'Для супер-админа необходимо указать organizationId'
    })
  }

  const organizationId = user.role === UserRole.SUPER_ADMIN
    ? body.organizationId
    : user.organizationId!

  // Создаем ресторан
  const restaurant = await prisma.restaurant.create({
    data: {
      id: createId(),
      name: body.name.trim(),
      organizationId,
      settingsComment: body.settingsComment?.trim() || null,
      createdBy: user.id
    },
    include: {
      organization: {
        select: {
          id: true,
          name: true
        }
      }
    }
  })

  return restaurant
})
