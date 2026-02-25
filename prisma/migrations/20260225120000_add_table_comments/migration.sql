-- Комментарии к таблицам
COMMENT ON TABLE "User" IS 'Пользователи системы (менеджеры, владельцы, суперадмины)';
COMMENT ON TABLE "Organization" IS 'Организации — владельцы ресторанов';
COMMENT ON TABLE "Billing" IS 'Биллинг организации (подписка, триал)';
COMMENT ON TABLE "Tariff" IS 'Тарифные планы (цены, лимиты)';
COMMENT ON TABLE "Payment" IS 'Платежи через Тинькофф Кассу';
COMMENT ON TABLE "Lead" IS 'Лиды — контакты до завершения онбординга';
COMMENT ON TABLE "Restaurant" IS 'Рестораны организации';
COMMENT ON TABLE "RestaurantStat" IS 'Метрики и статистика ресторана';
COMMENT ON TABLE "VoiceMessage" IS 'Голосовые сообщения из Telegram';
COMMENT ON TABLE "Transcript" IS 'Транскрипции голосовых (Whisper + GPT-классификация)';
COMMENT ON TABLE "ReportPrompt" IS 'Шаблоны промптов для генерации отчётов';
COMMENT ON TABLE "Report" IS 'GPT-отчёты по транскрипциям';
COMMENT ON TABLE "ReportTranscript" IS 'Связь Report ↔ Transcript (many-to-many)';
COMMENT ON TABLE "UserbotAction" IS 'Логирование действий userbot';
COMMENT ON TABLE "RateLimitLog" IS 'Rate-limit лог для антифрода';
COMMENT ON TABLE "SuspiciousActivity" IS 'Подозрительная активность (антифрод)';

-- Комментарии к колонкам — User
COMMENT ON COLUMN "User"."id" IS 'CUID идентификатор';
COMMENT ON COLUMN "User"."telegramId" IS 'Telegram user ID';
COMMENT ON COLUMN "User"."login" IS 'Логин для веб-входа';
COMMENT ON COLUMN "User"."passwordHash" IS 'Хэш пароля (bcrypt)';
COMMENT ON COLUMN "User"."name" IS 'Имя пользователя';
COMMENT ON COLUMN "User"."phone" IS 'Номер телефона';
COMMENT ON COLUMN "User"."role" IS 'Роль: SUPER_ADMIN, OWNER, MANAGER';
COMMENT ON COLUMN "User"."botState" IS 'Текущее состояние онбординга в Telegram-боте';
COMMENT ON COLUMN "User"."tempOrgName" IS 'Временное название организации (при онбординге)';
COMMENT ON COLUMN "User"."organizationId" IS 'FK → Organization';
COMMENT ON COLUMN "User"."restaurantId" IS 'FK → Restaurant (привязка менеджера)';
COMMENT ON COLUMN "User"."createdAt" IS 'Дата создания';
COMMENT ON COLUMN "User"."createdBy" IS 'Кем создан';
COMMENT ON COLUMN "User"."updatedAt" IS 'Дата обновления';
COMMENT ON COLUMN "User"."updatedBy" IS 'Кем обновлён';
COMMENT ON COLUMN "User"."deletedAt" IS 'Дата мягкого удаления (soft delete)';
COMMENT ON COLUMN "User"."deletedBy" IS 'Кем удалён';

-- Комментарии к колонкам — Organization
COMMENT ON COLUMN "Organization"."id" IS 'CUID идентификатор';
COMMENT ON COLUMN "Organization"."name" IS 'Название организации';
COMMENT ON COLUMN "Organization"."createdAt" IS 'Дата создания';
COMMENT ON COLUMN "Organization"."createdBy" IS 'Кем создана';
COMMENT ON COLUMN "Organization"."updatedAt" IS 'Дата обновления';
COMMENT ON COLUMN "Organization"."updatedBy" IS 'Кем обновлена';
COMMENT ON COLUMN "Organization"."deletedAt" IS 'Дата мягкого удаления';
COMMENT ON COLUMN "Organization"."deletedBy" IS 'Кем удалена';

-- Комментарии к колонкам — Billing
COMMENT ON COLUMN "Billing"."id" IS 'CUID идентификатор';
COMMENT ON COLUMN "Billing"."status" IS 'Статус: TRIAL, ACTIVE, DISABLED';
COMMENT ON COLUMN "Billing"."trialStartsAt" IS 'Начало триального периода';
COMMENT ON COLUMN "Billing"."trialEndsAt" IS 'Окончание триала (7 дней)';
COMMENT ON COLUMN "Billing"."activeUntil" IS 'Подписка активна до этой даты';
COMMENT ON COLUMN "Billing"."tariffId" IS 'FK → текущий тариф';
COMMENT ON COLUMN "Billing"."transcriptionsUsed" IS 'Использовано транскрипций за период';
COMMENT ON COLUMN "Billing"."organizationId" IS 'FK → Organization (1:1)';
COMMENT ON COLUMN "Billing"."createdAt" IS 'Дата создания';
COMMENT ON COLUMN "Billing"."createdBy" IS 'Кем создан';
COMMENT ON COLUMN "Billing"."updatedAt" IS 'Дата обновления';
COMMENT ON COLUMN "Billing"."updatedBy" IS 'Кем обновлён';
COMMENT ON COLUMN "Billing"."deletedAt" IS 'Дата мягкого удаления';
COMMENT ON COLUMN "Billing"."deletedBy" IS 'Кем удалён';

-- Комментарии к колонкам — Tariff
COMMENT ON COLUMN "Tariff"."id" IS 'CUID идентификатор';
COMMENT ON COLUMN "Tariff"."name" IS 'Название тарифа (Пробный, Базовый)';
COMMENT ON COLUMN "Tariff"."description" IS 'Описание тарифа';
COMMENT ON COLUMN "Tariff"."price" IS 'Цена в рублях (0 = бесплатный)';
COMMENT ON COLUMN "Tariff"."period" IS 'Период действия в днях';
COMMENT ON COLUMN "Tariff"."maxRestaurants" IS 'Лимит ресторанов';
COMMENT ON COLUMN "Tariff"."maxUsers" IS 'Лимит пользователей';
COMMENT ON COLUMN "Tariff"."maxTranscriptions" IS 'Лимит транскрипций за период';
COMMENT ON COLUMN "Tariff"."isActive" IS 'Доступен для покупки';
COMMENT ON COLUMN "Tariff"."sortOrder" IS 'Порядок сортировки';
COMMENT ON COLUMN "Tariff"."createdAt" IS 'Дата создания';
COMMENT ON COLUMN "Tariff"."createdBy" IS 'Кем создан';
COMMENT ON COLUMN "Tariff"."updatedAt" IS 'Дата обновления';
COMMENT ON COLUMN "Tariff"."updatedBy" IS 'Кем обновлён';
COMMENT ON COLUMN "Tariff"."deletedAt" IS 'Дата мягкого удаления';
COMMENT ON COLUMN "Tariff"."deletedBy" IS 'Кем удалён';

-- Комментарии к колонкам — Payment
COMMENT ON COLUMN "Payment"."id" IS 'CUID идентификатор';
COMMENT ON COLUMN "Payment"."amount" IS 'Сумма в рублях';
COMMENT ON COLUMN "Payment"."status" IS 'Статус: CREATED, PENDING, COMPLETED, FAILED, REFUNDED';
COMMENT ON COLUMN "Payment"."organizationId" IS 'FK → Organization';
COMMENT ON COLUMN "Payment"."tariffId" IS 'FK → Tariff';
COMMENT ON COLUMN "Payment"."billingId" IS 'FK → Billing';
COMMENT ON COLUMN "Payment"."providerPaymentId" IS 'PaymentId от Тинькофф';
COMMENT ON COLUMN "Payment"."paymentUrl" IS 'Ссылка на форму оплаты';
COMMENT ON COLUMN "Payment"."providerStatus" IS 'Статус от Тинькофф (NEW, CONFIRMED, REJECTED...)';
COMMENT ON COLUMN "Payment"."periodStart" IS 'Начало оплаченного периода';
COMMENT ON COLUMN "Payment"."periodEnd" IS 'Конец оплаченного периода';
COMMENT ON COLUMN "Payment"."createdAt" IS 'Дата создания';
COMMENT ON COLUMN "Payment"."completedAt" IS 'Дата завершения оплаты';
COMMENT ON COLUMN "Payment"."error" IS 'Ошибка при оплате';

-- Комментарии к колонкам — Lead
COMMENT ON COLUMN "Lead"."id" IS 'CUID идентификатор';
COMMENT ON COLUMN "Lead"."telegramId" IS 'Telegram user ID';
COMMENT ON COLUMN "Lead"."phone" IS 'Номер телефона';
COMMENT ON COLUMN "Lead"."name" IS 'Имя из Telegram';
COMMENT ON COLUMN "Lead"."username" IS 'Username из Telegram';
COMMENT ON COLUMN "Lead"."converted" IS 'Прошёл полный онбординг';
COMMENT ON COLUMN "Lead"."createdAt" IS 'Дата создания';

-- Комментарии к колонкам — Restaurant
COMMENT ON COLUMN "Restaurant"."id" IS 'CUID идентификатор';
COMMENT ON COLUMN "Restaurant"."name" IS 'Название ресторана';
COMMENT ON COLUMN "Restaurant"."organizationId" IS 'FK → Organization';
COMMENT ON COLUMN "Restaurant"."settingsComment" IS 'JSON настройки (расписание отчётов, Telegram chat ID)';
COMMENT ON COLUMN "Restaurant"."createdAt" IS 'Дата создания';
COMMENT ON COLUMN "Restaurant"."createdBy" IS 'Кем создан';
COMMENT ON COLUMN "Restaurant"."updatedAt" IS 'Дата обновления';
COMMENT ON COLUMN "Restaurant"."updatedBy" IS 'Кем обновлён';
COMMENT ON COLUMN "Restaurant"."deletedAt" IS 'Дата мягкого удаления';
COMMENT ON COLUMN "Restaurant"."deletedBy" IS 'Кем удалён';

-- Комментарии к колонкам — RestaurantStat
COMMENT ON COLUMN "RestaurantStat"."id" IS 'CUID идентификатор';
COMMENT ON COLUMN "RestaurantStat"."restaurantId" IS 'FK → Restaurant';
COMMENT ON COLUMN "RestaurantStat"."date" IS 'Дата метрики';
COMMENT ON COLUMN "RestaurantStat"."metricName" IS 'Название метрики';
COMMENT ON COLUMN "RestaurantStat"."value" IS 'Значение метрики';
COMMENT ON COLUMN "RestaurantStat"."createdAt" IS 'Дата создания';
COMMENT ON COLUMN "RestaurantStat"."deletedAt" IS 'Дата мягкого удаления';

-- Комментарии к колонкам — VoiceMessage
COMMENT ON COLUMN "VoiceMessage"."id" IS 'CUID идентификатор';
COMMENT ON COLUMN "VoiceMessage"."telegramFileId" IS 'file_id из Telegram API';
COMMENT ON COLUMN "VoiceMessage"."telegramChatId" IS 'ID чата откуда пришло сообщение';
COMMENT ON COLUMN "VoiceMessage"."duration" IS 'Длительность в секундах';
COMMENT ON COLUMN "VoiceMessage"."fileSize" IS 'Размер файла в байтах';
COMMENT ON COLUMN "VoiceMessage"."mimeType" IS 'MIME тип (audio/ogg, audio/mpeg)';
COMMENT ON COLUMN "VoiceMessage"."restaurantId" IS 'FK → Restaurant';
COMMENT ON COLUMN "VoiceMessage"."userId" IS 'FK → User (отправитель)';
COMMENT ON COLUMN "VoiceMessage"."status" IS 'Статус: RECEIVED, TRANSCRIBING, TRANSCRIBED, FAILED';
COMMENT ON COLUMN "VoiceMessage"."error" IS 'Ошибка обработки';
COMMENT ON COLUMN "VoiceMessage"."createdAt" IS 'Дата получения';

-- Комментарии к колонкам — Transcript
COMMENT ON COLUMN "Transcript"."id" IS 'CUID идентификатор';
COMMENT ON COLUMN "Transcript"."text" IS 'Текст транскрипции';
COMMENT ON COLUMN "Transcript"."language" IS 'Определённый язык (ru, en)';
COMMENT ON COLUMN "Transcript"."durationMs" IS 'Время обработки Whisper (мс)';
COMMENT ON COLUMN "Transcript"."sentiment" IS 'Тональность: positive, negative, neutral, mixed';
COMMENT ON COLUMN "Transcript"."category" IS 'Категория: food, service, atmosphere, loyalty, wow';
COMMENT ON COLUMN "Transcript"."subcategory" IS 'Подкатегория (для food): temperature, taste, foreign_object, cooking, quality';
COMMENT ON COLUMN "Transcript"."dishes" IS 'JSON массив упомянутых блюд';
COMMENT ON COLUMN "Transcript"."severity" IS 'Серьёзность 1-5 (1=мелочь, 5=критический инцидент)';
COMMENT ON COLUMN "Transcript"."problemTypes" IS 'JSON массив типов проблем (cold_food, hair_found...)';
COMMENT ON COLUMN "Transcript"."classifiedAt" IS 'Когда классифицирован GPT (null = ещё не обработан)';
COMMENT ON COLUMN "Transcript"."voiceMessageId" IS 'FK → VoiceMessage (1:1)';
COMMENT ON COLUMN "Transcript"."restaurantId" IS 'FK → Restaurant';
COMMENT ON COLUMN "Transcript"."userId" IS 'FK → User (автор голосового)';
COMMENT ON COLUMN "Transcript"."createdAt" IS 'Дата создания';

-- Комментарии к колонкам — ReportPrompt
COMMENT ON COLUMN "ReportPrompt"."id" IS 'CUID идентификатор';
COMMENT ON COLUMN "ReportPrompt"."name" IS 'Название промпта';
COMMENT ON COLUMN "ReportPrompt"."template" IS 'Шаблон промпта с переменными ({restaurant_name}, {transcripts}...)';
COMMENT ON COLUMN "ReportPrompt"."isActive" IS 'Активен ли промпт';
COMMENT ON COLUMN "ReportPrompt"."isDefault" IS 'Промпт по умолчанию (используется если нет ресторанного)';
COMMENT ON COLUMN "ReportPrompt"."restaurantId" IS 'FK → Restaurant (null = глобальный)';
COMMENT ON COLUMN "ReportPrompt"."createdAt" IS 'Дата создания';
COMMENT ON COLUMN "ReportPrompt"."createdBy" IS 'Кем создан';
COMMENT ON COLUMN "ReportPrompt"."updatedAt" IS 'Дата обновления';
COMMENT ON COLUMN "ReportPrompt"."updatedBy" IS 'Кем обновлён';
COMMENT ON COLUMN "ReportPrompt"."deletedAt" IS 'Дата мягкого удаления';
COMMENT ON COLUMN "ReportPrompt"."deletedBy" IS 'Кем удалён';

-- Комментарии к колонкам — Report
COMMENT ON COLUMN "Report"."id" IS 'CUID идентификатор';
COMMENT ON COLUMN "Report"."title" IS 'Название отчёта (Автоотчёт за 10-16 фев 2026)';
COMMENT ON COLUMN "Report"."content" IS 'Текст основного отчёта';
COMMENT ON COLUMN "Report"."summary" IS 'Краткая выжимка для владельца';
COMMENT ON COLUMN "Report"."dishAnalysis" IS 'Анализ блюд по негативным отзывам (Промпт 3)';
COMMENT ON COLUMN "Report"."status" IS 'Статус: GENERATING, COMPLETED, FAILED';
COMMENT ON COLUMN "Report"."periodStart" IS 'Начало периода отчёта';
COMMENT ON COLUMN "Report"."periodEnd" IS 'Конец периода отчёта';
COMMENT ON COLUMN "Report"."restaurantId" IS 'FK → Restaurant';
COMMENT ON COLUMN "Report"."promptId" IS 'FK → ReportPrompt (использованный промпт)';
COMMENT ON COLUMN "Report"."model" IS 'Модель GPT (gpt-4o-mini, gpt-4o)';
COMMENT ON COLUMN "Report"."tokensUsed" IS 'Использовано токенов GPT';
COMMENT ON COLUMN "Report"."generationTimeMs" IS 'Время генерации в мс';
COMMENT ON COLUMN "Report"."error" IS 'Ошибка если статус FAILED';
COMMENT ON COLUMN "Report"."createdAt" IS 'Дата создания';
COMMENT ON COLUMN "Report"."createdBy" IS 'Кто создал: cron (автоотчёт) или user ID';

-- Комментарии к колонкам — ReportTranscript
COMMENT ON COLUMN "ReportTranscript"."id" IS 'CUID идентификатор';
COMMENT ON COLUMN "ReportTranscript"."reportId" IS 'FK → Report';
COMMENT ON COLUMN "ReportTranscript"."transcriptId" IS 'FK → Transcript';

-- Комментарии к колонкам — UserbotAction
COMMENT ON COLUMN "UserbotAction"."id" IS 'CUID идентификатор';
COMMENT ON COLUMN "UserbotAction"."action" IS 'Тип действия (join_group, send_message...)';
COMMENT ON COLUMN "UserbotAction"."userId" IS 'ID пользователя-инициатора';
COMMENT ON COLUMN "UserbotAction"."restaurantId" IS 'FK → Restaurant (если применимо)';
COMMENT ON COLUMN "UserbotAction"."chatId" IS 'Telegram chat ID';
COMMENT ON COLUMN "UserbotAction"."success" IS 'Успешно ли выполнено';
COMMENT ON COLUMN "UserbotAction"."error" IS 'Текст ошибки';
COMMENT ON COLUMN "UserbotAction"."metadata" IS 'Дополнительные данные (JSON)';
COMMENT ON COLUMN "UserbotAction"."createdAt" IS 'Дата действия';

-- Комментарии к колонкам — RateLimitLog
COMMENT ON COLUMN "RateLimitLog"."id" IS 'CUID идентификатор';
COMMENT ON COLUMN "RateLimitLog"."userId" IS 'ID пользователя';
COMMENT ON COLUMN "RateLimitLog"."action" IS 'Тип действия';
COMMENT ON COLUMN "RateLimitLog"."timestamp" IS 'Время запроса';
COMMENT ON COLUMN "RateLimitLog"."createdAt" IS 'Дата создания записи';

-- Комментарии к колонкам — SuspiciousActivity
COMMENT ON COLUMN "SuspiciousActivity"."id" IS 'CUID идентификатор';
COMMENT ON COLUMN "SuspiciousActivity"."userId" IS 'ID подозрительного пользователя';
COMMENT ON COLUMN "SuspiciousActivity"."reason" IS 'Причина подозрения';
COMMENT ON COLUMN "SuspiciousActivity"."detectedAt" IS 'Когда обнаружено';
COMMENT ON COLUMN "SuspiciousActivity"."resolved" IS 'Разрешена ли ситуация';
COMMENT ON COLUMN "SuspiciousActivity"."metadata" IS 'Дополнительные данные (JSON)';
