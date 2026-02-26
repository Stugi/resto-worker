import { UserRole, type UserRoleType } from './roles'

export type NavSection = 'main' | 'analytics' | 'settings'

export interface NavItem {
  path: string
  label: string
  section: NavSection
  roles: UserRoleType[]
  icon?: string
  priority?: number
}

/**
 * Единый конфиг навигации.
 * Чтобы добавить страницу — просто добавь строку сюда.
 * Sidebar и редирект с "/" читают этот массив.
 *
 * icon — идентификатор иконки для bottom nav (Heroicons outline)
 * priority — порядок в bottom nav (меньше = важнее, показывается первым)
 */
export const navigationItems: NavItem[] = [
  // --- Основное ---
  { path: '/', label: 'Аналитика', section: 'main', roles: [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER], icon: 'chart', priority: 0 },
  { path: '/organizations', label: 'Организации', section: 'main', roles: [UserRole.SUPER_ADMIN], icon: 'building', priority: 5 },
  { path: '/restaurants', label: 'Рестораны', section: 'main', roles: [UserRole.SUPER_ADMIN, UserRole.OWNER], icon: 'store', priority: 3 },
  { path: '/users', label: 'Пользователи', section: 'main', roles: [UserRole.SUPER_ADMIN, UserRole.OWNER], icon: 'users', priority: 4 },

  // --- Отчёты ---
  { path: '/transcripts', label: 'Транскрипции', section: 'analytics', roles: [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER], icon: 'microphone', priority: 1 },
  { path: '/reports', label: 'Отчёты', section: 'analytics', roles: [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER], icon: 'document', priority: 2 },
  { path: '/analytics', label: 'Обзор', section: 'analytics', roles: [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER], icon: 'home', priority: 2.5 },
  // { path: '/stats',       label: 'Статистика',   section: 'analytics', roles: [UserRole.SUPER_ADMIN, UserRole.MANAGER] },

  // --- Настройки ---
  { path: '/admin/tariffs', label: 'Тарифы', section: 'settings', roles: [UserRole.SUPER_ADMIN], icon: 'tag', priority: 6 },
  { path: '/admin/prompts', label: 'Промпты', section: 'settings', roles: [UserRole.SUPER_ADMIN], icon: 'chat', priority: 7 },
  { path: '/admin/leads', label: 'Лиды', section: 'settings', roles: [UserRole.SUPER_ADMIN], icon: 'target', priority: 8 },
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

/** Пункты для мобильного bottom nav: tabs (видимые) + overflow (в "Ещё") */
export function getBottomNavItems(role: string, maxTabs: number = 4) {
  const items = getNavigationForRole(role)
    .sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99))

  if (items.length <= maxTabs) {
    return { tabs: items, overflow: [] as NavItem[] }
  }

  return {
    tabs: items.slice(0, maxTabs),
    overflow: items.slice(maxTabs),
  }
}
