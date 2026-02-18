# План запуска RestoWorker - Обновленные приоритеты

## Контекст

Обновленные приоритеты перед запуском. Дедлайн: четверг - код, пятница - тесты, понедельник - запуск.

---

## Приоритет 0: Фикс сборки Vercel (БЛОКЕР)

**Проблема:** 20 файлов используют относительные пути `../../../../shared/constants/roles` вместо Nuxt 4 алиаса `#shared/constants/roles`. Сборка на Vercel падает.

**Решение:** Заменить все импорты на `import { UserRole } from '#shared/constants/roles'`

**Файлы (20 шт):**
- `app/components/Layout/Sidebar.vue:160`
- `app/components/UserModal.vue:130`
- `app/pages/users/index.vue:296`
- `server/api/auth/register.post.ts:2`
- `server/api/auth/telegram.post.ts:2`
- `server/api/admin/userbot-metrics.get.ts:2`
- `server/api/admin/userbot-health.get.ts:3`
- `server/api/users/[id].delete.ts:1`
- `server/api/users/index.get.ts:1`
- `server/api/users/index.post.ts:3`
- `server/api/users/[id].patch.ts:2`
- `server/api/bot/organizations/[id].delete.ts:1`
- `server/api/bot/organizations/index.get.ts:1`
- `server/api/bot/organizations/index.post.ts:1`
- `server/api/bot/organizations/[id].patch.ts:1`
- `server/api/bot/organizations/restaurants/[id].delete.ts:2`
- `server/api/bot/organizations/restaurants/index.get.ts:2`
- `server/api/bot/organizations/restaurants/index.post.ts:3`
- `server/api/bot/organizations/restaurants/[id].patch.ts:2`
- `server/api/bot/webhook.post.ts:5`

**Время:** 30 мин

---

## Приоритет 1: Админка - Редактор промптов

### 1.1 Схема БД

Создать `prisma/schema/report-prompt.prisma`:

```prisma
model ReportPrompt {
  id           String  @id
  name         String
  template     String  @db.Text
  isActive     Boolean @default(true)
  isDefault    Boolean @default(false)

  restaurantId String?
  restaurant   Restaurant? @relation(fields: [restaurantId], references: [id], onDelete: SetNull)

  createdAt DateTime  @default(now())
  createdBy String?
  updatedAt DateTime  @updatedAt
  updatedBy String?
  deletedAt DateTime?
  deletedBy String?

  @@index([restaurantId])
  @@index([isDefault])
}
```

Добавить в `prisma/schema/restaurant.prisma` (модель Restaurant): `prompts ReportPrompt[]`

### 1.2 API (5 файлов)

Создать `server/api/prompts/`:
- `index.get.ts` - Список промптов (SUPER_ADMIN: все, OWNER: свои + default)
- `index.post.ts` - Создать промпт
- `[id].get.ts` - Получить промпт
- `[id].patch.ts` - Обновить промпт
- `[id].delete.ts` - Удалить (soft delete)

Паттерн: копировать структуру из `server/api/users/*.ts`

### 1.3 UI (2 файла + обновление Sidebar)

- Создать `app/pages/admin/prompts/index.vue` - Таблица промптов + создание/редактирование
- Создать `app/components/PromptModal.vue` - Модалка создания/редактирования
- Обновить `app/components/Layout/Sidebar.vue` - Добавить "Промпты" в навигацию (settingsNavigation)

**Время:** 5ч

---

## Приоритет 2: Тестирование (Пятница)

Чеклист для ручного тестирования - выполняется после реализации всех приоритетов.

---

## Приоритет 3: Backend - БД + API голосовых отчетов

### 3.1 Схема БД

Создать `prisma/schema/voice.prisma` и `prisma/schema/weekly-report.prisma`:

```prisma
enum TranscriptionStatus { PENDING PROCESSING COMPLETED FAILED }
enum ReportStatus { PENDING GENERATING COMPLETED FAILED }

model VoiceMessage {
  id              String     @id
  telegramFileId  String
  telegramChatId  String
  userId          String
  restaurantId    String
  restaurant      Restaurant @relation(fields: [restaurantId], references: [id])
  duration        Int?
  fileSize        Int?
  transcript      Transcript?
  createdAt       DateTime   @default(now())

  @@index([restaurantId, createdAt])
  @@index([telegramChatId])
}

model Transcript {
  id             String              @id
  text           String              @db.Text
  status         TranscriptionStatus @default(PENDING)
  voiceMessageId String              @unique
  voiceMessage   VoiceMessage        @relation(fields: [voiceMessageId], references: [id])
  externalJobId  String?
  error          String?             @db.Text
  createdAt      DateTime            @default(now())
  completedAt    DateTime?

  @@index([status])
}

model WeeklyReport {
  id            String       @id
  restaurantId  String
  restaurant    Restaurant   @relation(fields: [restaurantId], references: [id])
  promptId      String?
  weekStart     DateTime
  weekEnd       DateTime
  status        ReportStatus @default(PENDING)
  content       String?      @db.Text
  messageCount  Int          @default(0)
  error         String?      @db.Text
  createdAt     DateTime     @default(now())
  createdBy     String?
  completedAt   DateTime?

  @@index([restaurantId, weekStart])
  @@unique([restaurantId, weekStart])
}
```

Добавить в `prisma/schema/restaurant.prisma` (модель Restaurant): `voiceMessages VoiceMessage[]`, `weeklyReports WeeklyReport[]`

### 3.2 GPT утилита

Создать `server/utils/gpt-reports.ts`:
- `generateWeeklyReport(transcripts, promptTemplate, restaurantName, weekStart, weekEnd)`
- Зависимость: `openai` пакет + `OPENAI_API_KEY` env

### 3.3 API (4 файла)

- `server/api/reports/index.get.ts` - Список отчетов
- `server/api/reports/[id].get.ts` - Детали отчета
- `server/api/reports/generate.post.ts` - Генерация отчета (GPT)
- `server/api/transcriptions/webhook.post.ts` - Webhook от сервиса транскрибирования

### 3.4 Bot handler

Добавить в `server/api/bot/webhook.post.ts`:
- `bot.on('message:voice')` - Сохранение голосового + отправка на транскрибирование

**Время:** 8ч

---

## Приоритет 4: Userbot - Новый флоу онбординга

### Текущий флоу:
```
/start -> Имя орг -> Масштаб (1/2-5/5+) -> Контакт -> Имя ресторана -> Группа
```

### Новый флоу:
```
/start -> Контакт -> Имя орг -> Масштаб (1/2-10/11+) -> Авто-создание всего -> Группа -> "Что дальше"
```

### Ключевые изменения

| Аспект | Было | Стало |
|--------|------|-------|
| Шаг 1 | Ввод имени орг | Поделиться контактом |
| Шаг 2 | Выбор масштаба | Ввод имени орг |
| Шаг 3 | Поделиться контактом | Выбор масштаба (1 / 2-10 / 11+) |
| Ресторан | Пользователь вводит имя | Авто = имя организации |
| Шаг 5 | Создание группы | Авто-создание: Org + Billing + Restaurant + User + Группа |
| Шаг 6 | - | **Закомментировано:** ссылка на админку + пароль |
| Шаг 7 | - | Сообщение "Что делать дальше" |

### Файлы для изменения

1. **`server/types/bot.ts`** - Обновить состояния:
   - Убрать `WAITING_FIRST_REST` (ресторан создается автоматически)
   - Порядок: `WAITING_CONTACT -> WAITING_NAME -> WAITING_SCALE -> COMPLETED`

2. **`server/api/bot/webhook.post.ts`** - Переписать весь стейт-машин:
   - `/start` -> `WAITING_CONTACT` (не `WAITING_NAME`)
   - `message:contact` -> сохранить телефон -> `WAITING_NAME`
   - `message:text (WAITING_NAME)` -> сохранить tempOrgName -> `WAITING_SCALE`
   - `callback_query (scale_*)` -> создать ВСЁ:
     - Organization + Billing(TRIAL)
     - Restaurant (name = orgName)
     - Update User (OWNER, orgId, restId)
     - createRestaurantGroup() через userbot
     - // Закомментировано: ссылка + пароль
     - Сообщение "Что делать дальше"
     - `COMPLETED`

**Время:** 5ч

---

## Приоритет 5: Биллинг и тарифы

### 5.1 Схема БД

Создать `prisma/schema/tariff.prisma`:

```prisma
model Tariff {
  id               String  @id
  name             String
  description      String? @db.Text
  price            Float
  period           Int     @default(30)  // дней
  maxRestaurants   Int     @default(1)
  maxUsers         Int     @default(5)
  maxVoiceMessages Int     @default(100)
  maxReports       Int     @default(4)
  isActive         Boolean @default(true)
  sortOrder        Int     @default(0)
  billings         Billing[]
  createdAt        DateTime  @default(now())
  createdBy        String?
  updatedAt        DateTime  @updatedAt
  updatedBy        String?
  deletedAt        DateTime?
  deletedBy        String?
}
```

Обновить `prisma/schema/billing.prisma`:
```prisma
model Billing {
  // ... существующие поля ...
  tariffId  String?
  tariff    Tariff? @relation(fields: [tariffId], references: [id])
}
```

### 5.2 API (4 файла)

Создать `server/api/tariffs/`:
- `index.get.ts` - Список тарифов
- `index.post.ts` - Создать тариф (SUPER_ADMIN)
- `[id].patch.ts` - Обновить тариф
- `[id].delete.ts` - Удалить тариф (soft delete)

### 5.3 UI

- Создать `app/pages/admin/tariffs/index.vue` - Управление тарифами
- Создать `app/components/TariffModal.vue` - Модалка создания/редактирования
- Обновить Sidebar - Добавить "Тарифы" для SUPER_ADMIN
- Обновить `app/pages/organizations/index.vue` - Показать тариф на карточке организации

**Время:** 6ч

---

## Приоритет 6: Временный пароль/логин - ПРОПУСКАЕМ

Вход в админку пока не нужен.

---

## Структура Prisma: Multi-file Schema

Prisma 6.10 (наша версия) поддерживает multi-file schema из коробки (GA с v6.7).

### Шаг 0: Миграция на multi-file

1. Создать папку `prisma/schema/`
2. Разбить текущий `prisma/schema.prisma` на файлы:

```
prisma/schema/
  base.prisma          # generator, datasource, enums (Role, BillingStatus)
  user.prisma           # model User
  organization.prisma   # model Organization
  billing.prisma        # model Billing
  restaurant.prisma     # model Restaurant + RestaurantStat
  userbot.prisma        # models UserbotAction, RateLimitLog, SuspiciousActivity
  report-prompt.prisma  # model ReportPrompt (НОВЫЙ)
  voice.prisma          # models VoiceMessage, Transcript (НОВЫЙ)
  weekly-report.prisma  # model WeeklyReport + enums (НОВЫЙ)
  tariff.prisma         # model Tariff (НОВЫЙ)
```

3. Обновить `package.json`:
```json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts",
    "schema": "prisma/schema"
  }
}
```

4. Удалить старый `prisma/schema.prisma`

Каждый файл - самостоятельный, Prisma автоматически мержит все `.prisma` файлы из папки. Модели из разных файлов могут ссылаться друг на друга без импортов.

### Миграция

После разбиения на файлы + добавления новых моделей:

```bash
npx prisma migrate dev --name add_prompts_reports_tariffs
```

---

## Новые зависимости

```bash
npm install openai
```

Новые env-переменные:
```
OPENAI_API_KEY=sk-...
TRANSCRIPTION_WEBHOOK_SECRET=random-secret
```

---

## Расписание

### Вторник
| Задача | Часы |
|--------|------|
| Приоритет 0: Фикс 20 импортов + проверка сборки | 1ч |
| Prisma multi-file schema: разбить на файлы | 1ч |
| Приоритет 4: Переписать бот-флоу + тест userbot | 5ч |

### Среда
| Задача | Часы |
|--------|------|
| Приоритет 1: Промпты - схема + API + UI | 5ч |
| Приоритет 5: Тарифы - схема + API + UI | 4ч |

### Четверг
| Задача | Часы |
|--------|------|
| Приоритет 3: Voice/Transcript/Report - схема + API + GPT | 8ч |

### Пятница
| Задача | Часы |
|--------|------|
| Приоритет 2: Тестирование по чеклисту | Весь день |

### Понедельник
| Задача | Время |
|--------|-------|
| Деплой на продакшн | Утро |
| Smoke test | День |

---

## Верификация

### После Приоритета 0:
```bash
yarn build  # Должна пройти без ошибок
```

### После Приоритета 1:
- [ ] Создать дефолтный промпт через UI
- [ ] Создать промпт для конкретного ресторана
- [ ] Отредактировать шаблон промпта
- [ ] Удалить промпт
- [ ] OWNER видит только свои промпты + дефолтные

### После Приоритета 3:
- [ ] Голосовое в группе -> VoiceMessage + Transcript в БД
- [ ] Webhook транскрибирования -> Transcript обновлен
- [ ] Генерация отчета -> WeeklyReport с контентом от GPT

### После Приоритета 4:
- [ ] `/start` -> запрос контакта
- [ ] Контакт -> запрос имени организации
- [ ] Имя -> выбор масштаба (1 / 2-10 / 11+)
- [ ] Масштаб -> авто-создание: Org + Billing + Restaurant + группа
- [ ] Дубликат телефона -> отклонение
- [ ] Ошибка userbot -> fallback на ручную привязку

### После Приоритета 5:
- [ ] Создать 3 тарифа: Стартовый, Бизнес, Корпоративный
- [ ] Привязать тариф к организации
- [ ] Тариф виден на карточке организации
- [ ] Деактивировать тариф

---

## Критические файлы

| Файл | Приоритет | Что менять |
|------|-----------|------------|
| `prisma/schema.prisma` -> `prisma/schema/*.prisma` | 0+ | Разбить на 10 файлов |
| `prisma/schema/report-prompt.prisma` | 1 | Новый файл |
| `prisma/schema/voice.prisma` | 3 | Новый файл |
| `prisma/schema/weekly-report.prisma` | 3 | Новый файл |
| `prisma/schema/tariff.prisma` | 5 | Новый файл |
| `prisma/schema/billing.prisma` | 5 | Добавить tariffId |
| `prisma/schema/restaurant.prisma` | 1,3 | Добавить relations |
| `server/api/bot/webhook.post.ts` | 3,4 | Новый онбординг-флоу + voice handler |
| `server/types/bot.ts` | 4 | Убрать WAITING_FIRST_REST |
| `app/components/Layout/Sidebar.vue` | 0,1,5 | Фикс импорта + навигация |
| Все 20 файлов с импортами | 0 | `#shared/constants/roles` |

## Риски

1. **Конфликты миграций** -> Все изменения схемы в одной миграции
2. **Userbot на проде** -> Тестировать на тестовом аккаунте
3. **GPT API** -> Начать со стаба, подключить позже
4. **Пользователи в процессе онбординга** -> Сбросить botState перед деплоем
