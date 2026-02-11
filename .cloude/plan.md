# План реализации RESTO Worker (Restaurant Management System)

## Анализ текущей архитектуры

### База данных (Prisma Schema)
Текущая схема включает:
- **User** - пользователи с поддержкой Telegram и обычной авторизации
  - Поля: id, telegramId, login, password, name, phone, role
  - Связь с Organization и Restaurant
  - Аудит полей: createdAt, createdBy, updatedAt, updatedBy, deletedAt, deletedBy

- **Organization** - организации (владельцы сетей ресторанов)
  - Связь с Billing, Users, Restaurants
  - Поддержка мягкого удаления

- **Billing** - биллинг с пробным периодом
  - Статусы: TRIAL, ACTIVE, DISABLED
  - Привязан к Organization (1:1)

- **Restaurant** - рестораны
  - Привязка к Organization
  - Поле settingsComment для хранения настроек
  - Связь со статистикой и пользователями

- **RestaurantStat** - метрики ресторанов
  - Хранение метрик по датам
  - Поддержка различных типов метрик (metricName)

### Роли (RBAC)
- **SUPER_ADMIN** - полный доступ ко всей системе
- **OWNER** - владелец организации, управление своими ресторанами
- **MANAGER** - менеджер конкретного ресторана

### Текущий стек
- Nuxt 4.3.1 (Vue 3.5.28)
- Prisma 7.4.0 + PostgreSQL
- CUID2 для автогенерации ID
- Vue Router 4.6.4

### Дизайн (из прототипа main_prototype_v4.html)
- Минималистичный дизайн в стиле Apple
- Светлая/темная тема
- Компоненты: Header, Sidebar, Cards, Tables, Stats
- Разделы: Dashboard, Restaurants, Feedback, Settings
- Название проекта: RESTO Worker

---

## Этапы реализации

### Этап 1: Настройка базовой инфраструктуры ⚙️

#### 1.1 Окружение и конфигурация
- [ ] Создать `.env` с переменными:
  - DATABASE_URL
  - SESSION_SECRET
  - TELEGRAM_BOT_TOKEN (для будущего)
  - NODE_ENV
- [ ] Настроить PostgreSQL базу данных (локально и/или cloud)
- [ ] Выполнить `prisma migrate dev --name init`
- [ ] Создать seed.ts для тестовых данных разработки

#### 1.2 Конфигурация Nuxt
```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
    '@vueuse/nuxt'
  ],
  runtimeConfig: {
    sessionSecret: process.env.SESSION_SECRET,
    public: {
      apiBase: '/api'
    }
  },
  typescript: {
    strict: true,
    typeCheck: true
  }
})
```

#### 1.3 Установка зависимостей
```bash
# UI и утилиты
yarn add @vueuse/core @vueuse/nuxt
yarn add @headlessui/vue
yarn add date-fns
yarn add zod

# Auth
yarn add bcrypt h3-session

# Dev
yarn add -D @nuxtjs/tailwindcss
yarn add -D prisma
yarn add -D @types/bcrypt
```

#### 1.4 Структура проекта
```
/server
  /api
    /auth
      register.post.ts
      login.post.ts
      logout.post.ts
      me.get.ts
    /users
      index.get.ts
      [id].get.ts
      [id].patch.ts
      [id].delete.ts
    /organizations
      index.get.ts
      index.post.ts
      [id].get.ts
      [id].patch.ts
      [id].delete.ts
    /restaurants
      index.get.ts
      index.post.ts
      [id].get.ts
      [id].patch.ts
      [id].delete.ts
      [id]/stats.get.ts
    /stats
      restaurants/[id].get.ts
  /middleware
    auth.ts
    rbac.ts
  /utils
    prisma.ts ✓ (уже создан)
    auth.ts
    permissions.ts
    validation.ts

/app
  /pages
    index.vue (dashboard)
    /auth
      login.vue
      register.vue
    /restaurants
      index.vue
      [id].vue
      [id]/settings.vue
    /feedback
      index.vue
    /users
      index.vue
    /settings
      index.vue
      billing.vue
  /components
    /ui
      Button.vue
      Input.vue
      Card.vue
      Table.vue
      Badge.vue
      Select.vue
      Modal.vue
    /layout
      Header.vue
      Sidebar.vue
      NavItem.vue
    /dashboard
      StatCard.vue
      StatsGrid.vue
    /restaurants
      RestaurantCard.vue
      RestaurantForm.vue
      RestaurantTable.vue
  /composables
    useAuth.ts
    usePermissions.ts
    useToast.ts
  /stores
    auth.ts
    restaurants.ts
  /layouts
    default.vue
    auth.vue
```

---

### Этап 2: Система авторизации 🔐

#### 2.1 Backend - Password Authentication

**server/utils/auth.ts**
```typescript
import bcrypt from 'bcrypt'
import { prisma } from './prisma'

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash)
}

export async function createSession(userId: string) {
  // Session management logic
}
```

**API Endpoints:**
- [ ] `POST /api/auth/register` - регистрация нового пользователя
  - Валидация: email, password (min 8 символов), name
  - Хеширование пароля
  - Создание Organization для OWNER
  - Возврат JWT/session token

- [ ] `POST /api/auth/login` - авторизация
  - Проверка credentials
  - Создание сессии
  - Возврат user + token

- [ ] `POST /api/auth/logout` - выход
  - Удаление сессии

- [ ] `GET /api/auth/me` - текущий пользователь
  - Получение из сессии
  - Include organization и restaurant

#### 2.2 Middleware
- [ ] **server/middleware/auth.ts** - проверка авторизации
  - Проверка сессии/токена
  - Добавление user в event.context
  - Редирект на /auth/login если не авторизован

- [ ] **server/middleware/rbac.ts** - проверка прав доступа
  - `requireRole(['SUPER_ADMIN', 'OWNER'])`
  - `requireOrganization(organizationId)`
  - `requireRestaurant(restaurantId)`

#### 2.3 Frontend авторизации
- [ ] **pages/auth/login.vue** - страница входа
  - Форма: login + password
  - Кнопка "Login with Telegram" (для будущего)
  - Ссылка на регистрацию
  - Дизайн из прототипа

- [ ] **pages/auth/register.vue** - регистрация
  - Форма: name, email/login, password, confirmPassword
  - Выбор роли (OWNER/MANAGER)
  - Автосоздание Organization для OWNER

- [ ] **composables/useAuth.ts**
```typescript
export const useAuth = () => {
  const user = ref(null)
  const isAuthenticated = computed(() => !!user.value)

  async function login(credentials) { }
  async function logout() { }
  async function register(data) { }
  async function fetchUser() { }

  return { user, isAuthenticated, login, logout, register }
}
```

- [ ] **stores/auth.ts** - Pinia store
  - Состояние: user, loading, error
  - Actions: login, logout, register, fetchUser
  - Persist в localStorage

#### 2.4 Route Guards
- [ ] **middleware/auth.global.ts** - глобальная защита роутов
  - Публичные роуты: /auth/*
  - Приватные роуты: все остальные
  - Редирект на /auth/login

---

### Этап 3: RBAC система 👥

#### 3.1 Permissions утилита
**server/utils/permissions.ts**
```typescript
type Permission = {
  resource: string
  action: 'create' | 'read' | 'update' | 'delete'
}

const PERMISSIONS = {
  SUPER_ADMIN: ['*'], // все права
  OWNER: [
    'organizations:read',
    'organizations:update',
    'restaurants:*',
    'users:*',
    'stats:read'
  ],
  MANAGER: [
    'restaurants:read',
    'stats:read'
  ]
}

export function hasPermission(user, permission: Permission) {
  // логика проверки
}
```

#### 3.2 Composable для проверки прав
**composables/usePermissions.ts**
```typescript
export const usePermissions = () => {
  const { user } = useAuth()

  const can = (resource: string, action: string) => {
    // проверка прав на клиенте
  }

  const canManageOrganization = (orgId: string) => {
    return user.value?.organizationId === orgId || user.value?.role === 'SUPER_ADMIN'
  }

  return { can, canManageOrganization }
}
```

#### 3.3 Директива v-can
- [ ] Создать директиву для условного рендера
```vue
<button v-can="['restaurants', 'create']">Add Restaurant</button>
```

---

### Этап 4: Управление организациями 🏢

#### 4.1 API для Organizations
- [ ] `GET /api/organizations` - список (SUPER_ADMIN или своя)
  - Фильтр по статусу биллинга
  - Pagination
  - Include restaurants count

- [ ] `GET /api/organizations/:id` - детали организации
  - Include billing, restaurants, users
  - Проверка доступа (RBAC)

- [ ] `POST /api/organizations` - создание (SUPER_ADMIN)
  - Автосоздание Billing записи
  - Валидация уникальности имени

- [ ] `PATCH /api/organizations/:id` - обновление
  - Только name, можно другие поля
  - Проверка прав (OWNER своей org или SUPER_ADMIN)

- [ ] `DELETE /api/organizations/:id` - мягкое удаление
  - Установка deletedAt, deletedBy
  - Cascade delete для связанных сущностей

#### 4.2 Frontend для Organizations
- [ ] **pages/organizations/index.vue** (только для SUPER_ADMIN)
  - Список всех организаций
  - Фильтры по статусу
  - Таблица с колонками: Name, Restaurants Count, Billing Status, Actions

- [ ] **components/organizations/OrganizationCard.vue**
  - Карточка организации
  - Отображение биллинга

---

### Этап 5: Управление пользователями 👤

#### 5.1 API для Users
- [ ] `GET /api/users` - список пользователей
  - SUPER_ADMIN: все пользователи
  - OWNER: пользователи своей организации
  - MANAGER: только себя
  - Фильтры: по роли, организации, ресторану

- [ ] `GET /api/users/:id` - профиль
  - Include organization, restaurant

- [ ] `POST /api/users` - создание
  - OWNER может создавать MANAGER для своих ресторанов
  - Отправка invite email (опционально)

- [ ] `PATCH /api/users/:id` - обновление
  - Нельзя менять свою роль
  - OWNER может менять роли в своей org

- [ ] `DELETE /api/users/:id` - мягкое удаление

#### 5.2 Frontend для Users
- [ ] **pages/users/index.vue**
  - Таблица пользователей
  - Фильтры по роли
  - Actions: Edit, Delete

- [ ] **components/users/UserForm.vue**
  - Форма создания/редактирования
  - Поля: name, email, phone, role, organization, restaurant

---

### Этап 6: Управление ресторанами 🍴

#### 6.1 API для Restaurants
- [ ] `GET /api/restaurants` - список ресторанов
  - SUPER_ADMIN: все
  - OWNER: своей организации
  - MANAGER: только свой ресторан
  - Фильтр по организации
  - Include: users count, latest stats

- [ ] `GET /api/restaurants/:id` - детали
  - Include: organization, users, stats summary

- [ ] `POST /api/restaurants` - создание
  - OWNER создает в своей организации
  - Валидация: name, address (если добавим)

- [ ] `PATCH /api/restaurants/:id` - обновление
  - name, settingsComment, и т.д.

- [ ] `PATCH /api/restaurants/:id/settings` - настройки
  - Обновление settingsComment (JSON строка)

- [ ] `DELETE /api/restaurants/:id` - мягкое удаление

#### 6.2 Frontend для Restaurants
- [ ] **pages/restaurants/index.vue** - список ресторанов
  - Дизайн из прототипа (таблица)
  - Фильтр по организации (для SUPER_ADMIN и OWNER с несколькими org)
  - Кнопка "Add Restaurant"
  - Колонки: Name, Address, Manager, Status, Actions

- [ ] **pages/restaurants/[id].vue** - детали ресторана
  - Информация о ресторане
  - Список сотрудников
  - Краткая статистика
  - Кнопки: Edit, Settings

- [ ] **pages/restaurants/[id]/settings.vue** - настройки
  - Дизайн из прототипа Settings Section
  - Общие настройки: название, адрес
  - settingsComment - JSON редактор или форма
  - Сохранение

- [ ] **components/restaurants/RestaurantCard.vue**
  - Карточка ресторана для списка

- [ ] **components/restaurants/RestaurantForm.vue**
  - Форма создания/редактирования
  - Modal или отдельная страница

- [ ] **components/restaurants/RestaurantTable.vue**
  - Переиспользуемая таблица
  - Sorting, pagination

---

### Этап 7: Система статистики 📊

#### 7.1 Определение типов метрик
```typescript
enum MetricName {
  REVENUE = 'revenue',           // выручка
  ORDERS_COUNT = 'orders_count', // количество заказов
  AVERAGE_CHECK = 'average_check', // средний чек
  FEEDBACK_POSITIVE = 'feedback_positive', // положительные отзывы
  FEEDBACK_NEGATIVE = 'feedback_negative', // отрицательные
  NPS_SCORE = 'nps_score',       // NPS
}
```

#### 7.2 API для Statistics
- [ ] `GET /api/stats/restaurants/:id` - статистика ресторана
  - Query params: dateFrom, dateTo, metricNames[]
  - Группировка по дням/неделям/месяцам
  - Агрегация: sum, avg, min, max

- [ ] `POST /api/stats/restaurants/:id` - добавить метрику
  - Валидация: date, metricName, value
  - Автозаполнение createdAt

- [ ] `GET /api/stats/organizations/:id` - агрегированная по всем ресторанам
  - Сумма метрик по ресторанам организации

- [ ] `GET /api/stats/summary` - дашборд статистика
  - В зависимости от роли:
    - SUPER_ADMIN: вся система
    - OWNER: своя организация
    - MANAGER: свой ресторан

#### 7.3 Frontend для Statistics
- [ ] **pages/index.vue** - главный Dashboard
  - Дизайн из прототипа Dashboard Section
  - StatCard компоненты (4 карточки):
    - Total Revenue
    - Total Orders
    - Average Check
    - Active Restaurants
  - Графики (chart library)
  - Фильтр по датам

- [ ] **pages/feedback/index.vue** - Feedback Statistics
  - Дизайн из прототипа Feedback Section
  - 4 stat cards: Total Feedback, Positive, Negative, NPS Score
  - Таблица Feedback by Category
  - Графики распределения

- [ ] **components/dashboard/StatCard.vue**
  - Карточка метрики
  - Label, value, change percentage
  - Стрелка вверх/вниз

- [ ] **components/dashboard/StatsChart.vue**
  - Обертка для графиков
  - Поддержка типов: line, bar, pie
  - Библиотека: **ApexCharts** или **Chart.js**

- [ ] **components/ui/DateRangePicker.vue**
  - Выбор периода (today, last 7 days, last 30 days, custom)

#### 7.4 Charts библиотека
```bash
yarn add apexcharts vue3-apexcharts
```

---

### Этап 8: Биллинг система 💳

#### 8.1 Расширение схемы Billing (если нужно)
Текущая схема уже включает:
- status: TRIAL, ACTIVE, DISABLED
- trialStartsAt

Возможно добавить:
- trialEndsAt (вычисляется как trialStartsAt + 14 дней)
- subscriptionEndsAt (для ACTIVE)
- paymentMethod (опционально)

#### 8.2 API для Billing
- [ ] `GET /api/billing/organization/:id` - биллинг организации
  - Проверка доступа (только OWNER своей org или SUPER_ADMIN)

- [ ] `PATCH /api/billing/organization/:id/status` - изменить статус
  - SUPER_ADMIN может менять любые статусы
  - Webhook от платежной системы (будущее)

- [ ] Cron job для проверки истечения триала
  - Запуск раз в день
  - Если `trialEndsAt < now()` и `status === TRIAL`, поменять на DISABLED

#### 8.3 Frontend для Billing
- [ ] **pages/settings/billing.vue** - страница биллинга
  - Отображение текущего плана
  - Дата окончания триала
  - Кнопка "Upgrade to Active" (пока заглушка)
  - История платежей (будущее)

- [ ] **components/billing/BillingStatus.vue**
  - Badge со статусом
  - Countdown до окончания триала

- [ ] **components/billing/TrialBanner.vue**
  - Предупреждение о скором окончании триала
  - Показывать за 3 дня до окончания

#### 8.4 Middleware для блокировки
- [ ] **server/middleware/billing.ts**
  - Проверка статуса биллинга
  - Если DISABLED, блокировать API (кроме GET /api/auth/me)
  - Возврат 402 Payment Required

---

### Этап 9: UI компоненты и Layout 🎨

#### 9.1 Tailwind конфигурация
```javascript
// tailwind.config.js
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        'bg-secondary': 'var(--bg-secondary)',
        text: 'var(--text)',
        'text-secondary': 'var(--text-secondary)',
        border: 'var(--border)',
        action: 'var(--action)',
        'action-hover': 'var(--action-hover)',
        success: 'var(--success)',
        danger: 'var(--danger)'
      }
    }
  }
}
```

#### 9.2 CSS Variables (из прототипа)
```css
:root {
  --bg: #ffffff;
  --bg-secondary: #fafafa;
  --text: #000000;
  --text-secondary: #666666;
  --border: #e0e0e0;
  --action: #2a2a2a;
  --action-hover: #1a1a1a;
  --success: #16a34a;
  --danger: #dc2626;
}

[data-theme="dark"] {
  --bg: #000000;
  --bg-secondary: #0a0a0a;
  --text: #ffffff;
  --text-secondary: #999999;
  --border: #2a2a2a;
  --action: #e5e5e5;
  --action-hover: #ffffff;
}
```

#### 9.3 Layout компоненты
- [ ] **components/layout/Header.vue**
  - Логотип "RESTO Worker"
  - Theme toggle (светлая/темная)
  - User menu (avatar, dropdown)
  - Дизайн из прототипа

- [ ] **components/layout/Sidebar.vue**
  - Навигация по секциям:
    - Dashboard
    - Restaurants
    - Feedback (Stats)
    - Users (если OWNER/SUPER_ADMIN)
    - Settings
  - Active состояние
  - Nav sections с labels

- [ ] **components/layout/NavItem.vue**
  - Элемент навигации
  - Icon + label
  - Active/hover стили

- [ ] **layouts/default.vue**
  - Header + Sidebar + Main content
  - Grid layout как в прототипе

- [ ] **layouts/auth.vue**
  - Простой layout для страниц авторизации
  - Центрированная форма

#### 9.4 UI компоненты (базовые)
- [ ] **components/ui/Button.vue**
  - Варианты: primary, secondary, danger
  - Размеры: sm, md, lg
  - Loading состояние

- [ ] **components/ui/Input.vue**
  - Label, placeholder
  - Error states
  - Icons (опционально)

- [ ] **components/ui/Select.vue**
  - Custom select (Headless UI)
  - Стили из прототипа

- [ ] **components/ui/Card.vue**
  - Container с border и padding
  - card-header, card-body

- [ ] **components/ui/Table.vue**
  - Responsive таблица
  - Hover states
  - Sorting (опционально)

- [ ] **components/ui/Badge.vue**
  - Варианты: success, danger, warning, info
  - Для статусов

- [ ] **components/ui/Modal.vue**
  - Overlay + centered content
  - Headless UI Dialog

- [ ] **components/ui/Toast.vue**
  - Уведомления (success, error, info)
  - Auto-dismiss

#### 9.5 Theme Toggle
- [ ] **composables/useTheme.ts**
```typescript
export const useTheme = () => {
  const theme = useState('theme', () => 'light')

  const toggleTheme = () => {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
    document.documentElement.setAttribute('data-theme', theme.value)
    localStorage.setItem('theme', theme.value)
  }

  const initTheme = () => {
    const saved = localStorage.getItem('theme') || 'light'
    theme.value = saved
    document.documentElement.setAttribute('data-theme', saved)
  }

  return { theme, toggleTheme, initTheme }
}
```

---

### Этап 10: Дополнительный функционал ✨

#### 10.1 Поиск и фильтрация
- [ ] Глобальный поиск в Header (CMD+K)
  - Поиск по ресторанам, пользователям
  - Комманды (open settings, logout, etc.)

- [ ] Фильтры в таблицах
  - По организации
  - По статусу
  - По роли (для Users)

- [ ] Сортировка в таблицах
  - По колонкам
  - Asc/Desc

- [ ] Pagination
  - Компонент Pagination
  - API поддержка (limit, offset)

#### 10.2 Уведомления
- [ ] **composables/useToast.ts**
  - show(message, type)
  - Хранение в reactive массиве
  - Auto-dismiss после 3 сек

- [ ] **components/ui/ToastContainer.vue**
  - Контейнер для всех toast
  - Positioned fixed top-right

- [ ] Email уведомления (опционально)
  - При окончании триала
  - При создании пользователя (invite)

#### 10.3 Аудит и логи
- [ ] Middleware для заполнения createdBy, updatedBy
  - Получение userId из session
  - Автоматическое заполнение при create/update

- [ ] Логирование важных действий
  - server/utils/logger.ts
  - Winston или Pino
  - Логи: auth, create/update/delete операции

- [ ] История изменений (опционально)
  - Таблица AuditLog
  - Отслеживание всех изменений сущностей

#### 10.4 Экспорт данных
- [ ] Экспорт статистики в CSV
  - Кнопка "Export" на странице stats
  - Генерация CSV на backend

- [ ] Генерация PDF отчетов (будущее)
  - Библиотека: puppeteer или jsPDF

---

### Этап 11: Валидация и обработка ошибок 🛡️

#### 11.1 Zod схемы
```typescript
// server/utils/validation.ts
import { z } from 'zod'

export const loginSchema = z.object({
  login: z.string().min(3),
  password: z.string().min(8)
})

export const registerSchema = z.object({
  name: z.string().min(2),
  login: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['OWNER', 'MANAGER'])
})

export const restaurantSchema = z.object({
  name: z.string().min(2),
  organizationId: z.string().cuid2()
})
```

#### 11.2 Обработка ошибок на backend
- [ ] Централизованный error handler
- [ ] Кастомные error классы (UnauthorizedError, ForbiddenError, etc.)
- [ ] Валидация всех входных данных с Zod

#### 11.3 Обработка ошибок на frontend
- [ ] Перехват ошибок в $fetch
- [ ] Отображение ошибок в формах
- [ ] Глобальный error boundary

---

### Этап 12: Тестирование 🧪

#### 12.1 Backend тесты
- [ ] Unit тесты для utils (auth, permissions)
- [ ] Integration тесты для API endpoints
- [ ] Использование Vitest

#### 12.2 Frontend тесты
- [ ] Component тесты (@vue/test-utils + Vitest)
- [ ] E2E тесты (Playwright)
  - Сценарий: login -> create restaurant -> view stats

---

### Этап 13: Деплой и DevOps 🚀

#### 13.1 Docker
```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .
RUN yarn build

EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: resto_worker
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  app:
    build: .
    ports:
      - "3000:3000"
    depends_on:
      - db
    environment:
      DATABASE_URL: postgresql://admin:password@db:5432/resto_worker
```

#### 13.2 CI/CD
- [ ] GitHub Actions workflow
  - Run tests
  - Build Docker image
  - Deploy to staging/production

- [ ] Миграции в pipeline
  - `prisma migrate deploy` перед деплоем

#### 13.3 Мониторинг
- [ ] Логирование (Pino)
- [ ] Error tracking (Sentry integration)
- [ ] Performance monitoring (опционально)

---

## Приоритеты реализации

### Phase 1: MVP (2-3 недели)
**Цель**: Работающая система с базовым функционалом

1. **Неделя 1: Фундамент**
   - Этап 1: Инфраструктура и конфигурация
   - Этап 2: Система авторизации (login/password)
   - Этап 3: RBAC базовая реализация
   - Базовые UI компоненты

2. **Неделя 2: Core функционал**
   - Этап 4: Organizations (CRUD)
   - Этап 5: Users (CRUD)
   - Этап 6: Restaurants (CRUD)
   - Layout (Header + Sidebar)

3. **Неделя 3: Статистика и UI**
   - Этап 7: Статистика (API + базовые графики)
   - Этап 9: Доработка UI компонентов
   - Dashboard главная страница
   - Testing и bug fixes

### Phase 2: Продакшн готовность (1-2 недели)
4. **Неделя 4: Биллинг и доп. функционал**
   - Этап 8: Биллинг система
   - Этап 10: Поиск, фильтрация, pagination
   - Этап 11: Валидация и error handling
   - Аудит и логи

5. **Неделя 5: Полировка и деплой**
   - Тестирование (E2E)
   - Оптимизация производительности
   - Этап 13: Docker и CI/CD
   - Production deploy

### Phase 3: Расширенный функционал (будущее)
- Telegram авторизация
- Email уведомления
- Расширенная аналитика
- Экспорт отчетов
- Mobile адаптация
- PWA функционал

---

## Технические решения

### 1. Авторизация
**Выбор**: h3-session (session-based)
- ✅ Безопаснее для веб-приложений
- ✅ HTTP-only cookies
- ✅ Простая интеграция с Nuxt
- ✅ Легко инвалидировать сессии

**Альтернатива**: JWT (если нужна мобильная версия)

### 2. State Management
**Выбор**: Pinia
- ✅ Официальный для Vue 3
- ✅ TypeScript из коробки
- ✅ DevTools support
- ✅ Composition API compatible

### 3. UI Framework
**Выбор**: Tailwind CSS + Headless UI
- ✅ Полная кастомизация
- ✅ Малый размер бандла
- ✅ Уже используется дизайн из прототипа (CSS переменные)
- ✅ Dark mode встроенный

**Альтернативы**: Nuxt UI, PrimeVue (если нужны готовые компоненты)

### 4. Charts
**Выбор**: ApexCharts
- ✅ vue3-apexcharts обертка
- ✅ Множество типов графиков
- ✅ Responsive
- ✅ Хорошая документация

### 5. Валидация
**Выбор**: Zod
- ✅ TypeScript-first
- ✅ Клиент + сервер
- ✅ Отличная интеграция с формами
- ✅ Type inference

### 6. Date handling
**Выбор**: date-fns
- ✅ Tree-shakable
- ✅ Легковесная
- ✅ TypeScript support

---

## Оценка времени

**MVP (Phase 1)**: 15-20 рабочих дней (3-4 недели)
**Production Ready (Phase 2)**: +10-15 дней (2-3 недели)
**Итого**: 25-35 рабочих дней (5-7 недель)

---

## Риски и митигация

### Риск 1: Сложность RBAC
**Вероятность**: Средняя
**Митигация**:
- Использовать проверенные паттерны
- Тщательное тестирование
- Документирование прав доступа

### Риск 2: Производительность статистики
**Вероятность**: Высокая (при больших объемах)
**Митигация**:
- Индексы в БД (уже есть @@index)
- Кэширование агрегированных данных
- Pagination для больших выборок
- Денормализация при необходимости

### Риск 3: Безопасность
**Вероятность**: Критично
**Митигация**:
- HTTPS в production
- HTTP-only cookies
- CSRF защита
- Rate limiting на API
- Валидация всех входных данных
- Регулярные security аудиты

### Риск 4: Масштабируемость
**Вероятность**: Средняя
**Митигация**:
- Connection pooling для Prisma
- Stateless архитектура
- Горизонтальное масштабирование (multiple instances)
- CDN для статики

---

## Следующие шаги

### Немедленные действия:
1. ✅ Утвердить план реализации
2. ⏳ Создать `.env` и настроить БД
3. ⏳ Запустить первую миграцию Prisma
4. ⏳ Установить зависимости
5. ⏳ Настроить Tailwind CSS
6. ⏳ Начать с авторизации (login/register pages)

### Первая неделя (детально):
**День 1-2**:
- Настройка окружения
- Конфигурация Nuxt
- Prisma миграция + seed
- Tailwind setup

**День 3-4**:
- Auth API (register, login, logout, me)
- Auth middleware
- Password hashing

**День 5**:
- Login/Register pages
- useAuth composable
- Auth store

---

## Решения по инфраструктуре

1. ✅ **База данных**: Neon PostgreSQL (serverless, бесплатный tier)
   - Инструкция: `docs/NEON_SETUP.md`
   - Branching для тестирования
   - Автоматические бэкапы

2. **Деплой**: Где планируется хостинг (Vercel, Railway, VPS)?
3. **Telegram авторизация**: Приоритет на MVP или Phase 3?
4. **Email**: Нужна ли отправка email (Resend, SendGrid)?
5. **Analytics**: Требуется интеграция с внешними сервисами (Google Analytics, Mixpanel)?
6. **Платежи**: Какая платежная система для биллинга (Stripe, Paddle, Robokassa)?

---

## Дополнительные улучшения (backlog)

- [ ] Audit trail (таблица для всех изменений)
- [ ] Webhook система для интеграций
- [ ] API для мобильных приложений
- [ ] Real-time уведомления (WebSockets/SSE)
- [ ] Multi-language support (i18n)
- [ ] Advanced фильтры и сохраненные views
- [ ] Bulk operations (массовое удаление, обновление)
- [ ] Import/Export данных (CSV, Excel)
- [ ] Scheduled reports (email отчеты раз в неделю)
- [ ] Custom dashboards (конструктор дашбордов)
