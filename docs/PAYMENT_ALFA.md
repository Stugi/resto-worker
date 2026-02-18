# Интеграция с Альфа-Банк Интернет-Эквайрингом

## Обзор

RestoWorker использует Альфа-Банк Интернет-Эквайринг для приёма платежей за подписку.
Интеграция реализована через REST API банка без использования SDK.

## Схема оплаты

```
1. Пользователь нажимает "Оплатить подписку" в админке
2. Выбирает тариф в модалке PaymentModal
3. Фронтенд вызывает POST /api/payments/create
4. Сервер создаёт заказ в Альфа-Банке (register.do)
5. Альфа-Банк возвращает formUrl — ссылку на платёжную форму
6. Фронтенд редиректит пользователя на formUrl
7. Пользователь вводит карту на защищённой странице банка
8. После оплаты банк редиректит на /payment/success?paymentId=XXX
9. Страница success вызывает POST /api/payments/check
10. Сервер проверяет статус в банке (getOrderStatusExtended.do)
11. При успехе: активирует подписку (Billing.status = ACTIVE)
```

## Конфигурация

### Переменные окружения

| Переменная | Описание | Пример |
|---|---|---|
| `ALFA_MERCHANT_LOGIN` | Логин мерчанта | `1689277459508DEMO` |
| `ALFA_MERCHANT_PASSWORD` | Пароль мерчанта | `91nx95rrueev9qvc` |
| `ALFA_API_URL` | URL API банка | `https://web.rbsuat.com/payment/rest` |
| `APP_URL` | URL приложения | `https://resto-worker.vercel.app` |

### Песочница

- **URL**: `https://web.rbsuat.com/payment/rest`
- **Тестовая карта (успех)**: `4300 0000 0000 0777`, срок 12/30, CVV 111
- **Тестовая карта (отмена/возврат)**: `4000 0000 0000 0119`, срок 12/30, CVV 111

### Продакшн

При переходе на продакшн нужно:
1. Получить боевые credentials от Альфа-Банка
2. Сменить `ALFA_API_URL` на `https://ecom.alfabank.ru/payment/rest`
3. Обновить `ALFA_MERCHANT_LOGIN` и `ALFA_MERCHANT_PASSWORD`

## API-методы банка

### register.do — Создание заказа

**URL**: `POST {baseUrl}/register.do`
**Content-Type**: `application/x-www-form-urlencoded`

| Параметр | Описание |
|---|---|
| `userName` | Логин мерчанта |
| `password` | Пароль мерчанта |
| `orderNumber` | Уникальный номер заказа (формат: `RW-{timestamp}-{id}`) |
| `amount` | Сумма в **копейках** (950 руб = 95000) |
| `returnUrl` | URL для редиректа при успехе |
| `failUrl` | URL для редиректа при ошибке |
| `description` | Описание заказа |

**Ответ (успех)**:
```json
{
  "orderId": "abc-def-123",
  "formUrl": "https://web.rbsuat.com/payment/merchants/..."
}
```

**Ответ (ошибка)**:
```json
{
  "errorCode": "1",
  "errorMessage": "Заказ с таким номером уже существует"
}
```

### getOrderStatusExtended.do — Проверка статуса

**URL**: `POST {baseUrl}/getOrderStatusExtended.do`
**Content-Type**: `application/x-www-form-urlencoded`

| Параметр | Описание |
|---|---|
| `userName` | Логин мерчанта |
| `password` | Пароль мерчанта |
| `orderId` | ID заказа от Альфа-Банка |

**Статусы заказа (orderStatus)**:

| Код | Название | Описание |
|---|---|---|
| 0 | REGISTERED | Заказ зарегистрирован, не оплачен |
| 1 | PRE_AUTHORIZED | Сумма захолдирована |
| 2 | COMPLETED | Полная авторизация проведена |
| 3 | REVERSED | Авторизация отменена |
| 4 | REFUNDED | Проведён возврат |
| 5 | AUTHORIZED_ACS | Инициирована авторизация через ACS (3D-Secure) |
| 6 | DECLINED | Авторизация отклонена |

## Файловая структура

```
server/
  utils/
    alfa-payment.ts          # Утилиты для работы с API банка
  api/
    tariffs/
      index.get.ts            # GET /api/tariffs — Список тарифов
      index.post.ts           # POST /api/tariffs — Создать тариф
      [id].patch.ts           # PATCH /api/tariffs/:id — Обновить
      [id].delete.ts          # DELETE /api/tariffs/:id — Удалить
    payments/
      index.get.ts            # GET /api/payments — История платежей
      create.post.ts          # POST /api/payments/create — Создать платёж
      check.post.ts           # POST /api/payments/check — Проверить статус

app/
  pages/
    admin/tariffs/index.vue   # Управление тарифами (SUPER_ADMIN)
    payment/
      success.vue             # Страница успешной оплаты
      fail.vue                # Страница ошибки оплаты
  components/
    TariffModal.vue           # Модалка создания/редактирования тарифа
    PaymentModal.vue          # Модалка выбора тарифа и оплаты

prisma/schema/
  tariff.prisma               # Модель Tariff
  payment.prisma              # Модель Payment + enum PaymentStatus
  billing.prisma              # Модель Billing (обновлена: tariffId, activeUntil)
```

## Модели данных

### Tariff
Справочник тарифных планов. Управляется SUPER_ADMIN через админку.

### Payment
Запись о каждом платеже. Хранит:
- Связь с организацией и тарифом
- alfaOrderId — ID заказа в банке
- alfaFormUrl — ссылка на форму оплаты
- alfaStatus — статус от банка (0-6)
- periodStart/periodEnd — период подписки

### Billing
Текущий статус подписки организации:
- `TRIAL` → Пробный период (7 дней / 100 транскрипций)
- `ACTIVE` → Подписка оплачена (activeUntil показывает до какой даты)
- `DISABLED` → Подписка отключена

## Логирование

Все операции с платежами логируются с префиксами:
- `[alfa]` — операции с API Альфа-Банка
- `[payments]` — бизнес-логика платежей
- `[tariffs]` — операции с тарифами

## Безопасность

- Credentials банка хранятся **только** в env-переменных
- Платёжная форма размещена на стороне банка (PCI DSS)
- Данные карт **не** проходят через наш сервер
- Проверка статуса делается server-side с credentials
