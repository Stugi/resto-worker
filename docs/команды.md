# Шпаргалка команд RESTO Worker

## 🚀 Основные команды

```bash
# Установка зависимостей
yarn install

# Запуск dev сервера
yarn dev

# Build для production
yarn build

# Preview production build
yarn preview
```

## 🗄️ Prisma / Database

```bash
# Применить миграции
yarn prisma migrate dev

# Сгенерировать Prisma Client
yarn prisma generate

# Открыть Prisma Studio (GUI для БД)
yarn prisma studio

# Заполнить БД тестовыми данными
yarn db:seed

# Синхронизировать schema с БД (для dev, без миграций)
yarn prisma db push

# Сбросить БД (удалит все данные!)
yarn prisma migrate reset

# Создать новую миграцию
yarn prisma migrate dev --name <название>

# Применить миграции в production
yarn prisma migrate deploy
```

## 📦 Полезные команды

```bash
# Обновить зависимости
yarn upgrade-interactive

# Проверить типы TypeScript
yarn nuxt typecheck

# Очистить кеш Nuxt
rm -rf .nuxt .output

# Пересобрать Prisma Client
yarn prisma generate
```

## 🧪 Тестовые аккаунты (после yarn db:seed)

| Роль | Email | Пароль |
|------|-------|--------|
| SUPER_ADMIN | admin@resto.worker | admin123 |
| OWNER (Сеть "Вкусно") | owner@vkusno.ru | owner123 |
| OWNER (Premium Dining) | owner@premium.dining | owner123 |
| MANAGER (Вкусно - Центр) | manager.center@vkusno.ru | manager123 |
| MANAGER (Вкусно - Север) | manager.north@vkusno.ru | manager123 |
| MANAGER (Вкусно - Юг) | manager.south@vkusno.ru | manager123 |
| MANAGER (Premium) | manager@premium.dining | manager123 |

## 🌐 Полезные ссылки

- **Local dev server**: http://localhost:3000
- **Prisma Studio**: http://localhost:5555 (после `yarn prisma studio`)
- **Neon Console**: https://console.neon.tech

## 📝 Workflow разработки

### 1. Первоначальная настройка

```bash
# 1. Клонировать репозиторий
git clone <repo-url>
cd resto-worker

# 2. Установить зависимости
yarn install

# 3. Настроить .env (см. .env.example)
cp .env.example .env
# Добавить connection string из Neon

# 4. Применить миграции
yarn prisma migrate dev

# 5. Заполнить тестовыми данными
yarn db:seed

# 6. Запустить dev сервер
yarn dev
```

### 2. Изменение schema.prisma

```bash
# 1. Изменить prisma/schema.prisma
# 2. Создать миграцию
yarn prisma migrate dev --name <описание_изменений>

# 3. Prisma Client обновится автоматически
```

### 3. Работа с Neon Branches

```bash
# 1. Создать branch в Neon Console (например, "test")
# 2. Скопировать connection string для branch
# 3. Обновить DATABASE_URL в .env
# 4. Применить миграции
yarn prisma migrate dev
# 5. При необходимости заполнить тестовыми данными
yarn db:seed
```

### 4. Сброс БД к начальному состоянию

```bash
# Удалит все данные и применит миграции заново
yarn prisma migrate reset

# Заполнить тестовыми данными
yarn db:seed
```

## 🐛 Troubleshooting

### Ошибка "Prisma Client не найден"

```bash
yarn prisma generate
```

### Ошибка "Environment variables loaded from .env"

Убедитесь, что `.env` файл существует и содержит `DATABASE_URL`

### База данных "out of sync"

```bash
# Для dev окружения
yarn prisma db push

# Или создайте миграцию
yarn prisma migrate dev
```

### Prisma Studio не открывается

```bash
# Проверьте, что процесс не запущен
pkill -f "prisma studio"

# Запустите заново
yarn prisma studio
```

### "Connection timed out" с Neon

1. Проверьте connection string в `.env`
2. Убедитесь, что проект Neon активен (не suspended)
3. Проверьте интернет-соединение
