/**
 * Шаблоны сообщений Telegram-бота
 * Все тексты бота собраны здесь для удобного редактирования
 */

// --- ОНБОРДИНГ ---

export const MSG_WELCOME = (firstName: string) =>
  `👋 Привет, ${firstName}.\n\n` +
  `Вы в <b>CosmicMind AI</b> — боте, который превращает устную обратную связь гостей в управляемую систему сервиса.\n\n` +
  `<b>Как это работает:</b>\n` +
  `1️⃣ Сотрудник подходит к гостю\n` +
  `2️⃣ Записывает голосовое в группу с ботом\n` +
  `3️⃣ Бот расшифровывает, структурирует и сохраняет отзыв\n` +
  `4️⃣ Руководитель получает еженедельный отчет по сервису\n\n` +
  `Без анкет. Без бумажек. Без "я передам управляющему".\n` +
  `Все жалобы, инсайты и похвала фиксируются в системе.\n\n` +
  `<b>Что это дает собственнику:</b>\n` +
  `• Прозрачную картину сервиса\n` +
  `• Повторяющиеся проблемы\n` +
  `• Контроль работы персонала\n` +
  `• Фактуру для управленческих решений\n\n` +
  `<b>Скоро в боте:</b>\n` +
  `• Автоматическая постановка задач\n` +
  `• Связка сервиса и выручки\n` +
  `• Аналитика по точкам\n\n` +
  `Попробовать можно бесплатно — первые 50 голосовых сообщений без оплаты.\n\n` +
  `Запустить в ресторане можно за 10 минут. 👇 Нажмите кнопку <b>СТАРТ</b> для того, чтобы пройти мини обучение и запустить работу с устной обратной связью в ресторане.`

export const MSG_WELCOME_BACK = (firstName: string, orgName: string, restName: string) =>
  `<b>Привет, ${firstName}!</b>\n\n` +
  `У тебя уже есть организация: <b>${orgName}</b>\n` +
  `Ресторан: <b>${restName}</b>\n\n` +
  `⚙️ /settings — расписание отчётов\n\n` +
  `<i>Отправляй голосовые в группу для транскрипции!</i>`

export const MSG_ALREADY_REGISTERED = (orgName: string) =>
  `У тебя уже есть организация: <b>${orgName}</b>\n\n` +
  `Повторная регистрация невозможна.\n` +
  `⚙️ /settings — расписание отчётов`

export const MSG_PHONE_ALREADY_USED =
  'Этот номер телефона уже используется в другой организации.\n\n' +
  'Для регистрации используй другой номер.'

export const MSG_CONTACT_REQUEST =
  '<b>Для начала поделитесь своим номером телефона:</b>'

export const MSG_PHONE_SAVED =
  'Отлично! Номер сохранен.\n\n' +
  '<b>Как называется ваш ресторан?</b>\n' +
  '<i>(например: "Пицца и Суши" или "Мой ресторан")</i>'

export const MSG_ORG_NAME_CONFIRM = (name: string) =>
  `<b>"${name}"</b> — отличное название!\n\n` +
  `<b>Сколько всего ресторанов?</b>`

export const MSG_CONFIGURING = 'Настраиваю систему...'

// --- РЕЗУЛЬТАТ ОНБОРДИНГА ---

export const MSG_SETUP_COMPLETE = (orgName: string, groupTitle: string, tariffInfo: string, inviteLink?: string) =>
  `<b>Всё готово! 🎉</b>\n\n` +
  `Ресторан: <b>${orgName}</b>\n` +
  `Группа: <b>${groupTitle}</b>\n` +
  (inviteLink ? `🔗 <a href="${inviteLink}">Перейти в группу</a>\n` : '') +
  `\n` +
  `🔔 <b>Бот создал для вас группу «${groupTitle}».</b>\nПродолжите работу в группе ресторана.\n\n` +
  `<b>Что делать дальше:</b>\n\n` +
  `1. Перейдите в группу <b>${groupTitle}</b>\n` +
  `2. Добавьте туда сотрудников\n` +
  `3. Сотрудники записывают голосовые с обратной связью от гостей\n` +
  `4. CosmicMind AI расшифрует, структурирует и сохранит отзывы\n` +
  `5. Вы получите автоматический отчёт по сервису` +
  tariffInfo

export const MSG_SETUP_COMPLETE_WITH_LINK = (orgName: string, groupTitle: string, tariffInfo: string, inviteLink: string) =>
  `<b>Всё готово! 🎉</b>\n\n` +
  `Ресторан: <b>${orgName}</b>\n` +
  `Группа: <b>${groupTitle}</b>\n\n` +
  `Мы не смогли добавить вас в группу автоматически.\n` +
  `🔗 <a href="${inviteLink}">Присоединиться к группе</a>\n\n` +
  `<b>Что делать дальше:</b>\n\n` +
  `1. Перейдите по ссылке выше в группу\n` +
  `2. Добавьте туда сотрудников\n` +
  `3. Сотрудники записывают голосовые с обратной связью от гостей\n` +
  `4. CosmicMind AI расшифрует, структурирует и сохранит отзывы\n` +
  `5. Вы получите автоматический отчёт по сервису` +
  tariffInfo

export const MSG_SETUP_NO_GROUP = (orgName: string, botUsername?: string) =>
  `<b>Организация "${orgName}" создана! ✅</b>\n\n` +
  `Автоматическое создание группы не удалось, но вы можете создать её самостоятельно.\n\n` +
  `<b>Как подключить группу за 2 минуты:</b>\n\n` +
  `1️⃣ Создайте новую группу в Telegram\n` +
  `2️⃣ Добавьте в группу бота @${botUsername || 'CosmicMindBot'}\n` +
  `3️⃣ Бот автоматически привяжет группу к вашему ресторану\n\n` +
  `После этого бот отправит инструкции прямо в группу.\n\n` +
  `<i>Если бот не определяет группу — убедитесь, что вы добавили именно @${botUsername || 'CosmicMindBot'}</i>`


export const MSG_SETUP_ERROR = 'Произошла ошибка при настройке. Попробуй еще раз: /start'

// --- ГРУППА ---

export const MSG_GROUP_INSTRUCTION = (restaurantName: string) =>
  `👋 Добро пожаловать в рабочую группу <b>CosmicMind AI</b> ресторана <b>${restaurantName}</b>\n\n` +
  `Теперь здесь будет фиксироваться вся устная обратная связь от гостей вашего ресторана.\n\n` +
  `<b>Чтобы система начала работать:</b>\n\n` +
  `📌 <b>Шаг 1</b>\nДобавьте в эту группу всех сотрудников, которые общаются с гостями (официанты, менеджеры смены, управляющие).\n\n` +
  `📌 <b>Шаг 2</b>\nСотрудник подходит к гостю и спрашивает обратную связь. После общения записывает голосовое сообщение в эту группу.\n\n` +
  `🎙 Просто голосом, в свободной форме.\n\n` +
  `📌 <b>Шаг 3</b>\n🤖 Бот автоматически:\n` +
  `— расшифрует речь\n` +
  `— распределит по категориям\n` +
  `— сохранит в систему\n\n` +
  `📊 Раз в неделю вы получите отчет со структурированным анализом:\n\n` +
  `🍽 Еда и напитки\n` +
  `🤝 Сервис\n` +
  `🕯 Атмосфера\n` +
  `🎁 Программа лояльности\n` +
  `✨ Эффект вау\n\n` +
  `А также детальный разбор негативных замечаний по конкретным блюдам.\n\n` +
  `<i>Рекомендация: Для объективной картины желательно фиксировать минимум 5–10 отзывов в день.</i>`

// --- КОМАНДЫ ---

export const MSG_SETTINGS_PRIVATE = 'Команда /settings доступна только в группе ресторана'
export const MSG_REPORT_PRIVATE = 'Команда /report доступна только в группе ресторана'
export const MSG_GROUP_NOT_LINKED = 'Эта группа не привязана к ресторану.'

export const MSG_GROUP_LINKED = (orgName: string, groupTitle: string) =>
  `<b>Группа привязана! ✅</b>\n\n` +
  `Ресторан: <b>${orgName}</b>\n` +
  `Группа: <b>${groupTitle}</b>\n\n` +
  `Инструкции отправлены и закреплены в группе.\n` +
  `Добавьте в группу сотрудников и начинайте отправлять голосовые с обратной связью от гостей.`

export const MSG_GROUP_ALREADY_LINKED =
  'У вашего ресторана уже есть привязанная группа.\n\n' +
  'Если хотите сменить группу — обратитесь в поддержку: /help'
export const MSG_USE_START = 'Напиши /start для начала работы'
export const MSG_USE_START_SHORT = 'Используй /start для начала'
export const MSG_START_CALLBACK = 'Начни с /start'

// --- ПОДДЕРЖКА / HELP ---

export const MSG_HELP =
  '<b>💬 Поддержка CosmicMind AI</b>\n\n' +
  'Напишите ваш вопрос следующим сообщением — мы ответим вам в ближайшее время.\n\n' +
  '<i>Можно отправить текст или голосовое сообщение.</i>'

export const MSG_HELP_SENT =
  '✅ Ваше сообщение отправлено в поддержку. Мы ответим вам в ближайшее время!'

export const MSG_HELP_FORWARDED = (userName: string, userId: string, orgName?: string) =>
  `📩 <b>Сообщение от пользователя</b>\n\n` +
  `👤 ${userName}\n` +
  `🆔 <code>${userId}</code>` +
  (orgName ? `\n🏢 ${orgName}` : '') +
  `\n\n<i>Ответьте на это сообщение — ответ будет отправлен пользователю.</i>`

export const MSG_SUPPORT_REPLY_SENT = '✅ Ответ отправлен пользователю'
export const MSG_SUPPORT_REPLY_ERROR = '❌ Не удалось отправить ответ пользователю'

// --- РАСПИСАНИЕ ---

export const MSG_SCHEDULE = (restaurantName: string, timeInfo: string) =>
  `⚙️ <b>Расписание отчётов</b>\n` +
  `Ресторан: <b>${restaurantName}</b>\n\n` +
  `Выберите день, в который нужен автоматический отчёт:` +
  timeInfo

export const MSG_SCHEDULE_TIME = (currentTime: string) =>
  `⏰ <b>Выберите время отправки отчёта:</b>\n\n` +
  `Текущее время: <b>${currentTime}</b> (МСК)`

export const MSG_SCHEDULE_SAVED_TOAST = 'Расписание сохранено!'

export const MSG_SCHEDULE_DISABLED = (restaurantName: string) =>
  `⚙️ <b>Расписание отчётов отключено</b>\n\n` +
  `Ресторан: ${restaurantName}\n\n` +
  `Автоматические отчёты не будут генерироваться.\n` +
  `Чтобы настроить — используй /settings`

export const MSG_SCHEDULE_SAVED = (restaurantName: string, days: string, time: string) =>
  `✅ <b>Расписание сохранено!</b>\n\n` +
  `Ресторан: ${restaurantName}\n` +
  `День: <b>${days}</b>\n` +
  `Время: <b>${time}</b> (МСК)\n\n` +
  `Отчёты будут автоматически генерироваться и отправляться в эту группу.\n` +
  `Чтобы изменить — используй /settings`

// --- ОТЧЁТЫ ---

export const MSG_NO_TRANSCRIPTS = 'За последние 24 часа нет транскрипций для формирования отчёта.'
export const MSG_NO_PROMPT = 'Нет доступного промпта для генерации отчёта. Обратитесь к администратору.'
export const MSG_GENERATING_REPORT = (count: number) => `📊 Генерирую отчёт по ${count} транскрипциям...`
export const MSG_REPORT_ERROR = 'Ошибка при генерации отчёта. Попробуйте позже.'

export const MSG_REPORT_HEADER = (restaurantName: string, periodStart: string, periodEnd: string) =>
  `📊 <b>Отчёт</b>\n${restaurantName}\n${periodStart} — ${periodEnd}\n\n`

export const MSG_AUTO_REPORT_HEADER = (restaurantName: string, periodStart: string, periodEnd: string) =>
  `📊 <b>Автоматический отчёт</b>\n${restaurantName}\n${periodStart} — ${periodEnd}\n\n`

export const MSG_AUTO_DISH_ANALYSIS_HEADER = (restaurantName: string, periodStart: string, periodEnd: string) =>
  `🍽 <b>Анализ блюд по негативным отзывам</b>\n${restaurantName}\n${periodStart} — ${periodEnd}\n\n`

export const MSG_AUTO_REPORT_NO_DATA = (restaurantName: string) =>
  `📊 <b>Автоотчёт</b>\n${restaurantName}\n\n` +
  `Новых транскрипций за период нет — отчёт не сформирован.\n` +
  `Отправляйте голосовые сообщения в группу для сбора данных.`

export const MSG_AUTO_REPORT_OWNER = (restaurantName: string, periodStart: string, periodEnd: string, count: number, summary: string) =>
  `📊 <b>Новый автоотчёт</b>\n\n` +
  `Ресторан: ${restaurantName}\n` +
  `Период: ${periodStart} — ${periodEnd}\n` +
  `Транскрипций: ${count}\n\n` +
  summary

export const MSG_REPORT_SENT = 'Отчёт отправлен в группу'
export const MSG_REPORT_SEND_ERROR = (error: string) => `Не удалось отправить в группу: ${error}`

// --- ПОДПИСКА / ОПЛАТА ---

export const MSG_ORG_NOT_FOUND = 'Организация не найдена'
export const MSG_TARIFF_NOT_FOUND = 'Тариф не найден. Обратитесь к администратору.'
export const MSG_PAYMENT_ERROR = 'Произошла ошибка при создании платежа. Попробуйте позже.'
export const MSG_PAYMENT_SENT = 'Ссылка на оплату отправлена вам в личные сообщения 💬'

export const MSG_PAYMENT_LINK = (orgName: string, tariffName: string, price: number, paymentUrl: string) =>
  `💳 <b>Оплата подписки</b>\n\n` +
  `Организация: ${orgName}\n` +
  `Тариф: ${tariffName}\n` +
  `Сумма: ${price} ₽\n\n` +
  `<a href="${paymentUrl}">Перейти к оплате →</a>`

export const MSG_PAYMENT_LINK_PLAIN = (orgName: string, tariffName: string, price: number, period: number, paymentUrl: string) =>
  `💳 Оплата подписки\n\n` +
  `Организация: ${orgName}\n` +
  `Тариф: ${tariffName}\n` +
  `Сумма: ${price} ₽\n` +
  `Период: ${period} дней\n\n` +
  `👉 Оплатить: ${paymentUrl}`

// --- ТРАНСКРИПЦИЯ / ГОЛОСОВЫЕ ---

export const MSG_TRANSCRIPTION_LIMIT =
  'Достигнут лимит транскрипций для текущего тарифа.\n' +
  'Обратитесь к администратору для продления подписки.'

export const MSG_SUBSCRIPTION_EXPIRED = 'Подписка истекла. Хотите оформить подписку за 950₽ на 250 транскрипций?'
export const MSG_BILLING_DISABLED = 'Подписка отключена. Обратитесь к администратору.'

export const MSG_TRANSCRIPTION_DONE = (duration: number, preview: string) =>
  `Транскрипция (${duration}с):\n\n${preview}`

export const MSG_TRANSCRIPTION_ERROR = 'Не удалось обработать голосовое сообщение. Попробуйте ещё раз.'

export const MSG_TEXT_REVIEW_SAVED = (preview: string) =>
  `Отзыв сохранён:\n\n${preview}`

export const MSG_TEXT_REVIEW_EMPTY = 'Напишите текст отзыва после #отзыв\n\nПример: #отзыв Гость за столиком 5 похвалил пасту карбонара'

// --- ПРИМЕР ОТЧЁТА (онбординг) ---

export const MSG_EXAMPLE_REPORT =
  `📊 <b>Пример вашего будущего отчёта по устной обратной связи от гостей: CosmicMind</b>\n\n` +
  `Собрано отзывов за прошедшую неделю: 24\n\n` +
  `<b>Анализ отзыва о ресторане</b>\n\n` +
  `🍽 <b>Еда и напитки:</b>\n` +
  `• Вкус: замечания к грибам (безвкусные), наггетсы сухие, авокадо с неприятным вкусом.\n` +
  `• Температура: роллы и курица в кисло-сладком соусе подавались холодными.\n` +
  `• Прожарка: стейк приготовлен не по запросу (медиум-рэр вместо медиум).\n` +
  `• Иностранные объекты: зафиксированы случаи с волосами в роллах и салатах.\n\n` +
  `🤝 <b>Сервис:</b>\n` +
  `• Менеджеры реагировали на жалобы и предлагали решения.\n` +
  `• Были задержки подачи блюд из-за нагрузки кухни.\n\n` +
  `🕯 <b>Атмосфера:</b>\n` +
  `• Жалоб на освещение и музыку не поступало.\n` +
  `• Были единичные замечания по чистоте посуды.\n\n` +
  `🎁 <b>Программа лояльности:</b>\n` +
  `• В отзывах не упоминалась.\n\n` +
  `✨ <b>Эффект вау:</b>\n` +
  `• В ряде случаев предлагались комплименты для сглаживания негатива.\n\n` +
  `🔎 <b>Детальный разбор негативных блюд:</b>\n` +
  `1. Закуска из грибов — безвкусные.\n` +
  `2. Наггетсы — сухие.\n` +
  `3. Ролл Верона — волос на тарелке.\n` +
  `4. Курица в кисло-сладком соусе — подана холодной.\n` +
  `5. Стейк — неправильная прожарка.\n\n` +
  `Хотите начать улучшать сервис и соответствовать ожиданиям гостей? Жмите <b>«Поехали»</b>!`

// --- Кнопки ---

export const BTN_START = '🚀 СТАРТ'
export const BTN_LETS_GO = '🚀 Поехали'
export const BTN_SHARE_CONTACT = 'Поделиться номером'
export const BTN_BUY_SUBSCRIPTION = '💳 Купить подписку'
export const BTN_SELECT_TIME = '⏰ Выбрать время'
export const BTN_SAVE = '💾 Сохранить'
export const BTN_BACK_TO_DAYS = '← Назад к дням'
