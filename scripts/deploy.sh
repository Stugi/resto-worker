#!/bin/bash
# ============================================
# CosmicMind AI — Полная настройка VPS-сервера
# Запуск на СВЕЖЕМ сервере (Ubuntu 22.04/24.04):
#   curl -fsSL https://raw.githubusercontent.com/<REPO>/main/scripts/deploy.sh | bash
# Или после клонирования:
#   chmod +x scripts/deploy.sh && ./scripts/deploy.sh
# ============================================

set -e

APP_DIR="/opt/cosmicmind"
REPO_URL="https://github.com/Stugi/resto-worker.git"
COMPOSE_FILE="docker-compose.production.yml"

echo ""
echo "🚀 CosmicMind AI — Настройка сервера"
echo "======================================"
echo ""

# ─── 1. Обновление системы ───
echo "📦 [1/8] Обновляю систему..."
apt update -y && apt upgrade -y

# ─── 2. Установка Docker ───
echo "🐳 [2/8] Устанавливаю Docker..."
if command -v docker &> /dev/null; then
    echo "  Docker уже установлен: $(docker --version)"
else
    apt install -y ca-certificates curl gnupg
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt update -y
    apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    echo "  ✅ Docker установлен: $(docker --version)"
fi

# ─── 3. Установка Git ───
echo "📋 [3/8] Устанавливаю Git..."
if command -v git &> /dev/null; then
    echo "  Git уже установлен: $(git --version)"
else
    apt install -y git
    echo "  ✅ Git установлен"
fi

# ─── 4. Firewall ───
echo "🔥 [4/8] Настраиваю firewall..."
apt install -y ufw
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw --force enable
echo "  ✅ Firewall: SSH (22), HTTP (80), HTTPS (443)"

# ─── 5. Клонирование проекта ───
echo "📥 [5/8] Клонирую проект..."
if [ -d "$APP_DIR" ]; then
    echo "  Директория $APP_DIR уже существует, обновляю..."
    cd "$APP_DIR"
    git pull
else
    git clone "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
fi
echo "  ✅ Проект в $APP_DIR"

# ─── 6. Настройка .env ───
echo "⚙️  [6/8] Настраиваю .env..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo ""
    echo "  ⚠️  ВАЖНО: Нужно заполнить .env файл!"
    echo "  Открой в редакторе:"
    echo ""
    echo "    nano $APP_DIR/.env"
    echo ""
    echo "  Обязательные переменные:"
    echo "    POSTGRES_PASSWORD   — придумай сложный пароль для БД"
    echo "    SESSION_SECRET      — длинная случайная строка (64+ символов)"
    echo "    TELEGRAM_BOT_TOKEN  — токен от @BotFather"
    echo "    TELEGRAM_BOT_USERNAME — имя бота (без @)"
    echo "    OPENAI_API_KEY      — ключ OpenAI"
    echo "    APP_URL             — https://lk.cosmicmind.ru"
    echo "    CRON_SECRET         — секрет для cron-эндпоинта"
    echo ""
    echo "  После заполнения .env запусти:"
    echo ""
    echo "    cd $APP_DIR && ./scripts/start.sh"
    echo ""
    exit 0
else
    echo "  ✅ .env уже существует"
fi

# ─── 7. Получение SSL ───
echo "🔒 [7/8] Получаю SSL-сертификат..."
chmod +x scripts/init-ssl.sh scripts/backup-db.sh
./scripts/init-ssl.sh

# ─── 8. Запуск приложения ───
echo "🚀 [8/8] Собираю и запускаю приложение..."
docker compose -f $COMPOSE_FILE up -d --build

# ─── Настройка crontab ───
echo "⏰ Настраиваю автоматические задачи..."

# Проверить, есть ли уже наши задачи в crontab
if ! crontab -l 2>/dev/null | grep -q "cosmicmind"; then
    (crontab -l 2>/dev/null; echo "") | crontab -
    (crontab -l 2>/dev/null; echo "# === CosmicMind AI ===") | crontab -
    (crontab -l 2>/dev/null; echo "# Бэкап БД каждый день в 3:00") | crontab -
    (crontab -l 2>/dev/null; echo "0 3 * * * cd $APP_DIR && ./scripts/backup-db.sh >> backups/cron.log 2>&1") | crontab -
    (crontab -l 2>/dev/null; echo "# Перезагрузка nginx (обновление SSL) каждые 12 часов") | crontab -
    (crontab -l 2>/dev/null; echo "0 */12 * * * docker compose -f $APP_DIR/$COMPOSE_FILE exec -T nginx nginx -s reload 2>/dev/null") | crontab -
    (crontab -l 2>/dev/null; echo "# Автоотчёты каждые 15 минут") | crontab -
    (crontab -l 2>/dev/null; echo "*/15 * * * * curl -sS https://lk.cosmicmind.ru/api/cron/reports?secret=\$(grep CRON_SECRET $APP_DIR/.env | cut -d= -f2) > /dev/null 2>&1") | crontab -
    echo "  ✅ Crontab настроен"
else
    echo "  Crontab уже настроен, пропускаю"
fi

echo ""
echo "======================================"
echo "✅ CosmicMind AI успешно развёрнут!"
echo "======================================"
echo ""
echo "🌐 Сайт:     https://lk.cosmicmind.ru"
echo "📊 Статус:    docker compose -f $COMPOSE_FILE ps"
echo "📋 Логи:     docker compose -f $COMPOSE_FILE logs -f"
echo "💾 Бэкап:    ./scripts/backup-db.sh"
echo ""
echo "⚡ Следующие шаги:"
echo "  1. Установи webhook Telegram бота:"
echo "     curl \"https://api.telegram.org/bot<ТОКЕН>/setWebhook?url=https://lk.cosmicmind.ru/api/bot/webhook\""
echo ""
echo "  2. Проверь что сайт открывается:"
echo "     curl -I https://lk.cosmicmind.ru"
echo ""
