#!/bin/bash

# Скрипт для горизонтального масштабирования RedGuard серверов
# Добавление новых серверов в кластер

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция для логирования
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Проверка аргументов
if [ $# -lt 3 ]; then
    echo "Использование: $0 <server-id> <server-ip> <region> [weight]"
    echo "Пример: $0 server2 192.168.1.2 us 100"
    exit 1
fi

SERVER_ID=$1
SERVER_IP=$2
SERVER_REGION=$3
SERVER_WEIGHT=${4:-100}

log "Добавление нового сервера в кластер"
info "Server ID: $SERVER_ID"
info "Server IP: $SERVER_IP"
info "Region: $SERVER_REGION"
info "Weight: $SERVER_WEIGHT"

# Проверка существования сервера
if [ -f "/opt/redguard/.env.$SERVER_ID" ]; then
    error "Сервер $SERVER_ID уже существует"
fi

# Создание конфигурации для нового сервера
log "Создание конфигурации для сервера $SERVER_ID..."

# Генерация уникальных значений
JWT_SECRET=$(openssl rand -base64 32)
VPN_SECRET=$(openssl rand -base64 32)
REDIS_PASSWORD=$(openssl rand -base64 32)
HAPROXY_STATS_PASSWORD=$(openssl rand -base64 16)
PROXY_PASS=$(openssl rand -base64 16)
VMESS_UUID=$(uuidgen)
REDIS_DISCOVERY_PASSWORD=$(openssl rand -base64 32)

# Создание .env файла для нового сервера
cat > "/opt/redguard/.env.$SERVER_ID" << EOF
# Основные настройки
NODE_ENV=production
SERVER_ID=$SERVER_ID
SERVER_HOST=localhost
SERVER_REGION=$SERVER_REGION
SERVER_WEIGHT=$SERVER_WEIGHT

# Безопасность
JWT_SECRET=$JWT_SECRET
VPN_SECRET=$VPN_SECRET
REDIS_PASSWORD=$REDIS_PASSWORD
HAPROXY_STATS_PASSWORD=$HAPROXY_STATS_PASSWORD

# Прокси настройки
PROXY_USER=proxy_user
PROXY_PASS=$PROXY_PASS

# VMess настройки
VMESS_UUID=$VMESS_UUID

# Certbot настройки
CERTBOT_EMAIL=admin@example.com

# Redis настройки
REDIS_URL=redis://redis:6379
REDIS_DISCOVERY_PASSWORD=$REDIS_DISCOVERY_PASSWORD

# Порты (уникальные для каждого сервера)
APP_PORT=$((3000 + $(echo $SERVER_ID | sed 's/server//')))
HTTP_PROXY_PORT=$((8080 + $(echo $SERVER_ID | sed 's/server//')))
SOCKS_PROXY_PORT=$((1080 + $(echo $SERVER_ID | sed 's/server//')))
VPN_PORT=443
HTTP_PORT=80
REDIS_PORT=$((6379 + $(echo $SERVER_ID | sed 's/server//')))

# Масштабирование
REPLICAS=1
CPU_LIMIT=2.0
MEMORY_LIMIT=2G
CPU_RESERVATION=0.5
MEMORY_RESERVATION=512M

# Xray настройки
XRAY_REPLICAS=1
XRAY_CPU_LIMIT=1.0
XRAY_MEMORY_LIMIT=1G

# Proxy настройки
PROXY_REPLICAS=1

# Redis настройки
REDIS_REPLICAS=1

# Сеть (уникальная подсеть для каждого сервера)
NETWORK_SUBNET=172.2$((20 + $(echo $SERVER_ID | sed 's/server//'))).0.0/16

# Discovery настройки
DISCOVERY_INTERVAL=30000
SERVER_TIMEOUT=60000
HEALTH_CHECK_INTERVAL=30000

# Логирование
LOG_LEVEL=info
EOF

log "Конфигурация создана: /opt/redguard/.env.$SERVER_ID"

# Создание docker-compose файла для нового сервера
log "Создание docker-compose файла для сервера $SERVER_ID..."

# Копирование базового файла
cp /opt/redguard/docker-compose.scale.yml "/opt/redguard/docker-compose.$SERVER_ID.yml"

# Замена переменных в docker-compose файле
sed -i "s/\${SERVER_ID:-server1}/$SERVER_ID/g" "/opt/redguard/docker-compose.$SERVER_ID.yml"
sed -i "s/\${APP_PORT:-3000}/$((3000 + $(echo $SERVER_ID | sed 's/server//')))/g" "/opt/redguard/docker-compose.$SERVER_ID.yml"
sed -i "s/\${HTTP_PROXY_PORT:-8080}/$((8080 + $(echo $SERVER_ID | sed 's/server//')))/g" "/opt/redguard/docker-compose.$SERVER_ID.yml"
sed -i "s/\${SOCKS_PROXY_PORT:-1080}/$((1080 + $(echo $SERVER_ID | sed 's/server//')))/g" "/opt/redguard/docker-compose.$SERVER_ID.yml"
sed -i "s/\${REDIS_PORT:-6379}/$((6379 + $(echo $SERVER_ID | sed 's/server//')))/g" "/opt/redguard/docker-compose.$SERVER_ID.yml"
sed -i "s/\${NETWORK_SUBNET:-172.20.0.0\/16}/172.2$((20 + $(echo $SERVER_ID | sed 's/server//'))).0.0\/16/g" "/opt/redguard/docker-compose.$SERVER_ID.yml"

log "Docker-compose файл создан: /opt/redguard/docker-compose.$SERVER_ID.yml"

# Создание systemd сервиса для нового сервера
log "Создание systemd сервиса для сервера $SERVER_ID..."

cat > "/etc/systemd/system/redguard-$SERVER_ID.service" << EOF
[Unit]
Description=RedGuard Server $SERVER_ID
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/redguard
EnvironmentFile=/opt/redguard/.env.$SERVER_ID
ExecStart=/usr/bin/docker compose -f docker-compose.$SERVER_ID.yml up -d
ExecStop=/usr/bin/docker compose -f docker-compose.$SERVER_ID.yml down
TimeoutStartSec=0
User=redguard
Group=redguard

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable "redguard-$SERVER_ID"

log "Systemd сервис создан: redguard-$SERVER_ID.service"

# Создание скрипта управления для нового сервера
log "Создание скрипта управления для сервера $SERVER_ID..."

cat > "/opt/redguard/manage-$SERVER_ID.sh" << EOF
#!/bin/bash

cd /opt/redguard

case "\$1" in
    start)
        echo "Запуск сервера $SERVER_ID..."
        docker compose -f docker-compose.$SERVER_ID.yml up -d
        ;;
    stop)
        echo "Остановка сервера $SERVER_ID..."
        docker compose -f docker-compose.$SERVER_ID.yml down
        ;;
    restart)
        echo "Перезапуск сервера $SERVER_ID..."
        docker compose -f docker-compose.$SERVER_ID.yml restart
        ;;
    status)
        echo "Статус сервера $SERVER_ID:"
        docker compose -f docker-compose.$SERVER_ID.yml ps
        ;;
    logs)
        echo "Логи сервера $SERVER_ID:"
        docker compose -f docker-compose.$SERVER_ID.yml logs -f
        ;;
    update)
        echo "Обновление сервера $SERVER_ID..."
        docker compose -f docker-compose.$SERVER_ID.yml pull
        docker compose -f docker-compose.$SERVER_ID.yml up -d
        ;;
    *)
        echo "Использование: \$0 {start|stop|restart|status|logs|update}"
        exit 1
        ;;
esac
EOF

chmod +x "/opt/redguard/manage-$SERVER_ID.sh"
chown redguard:redguard "/opt/redguard/manage-$SERVER_ID.sh"

log "Скрипт управления создан: /opt/redguard/manage-$SERVER_ID.sh"

# Обновление HAProxy конфигурации
log "Обновление HAProxy конфигурации..."

# Добавление нового сервера в HAProxy конфигурацию
HAPROXY_CONFIG="/opt/redguard/config/haproxy/haproxy.cfg"

# Создание бэкапа
cp "$HAPROXY_CONFIG" "$HAPROXY_CONFIG.backup.$(date +%Y%m%d-%H%M%S)"

# Добавление нового сервера в backend секции
sed -i "/server server3/a\\    server $SERVER_ID $SERVER_IP:80 check weight $SERVER_WEIGHT maxconn 1000" "$HAPROXY_CONFIG"
sed -i "/server server3/a\\    server $SERVER_ID $SERVER_IP:443 check weight $SERVER_WEIGHT maxconn 1000 ssl verify none" "$HAPROXY_CONFIG"
sed -i "/server server3/a\\    server $SERVER_ID $SERVER_IP:8080 check weight $SERVER_WEIGHT maxconn 1000" "$HAPROXY_CONFIG"
sed -i "/server server3/a\\    server $SERVER_ID $SERVER_IP:1080 check weight $SERVER_WEIGHT maxconn 1000" "$HAPROXY_CONFIG"

log "HAProxy конфигурация обновлена"

# Создание скрипта для удаления сервера
log "Создание скрипта удаления сервера $SERVER_ID..."

cat > "/opt/redguard/remove-$SERVER_ID.sh" << EOF
#!/bin/bash

set -e

log() {
    echo -e "\033[0;32m[$(date +'%Y-%m-%d %H:%M:%S')] \$1\033[0m"
}

error() {
    echo -e "\033[0;31m[ERROR] \$1\033[0m"
    exit 1
}

log "Удаление сервера $SERVER_ID из кластера..."

# Остановка сервисов
log "Остановка сервисов сервера $SERVER_ID..."
docker compose -f docker-compose.$SERVER_ID.yml down || true

# Удаление systemd сервиса
log "Удаление systemd сервиса..."
systemctl stop "redguard-$SERVER_ID" || true
systemctl disable "redguard-$SERVER_ID" || true
rm -f "/etc/systemd/system/redguard-$SERVER_ID.service"
systemctl daemon-reload

# Удаление конфигурационных файлов
log "Удаление конфигурационных файлов..."
rm -f "/opt/redguard/.env.$SERVER_ID"
rm -f "/opt/redguard/docker-compose.$SERVER_ID.yml"
rm -f "/opt/redguard/manage-$SERVER_ID.sh"
rm -f "/opt/redguard/remove-$SERVER_ID.sh"

# Удаление из HAProxy конфигурации
log "Удаление из HAProxy конфигурации..."
HAPROXY_CONFIG="/opt/redguard/config/haproxy/haproxy.cfg"
if [ -f "\$HAPROXY_CONFIG" ]; then
    sed -i "/server $SERVER_ID/d" "\$HAPROXY_CONFIG"
fi

# Очистка Docker ресурсов
log "Очистка Docker ресурсов..."
docker system prune -f || true

log "Сервер $SERVER_ID успешно удален из кластера"
EOF

chmod +x "/opt/redguard/remove-$SERVER_ID.sh"
chown redguard:redguard "/opt/redguard/remove-$SERVER_ID.sh"

log "Скрипт удаления создан: /opt/redguard/remove-$SERVER_ID.sh"

# Создание инструкций
log "Создание инструкций для сервера $SERVER_ID..."

cat > "/opt/redguard/README-$SERVER_ID.md" << EOF
# Сервер $SERVER_ID

## Информация о сервере

- **ID**: $SERVER_ID
- **IP**: $SERVER_IP
- **Регион**: $SERVER_REGION
- **Вес**: $SERVER_WEIGHT

## Управление

### Запуск сервера
\`\`\`bash
/opt/redguard/manage-$SERVER_ID.sh start
\`\`\`

### Остановка сервера
\`\`\`bash
/opt/redguard/manage-$SERVER_ID.sh stop
\`\`\`

### Перезапуск сервера
\`\`\`bash
/opt/redguard/manage-$SERVER_ID.sh restart
\`\`\`

### Проверка статуса
\`\`\`bash
/opt/redguard/manage-$SERVER_ID.sh status
\`\`\`

### Просмотр логов
\`\`\`bash
/opt/redguard/manage-$SERVER_ID.sh logs
\`\`\`

### Обновление сервера
\`\`\`bash
/opt/redguard/manage-$SERVER_ID.sh update
\`\`\`

## Удаление сервера

Для удаления сервера из кластера:
\`\`\`bash
/opt/redguard/remove-$SERVER_ID.sh
\`\`\`

## Порты

- **HTTP**: $((80))
- **HTTPS**: $((443))
- **App**: $((3000 + $(echo $SERVER_ID | sed 's/server//')))
- **HTTP Proxy**: $((8080 + $(echo $SERVER_ID | sed 's/server//')))
- **SOCKS Proxy**: $((1080 + $(echo $SERVER_ID | sed 's/server//')))
- **Redis**: $((6379 + $(echo $SERVER_ID | sed 's/server//')))

## Конфигурация

- **Файл конфигурации**: /opt/redguard/.env.$SERVER_ID
- **Docker Compose**: /opt/redguard/docker-compose.$SERVER_ID.yml
- **Systemd сервис**: redguard-$SERVER_ID.service
EOF

log "Инструкции созданы: /opt/redguard/README-$SERVER_ID.md"

# Финальная информация
log "Сервер $SERVER_ID успешно добавлен в кластер!"
info "Конфигурация: /opt/redguard/.env.$SERVER_ID"
info "Docker Compose: /opt/redguard/docker-compose.$SERVER_ID.yml"
info "Systemd сервис: redguard-$SERVER_ID.service"
info "Скрипт управления: /opt/redguard/manage-$SERVER_ID.sh"
info "Инструкции: /opt/redguard/README-$SERVER_ID.md"

echo
warning "Следующие шаги:"
echo "1. Скопируйте конфигурацию на новый сервер:"
echo "   scp /opt/redguard/.env.$SERVER_ID root@$SERVER_IP:/opt/redguard/.env"
echo "   scp /opt/redguard/docker-compose.$SERVER_ID.yml root@$SERVER_IP:/opt/redguard/docker-compose.yml"
echo
echo "2. На новом сервере запустите:"
echo "   cd /opt/redguard"
echo "   docker compose up -d"
echo
echo "3. Перезапустите HAProxy для применения изменений:"
echo "   docker compose -f docker-compose.loadbalancer.yml restart haproxy"
echo
echo "4. Проверьте статус нового сервера:"
echo "   curl http://localhost:3000/api/servers"

log "Скрипт масштабирования завершен!"
