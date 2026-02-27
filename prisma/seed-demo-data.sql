-- =============================================================
-- CosmicMind AI — Демо-данные для красивых отчётов аналитики
-- =============================================================
-- Вставляет 50 голосовых сообщений + транскрипций за последний месяц
-- с классифицированными отзывами по всем категориям.
--
-- Перед запуском убедись что существует хотя бы 1 ресторан и 1 пользователь.
-- SQL автоматически подставит первый найденный restaurantId и userId.
-- =============================================================

-- Используем переменные через CTE
WITH vars AS (
  SELECT
    (SELECT id FROM "Restaurant" WHERE "deletedAt" IS NULL ORDER BY "createdAt" ASC LIMIT 1) AS rest_id,
    (SELECT id FROM "User" ORDER BY "createdAt" ASC LIMIT 1) AS user_id
),

-- Генерация 50 записей с разными датами за последний месяц
generated AS (
  SELECT
    'vm_demo_' || LPAD(n::text, 3, '0') AS vm_id,
    'tr_demo_' || LPAD(n::text, 3, '0') AS tr_id,
    -- Распределяем по последнему месяцу, с акцентом на рабочие часы
    NOW() - (random() * interval '30 days') +
      (CASE WHEN random() < 0.7
        THEN (10 + floor(random() * 10))::int * interval '1 hour'  -- 10:00-20:00 чаще
        ELSE (floor(random() * 24))::int * interval '1 hour'
      END) AS created,
    n
  FROM generate_series(1, 50) AS n
)

-- ==========================================
-- 1. Вставляем VoiceMessage
-- ==========================================
INSERT INTO "VoiceMessage" ("id", "telegramFileId", "telegramChatId", "duration", "fileSize", "mimeType", "restaurantId", "userId", "status", "createdAt")
SELECT
  g.vm_id,
  'demo_file_' || g.vm_id,
  '-100demo',
  15 + floor(random() * 45)::int,  -- 15-60 секунд
  50000 + floor(random() * 100000)::int,
  'audio/ogg',
  v.rest_id,
  v.user_id,
  'TRANSCRIBED',
  g.created
FROM generated g, vars v
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- 2. Вставляем Transcript с классификацией
-- ==========================================

-- Негативные отзывы про еду (20 шт) — разные подкатегории
INSERT INTO "Transcript" ("id", "text", "language", "durationMs", "voiceMessageId", "restaurantId", "userId", "sentiment", "category", "subcategory", "dishes", "severity", "problemTypes", "classifiedAt", "createdAt")
SELECT
  g.tr_id,
  CASE (g.n % 10)
    WHEN 0 THEN 'Гостю принесли стейк рибай, он был совершенно холодный. Мясо уже остыло, пришлось просить подогреть.'
    WHEN 1 THEN 'Посетитель жалуется что в ролле Верона нашёл волос. Очень неприятная ситуация, сделали комплимент.'
    WHEN 2 THEN 'Салат Цезарь подали с заветренными листьями, сухие и невкусные. Гость был разочарован.'
    WHEN 3 THEN 'Наггетсы пересушены, видимо передержали во фритюре. Гость сказал что несъедобно.'
    WHEN 4 THEN 'Паста карбонара — соус свернулся, вместо кремового получилась каша с яйцом. Не по стандарту.'
    WHEN 5 THEN 'Том ям — слишком острый, гость просил средний уровень, но получил экстра-острый. Пришлось переделывать.'
    WHEN 6 THEN 'Стейк заказывали медиум рэр, принесли медиум велл. Мясо жёсткое, гость недоволен.'
    WHEN 7 THEN 'В супе дня обнаружили кусочек пластика от упаковки. Серьёзный инцидент, менеджер извинился.'
    WHEN 8 THEN 'Тирамису был совершенно не свежий, бисквит размок, крем кислый. Похоже вчерашний.'
    WHEN 9 THEN 'Бургер приехал разваливающийся, котлета сырая внутри. Гость отказался есть.'
  END,
  'ru',
  2000 + floor(random() * 3000)::int,
  g.vm_id,
  v.rest_id,
  v.user_id,
  CASE WHEN g.n % 5 = 0 THEN 'mixed' ELSE 'negative' END,
  'food',
  CASE (g.n % 5)
    WHEN 0 THEN 'temperature'
    WHEN 1 THEN 'foreign_object'
    WHEN 2 THEN 'quality'
    WHEN 3 THEN 'cooking'
    WHEN 4 THEN 'taste'
  END,
  CASE (g.n % 10)
    WHEN 0 THEN '["Стейк рибай"]'
    WHEN 1 THEN '["Ролл Верона"]'
    WHEN 2 THEN '["Салат Цезарь"]'
    WHEN 3 THEN '["Наггетсы"]'
    WHEN 4 THEN '["Паста карбонара"]'
    WHEN 5 THEN '["Том ям"]'
    WHEN 6 THEN '["Стейк рибай"]'
    WHEN 7 THEN '["Суп дня"]'
    WHEN 8 THEN '["Тирамису"]'
    WHEN 9 THEN '["Бургер классик"]'
  END,
  CASE WHEN g.n % 4 = 0 THEN 4 WHEN g.n % 3 = 0 THEN 3 ELSE 2 END,
  CASE (g.n % 5)
    WHEN 0 THEN '["cold_food"]'
    WHEN 1 THEN '["hair_found"]'
    WHEN 2 THEN '["wrong_order"]'
    WHEN 3 THEN '["cold_food"]'
    WHEN 4 THEN '["wrong_order"]'
  END,
  g.created + interval '5 minutes',
  g.created
FROM generated g, vars v
WHERE g.n <= 20
ON CONFLICT (id) DO NOTHING;

-- Негативные отзывы про сервис (8 шт)
INSERT INTO "Transcript" ("id", "text", "language", "durationMs", "voiceMessageId", "restaurantId", "userId", "sentiment", "category", "subcategory", "severity", "problemTypes", "classifiedAt", "createdAt")
SELECT
  g.tr_id,
  CASE (g.n % 4)
    WHEN 0 THEN 'Официант был очень грубый, хамил когда попросили поменять блюдо. Гость ушёл недовольный.'
    WHEN 1 THEN 'Ждали заказ 50 минут! Кухня перегружена, но никто не предупредил. Гости были в бешенстве.'
    WHEN 2 THEN 'Перепутали заказ — принесли не то блюдо. Потом ещё 20 минут ждали правильное.'
    WHEN 3 THEN 'Менеджер не подошёл извиниться после жалобы. Гость сам попросил книгу жалоб.'
  END,
  'ru',
  2000 + floor(random() * 3000)::int,
  g.vm_id,
  v.rest_id,
  v.user_id,
  'negative',
  'service',
  NULL,
  CASE WHEN g.n % 2 = 0 THEN 3 ELSE 2 END,
  CASE (g.n % 4)
    WHEN 0 THEN '["rude_staff"]'
    WHEN 1 THEN '["slow_service"]'
    WHEN 2 THEN '["wrong_order"]'
    WHEN 3 THEN '["rude_staff"]'
  END,
  g.created + interval '5 minutes',
  g.created
FROM generated g, vars v
WHERE g.n > 20 AND g.n <= 28
ON CONFLICT (id) DO NOTHING;

-- Негативные отзывы про атмосферу (4 шт)
INSERT INTO "Transcript" ("id", "text", "language", "durationMs", "voiceMessageId", "restaurantId", "userId", "sentiment", "category", "subcategory", "severity", "problemTypes", "classifiedAt", "createdAt")
SELECT
  g.tr_id,
  CASE (g.n % 4)
    WHEN 0 THEN 'Грязный стол — крошки, пятна от прошлых гостей. Посуда тоже была с разводами.'
    WHEN 1 THEN 'Музыка слишком громкая, невозможно разговаривать. Гости просили убавить, но ничего не изменилось.'
    WHEN 2 THEN 'Кондиционер не работает, в зале очень душно. Несколько столов попросили пересадить.'
    WHEN 3 THEN 'Освещение слишком тусклое, гость не мог прочитать меню. Пришлось включить фонарик на телефоне.'
  END,
  'ru',
  2000 + floor(random() * 3000)::int,
  g.vm_id,
  v.rest_id,
  v.user_id,
  'negative',
  'atmosphere',
  NULL,
  2,
  CASE (g.n % 4)
    WHEN 0 THEN '["dirty_table"]'
    WHEN 1 THEN '["loud_music"]'
    WHEN 2 THEN '["broken_ac"]'
    WHEN 3 THEN '["loud_music"]'
  END,
  g.created + interval '5 minutes',
  g.created
FROM generated g, vars v
WHERE g.n > 28 AND g.n <= 32
ON CONFLICT (id) DO NOTHING;

-- Позитивные отзывы (15 шт) — разные категории
INSERT INTO "Transcript" ("id", "text", "language", "durationMs", "voiceMessageId", "restaurantId", "userId", "sentiment", "category", "subcategory", "severity", "classifiedAt", "createdAt")
SELECT
  g.tr_id,
  CASE (g.n % 5)
    WHEN 0 THEN 'Гостья в восторге от стейка — идеальная прожарка, сочный, с хрустящей корочкой. Благодарила шефа.'
    WHEN 1 THEN 'Отличный сервис! Официант Миша — внимательный, быстрый, улыбчивый. Гости оставили чаевые 20%.'
    WHEN 2 THEN 'Гости отметили уютную атмосферу, приятную музыку. Сказали что обязательно вернутся.'
    WHEN 3 THEN 'Программа лояльности работает отлично — гость воспользовался скидкой 15% и был очень доволен.'
    WHEN 4 THEN 'Вау-эффект! Именинника поздравили десертом со свечой, вся команда пела. Гости были тронуты.'
  END,
  'ru',
  2000 + floor(random() * 3000)::int,
  g.vm_id,
  v.rest_id,
  v.user_id,
  'positive',
  CASE (g.n % 5)
    WHEN 0 THEN 'food'
    WHEN 1 THEN 'service'
    WHEN 2 THEN 'atmosphere'
    WHEN 3 THEN 'loyalty'
    WHEN 4 THEN 'wow'
  END,
  NULL,
  1,
  g.created + interval '5 minutes',
  g.created
FROM generated g, vars v
WHERE g.n > 32 AND g.n <= 47
ON CONFLICT (id) DO NOTHING;

-- Нейтральные отзывы (3 шт)
INSERT INTO "Transcript" ("id", "text", "language", "durationMs", "voiceMessageId", "restaurantId", "userId", "sentiment", "category", "subcategory", "severity", "classifiedAt", "createdAt")
SELECT
  g.tr_id,
  CASE (g.n % 3)
    WHEN 0 THEN 'Обычный обед, ничего особенного. Еда нормальная, обслуживание стандартное. Всё ок.'
    WHEN 1 THEN 'Бизнес-ланч — порция маленькая, но вкусно. Цена адекватная. Ничего выдающегося.'
    WHEN 2 THEN 'Гость зашёл впервые, сказал что всё на среднем уровне. Ни хорошо ни плохо.'
  END,
  'ru',
  2000 + floor(random() * 3000)::int,
  g.vm_id,
  v.rest_id,
  v.user_id,
  'neutral',
  CASE (g.n % 3)
    WHEN 0 THEN 'food'
    WHEN 1 THEN 'food'
    WHEN 2 THEN 'service'
  END,
  NULL,
  1,
  g.created + interval '5 minutes',
  g.created
FROM generated g, vars v
WHERE g.n > 47 AND g.n <= 50
ON CONFLICT (id) DO NOTHING;

-- =============================================================
-- Проверочный запрос: покажет сводку вставленных данных
-- =============================================================
SELECT
  'Всего транскрипций' AS metric, COUNT(*)::text AS value
FROM "Transcript" WHERE id LIKE 'tr_demo_%'
UNION ALL
SELECT 'Негативных', COUNT(*)::text FROM "Transcript" WHERE id LIKE 'tr_demo_%' AND sentiment = 'negative'
UNION ALL
SELECT 'Позитивных', COUNT(*)::text FROM "Transcript" WHERE id LIKE 'tr_demo_%' AND sentiment = 'positive'
UNION ALL
SELECT 'Смешанных', COUNT(*)::text FROM "Transcript" WHERE id LIKE 'tr_demo_%' AND sentiment = 'mixed'
UNION ALL
SELECT 'Нейтральных', COUNT(*)::text FROM "Transcript" WHERE id LIKE 'tr_demo_%' AND sentiment = 'neutral'
UNION ALL
SELECT 'Категория food', COUNT(*)::text FROM "Transcript" WHERE id LIKE 'tr_demo_%' AND category = 'food'
UNION ALL
SELECT 'Категория service', COUNT(*)::text FROM "Transcript" WHERE id LIKE 'tr_demo_%' AND category = 'service'
UNION ALL
SELECT 'Категория atmosphere', COUNT(*)::text FROM "Transcript" WHERE id LIKE 'tr_demo_%' AND category = 'atmosphere'
UNION ALL
SELECT 'Критических (severity>=4)', COUNT(*)::text FROM "Transcript" WHERE id LIKE 'tr_demo_%' AND severity >= 4;
