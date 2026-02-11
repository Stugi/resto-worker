# RESTO Worker 🍽️

Restaurant Management System - система управления ресторанами с аналитикой и биллингом.

## Технологии

- **Frontend**: Nuxt 4, Vue 3, Tailwind CSS, shadcn-vue
- **Backend**: Nuxt Server API, Prisma ORM
- **Database**: PostgreSQL (Neon)
- **Auth**: Session-based authentication

## Быстрый старт

### 1. Установка зависимостей

```bash
yarn install
```

### 2. Настройка базы данных (Neon)

1. Перейдите на [neon.tech](https://neon.tech) и создайте аккаунт
2. Создайте новый проект:
   - **Name**: `resto-worker-dev`
   - **Region**: Europe (Frankfurt/Amsterdam) или ближайший
   - **Postgres version**: 16
3. Скопируйте **Connection String** из Neon Console
4. Создайте `.env` файл (на основе `.env.example`):

```bash
cp .env.example .env
```

5. Вставьте ваш connection string в `.env`:

```env
DATABASE_URL="postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require"
```

### 3. Запуск миграций

```bash
# Применить миграции к базе данных
yarn prisma migrate dev --name init

# Сгенерировать Prisma Client
yarn prisma generate
```

### 4. Запуск dev сервера

```bash
yarn dev
```

Приложение будет доступно на `http://localhost:3000`

## Структура проекта

```
/app
  /components    # Vue компоненты
  /pages         # Страницы приложения
  /layouts       # Layouts
  /composables   # Composables
  /stores        # Pinia stores

/server
  /api           # API endpoints
  /middleware    # Server middleware
  /utils         # Server utilities

/prisma
  schema.prisma  # Database schema
```

## Доступные команды

```bash
# Development
yarn dev          # Запуск dev сервера
yarn build        # Build для production
yarn preview      # Preview production build

# Database
yarn prisma migrate dev    # Создать и применить миграцию
yarn prisma generate       # Сгенерировать Prisma Client
yarn prisma studio         # Открыть Prisma Studio (UI для БД)
yarn prisma db push        # Синхронизировать schema с БД (для dev)

# Prisma Studio (Database GUI)
yarn prisma studio
```

## База данных

Проект использует PostgreSQL через [Neon](https://neon.tech) - serverless PostgreSQL с:
- ✅ Бесплатный tier для разработки
- ✅ Автоматические бэкапы
- ✅ Branching для тестирования
- ✅ Instant provisioning

### Альтернатива: Локальный PostgreSQL

Если хотите использовать локальную БД:

```bash
# macOS (через Homebrew)
brew install postgresql@16
brew services start postgresql@16

# Создать базу данных
createdb resto_worker

# Обновить .env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/resto_worker?schema=public"
```

## Роли пользователей (RBAC)

- **SUPER_ADMIN** - полный доступ ко всей системе
- **OWNER** - владелец организации, управление своими ресторанами
- **MANAGER** - менеджер конкретного ресторана

## План разработки

Подробный план реализации находится в [.cloude/plan.md](./.cloude/plan.md)

## Дополнительная информация

- [Nuxt Documentation](https://nuxt.com/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Neon Documentation](https://neon.tech/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
