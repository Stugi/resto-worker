// Роли пользователей в системе
export const UserRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  OWNER: 'OWNER',
  MANAGER: 'MANAGER'
} as const

export type UserRoleType = typeof UserRole[keyof typeof UserRole]

// Проверки ролей
export const isAdmin = (role: string): boolean => {
  return role === UserRole.SUPER_ADMIN
}

export const isOwner = (role: string): boolean => {
  return role === UserRole.OWNER
}

export const isManager = (role: string): boolean => {
  return role === UserRole.MANAGER
}

export const canManageOrganization = (role: string): boolean => {
  return role === UserRole.SUPER_ADMIN || role === UserRole.OWNER
}

export const canManageRestaurants = (role: string): boolean => {
  return role === UserRole.SUPER_ADMIN || role === UserRole.OWNER
}

export const canManageUsers = (role: string): boolean => {
  return role === UserRole.SUPER_ADMIN || role === UserRole.OWNER
}

// Названия ролей для UI
export const RoleLabels: Record<UserRoleType, string> = {
  [UserRole.SUPER_ADMIN]: 'Супер Админ',
  [UserRole.OWNER]: 'Владелец',
  [UserRole.MANAGER]: 'Менеджер'
}
