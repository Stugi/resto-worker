-- Миграция: перенос онбординга с User на Lead
-- Lead становится основной таблицей для онбординга
-- User создаётся только после завершения онбординга

-- 1. Дедупликация Lead по telegramId (оставляем самый свежий)
DELETE FROM "Lead" WHERE id NOT IN (
  SELECT DISTINCT ON ("telegramId") id
  FROM "Lead"
  ORDER BY "telegramId", "createdAt" DESC
);

-- 2. Удалить старый composite unique constraint
ALTER TABLE "Lead" DROP CONSTRAINT IF EXISTS "Lead_telegramId_phone_key";

-- 3. Сделать phone nullable
ALTER TABLE "Lead" ALTER COLUMN "phone" DROP NOT NULL;

-- 4. Добавить новые колонки в Lead
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "botState" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "orgName" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "scale" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- 5. Добавить unique constraint на telegramId
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_telegramId_key" UNIQUE ("telegramId");

-- 6. Удалить tempOrgName из User
ALTER TABLE "User" DROP COLUMN IF EXISTS "tempOrgName";
