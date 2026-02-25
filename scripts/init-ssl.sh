#!/bin/bash
# ============================================
# CosmicMind AI — Получение SSL-сертификата Let's Encrypt
# Запуск: chmod +x scripts/init-ssl.sh && ./scripts/init-ssl.sh
# ============================================

set -e

DOMAIN="lk.cosmicmind.ru"
EMAIL="admin@cosmicmind.ru"
COMPOSE_FILE="docker-compose.production.yml"

echo ""
echo "🔒 Настройка SSL для $DOMAIN"
echo "=================================="

# 1. Создать директории
echo "📁 Создаю директории..."
mkdir -p certbot/conf certbot/www

# 2. Проверить, есть ли уже сертификат
if [ -f "certbot/conf/live/$DOMAIN/fullchain.pem" ]; then
    echo "✅ Сертификат уже существует! Пропускаю."
    exit 0
fi

# 3. Скачать рекомендуемые параметры TLS
if [ ! -f "certbot/conf/options-ssl-nginx.conf" ]; then
    echo "📥 Скачиваю параметры TLS..."
    curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf > certbot/conf/options-ssl-nginx.conf
fi

if [ ! -f "certbot/conf/ssl-dhparams.pem" ]; then
    echo "📥 Скачиваю DH параметры..."
    curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem > certbot/conf/ssl-dhparams.pem
fi

# 4. Создать временный самоподписанный сертификат (чтобы nginx мог стартовать)
echo "🔑 Создаю временный сертификат..."
mkdir -p "certbot/conf/live/$DOMAIN"
openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout "certbot/conf/live/$DOMAIN/privkey.pem" \
    -out "certbot/conf/live/$DOMAIN/fullchain.pem" \
    -subj "/CN=$DOMAIN" 2>/dev/null

# 5. Запустить nginx (и db, чтобы app мог стартовать)
echo "🚀 Запускаю nginx..."
docker compose -f $COMPOSE_FILE up -d nginx

# Подождать пока nginx стартует
echo "⏳ Жду запуска nginx..."
sleep 5

# 6. Удалить временный сертификат
echo "🗑️  Удаляю временный сертификат..."
rm -rf "certbot/conf/live/$DOMAIN"
rm -rf "certbot/conf/archive/$DOMAIN"
rm -rf "certbot/conf/renewal/$DOMAIN.conf"

# 7. Получить реальный сертификат Let's Encrypt
echo "📜 Получаю сертификат Let's Encrypt..."
docker compose -f $COMPOSE_FILE run --rm certbot certonly \
    --webroot \
    -w /var/www/certbot \
    --email $EMAIL \
    -d $DOMAIN \
    --agree-tos \
    --no-eff-email \
    --force-renewal

# 8. Перезагрузить nginx с реальным сертификатом
echo "🔄 Перезагружаю nginx..."
docker compose -f $COMPOSE_FILE exec nginx nginx -s reload

echo ""
echo "✅ SSL-сертификат для $DOMAIN успешно получен!"
echo "🌐 Сайт доступен по https://$DOMAIN"
echo ""
