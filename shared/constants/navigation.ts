import { UserRole, type UserRoleType } from './roles'

export type NavSection = 'main' | 'analytics' | 'settings'

export interface NavItem {
  path: string
  label: string
  section: NavSection
  roles: UserRoleType[]
}

/**
 * Единый конфиг навигации.
 * Чтобы добавить страницу — просто добавь строку сюда.
 * Sidebar и редирект с "/" читают этот массив.
 */
export const navigationItems: NavItem[] = [
  // --- Основное ---
  { path: '/organizations', label: 'Организации', section: 'main', roles: [UserRole.SUPER_ADMIN] },
  { path: '/restaurants', label: 'Рестораны', section: 'main', roles: [UserRole.SUPER_ADMIN, UserRole.OWNER] },
  { path: '/users', label: 'Пользователи', section: 'main', roles: [UserRole.SUPER_ADMIN, UserRole.OWNER] },

  // --- Отчёты ---
  { path: '/transcripts', label: 'Транскрипции', section: 'analytics', roles: [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER] },
  // { path: '/reports',     label: 'Отчёты',       section: 'analytics', roles: [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER] },
  // { path: '/analytics',   label: 'Аналитика',    section: 'analytics', roles: [UserRole.SUPER_ADMIN, UserRole.OWNER] },
  // { path: '/stats',       label: 'Статистика',   section: 'analytics', roles: [UserRole.SUPER_ADMIN, UserRole.MANAGER] },

  // --- Настройки ---
  { path: '/admin/tariffs', label: 'Тарифы', section: 'settings', roles: [UserRole.SUPER_ADMIN] },
  { path: '/admin/prompts', label: 'Промпты', section: 'settings', roles: [UserRole.SUPER_ADMIN] },
  { path: '/admin/leads', label: 'Лиды', section: 'settings', roles: [UserRole.SUPER_ADMIN] },
]

/** Названия секций для UI */
export const sectionLabels: Record<NavSection, string> = {
  main: 'Основное',
  analytics: 'Отчёты',
  settings: 'Настройки',
}

/** Фильтрация навигации по роли */
export function getNavigationForRole(role: string): NavItem[] {
  return navigationItems.filter(item => item.roles.includes(role as UserRoleType))
}

/** Навигация по секциям для роли */
export function getNavigationSections(role: string) {
  const items = getNavigationForRole(role)
  const sections: { key: NavSection; label: string; items: NavItem[] }[] = []

  for (const sectionKey of ['main', 'analytics', 'settings'] as NavSection[]) {
    const sectionItems = items.filter(i => i.section === sectionKey)
    if (sectionItems.length > 0) {
      sections.push({
        key: sectionKey,
        label: sectionLabels[sectionKey],
        items: sectionItems,
      })
    }
  }

  return sections
}

/** Первая доступная страница для роли (для редиректа с /) */
export function getDefaultRoute(role: string): string {
  const items = getNavigationForRole(role)
  return items[0]?.path || '/transcripts'
}
