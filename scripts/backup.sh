#!/bin/bash

# Скрипт резервного копирования RedGuard сервера
# Создание бэкапа конфигурации, данных и логов

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

# Настройки
BACKUP_DIR="/opt/vpn-proxy/backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_NAME="vpn-proxy-backup-$TIMESTAMP"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"
RETENTION_DAYS=30

# Создание директории для бэкапов
mkdir -p "$BACKUP_DIR"

log "Начинаем создание резервной копии RedGuard сервера"
info "Директория бэкапа: $BACKUP_PATH"
info "Время создания: $TIMESTAMP"

# Создание временной директории
mkdir -p "$BACKUP_PATH"

# Остановка сервисов для консистентного бэкапа
log "Остановка сервисов для создания консистентного бэкапа..."
cd /opt/vpn-proxy
docker compose down || true

# Ожидание полной остановки
sleep 10

# Создание бэкапа конфигурации
log "Создание бэкапа конфигурации..."
mkdir -p "$BACKUP_PATH/config"
cp -r /opt/vpn-proxy/config/* "$BACKUP_PATH/config/" 2>/dev/null || true
cp /opt/vpn-proxy/.env* "$BACKUP_PATH/" 2>/dev/null || true
cp /opt/vpn-proxy/docker-compose*.yml "$BACKUP_PATH/" 2>/dev/null || true

# Создание бэкапа данных
log "Создание бэкапа данных..."
mkdir -p "$BACKUP_PATH/data"
cp -r /opt/vpn-proxy/data/* "$BACKUP_PATH/data/" 2>/dev/null || true

# Создание бэкапа логов
log "Создание бэкапа логов..."
mkdir -p "$BACKUP_PATH/logs"
cp -r /opt/vpn-proxy/logs/* "$BACKUP_PATH/logs/" 2>/dev/null || true

# Создание бэкапа SSL сертификатов
log "Создание бэкапа SSL сертификатов..."
mkdir -p "$BACKUP_PATH/ssl"
cp -r /etc/letsencrypt/* "$BACKUP_PATH/ssl/" 2>/dev/null || true

# Создание бэкапа Docker volumes
log "Создание бэкапа Docker volumes..."
mkdir -p "$BACKUP_PATH/volumes"

# Экспорт Redis данных
log "Экспорт данных Redis..."
docker run --rm -v vpn-proxy_redis-data:/data -v "$BACKUP_PATH/volumes":/backup alpine tar czf /backup/redis-data.tar.gz -C /data . 2>/dev/null || true

# Создание информации о системе
log "Создание информации о системе..."
cat > "$BACKUP_PATH/system-info.txt" << EOF
RedGuard Server Backup Information
===================================

Backup Date: $(date)
Server ID: ${SERVER_ID:-unknown}
Hostname: $(hostname)
OS: $(lsb_release -d | cut -f2)
Kernel: $(uname -r)
Docker Version: $(docker --version)
Docker Compose Version: $(docker compose version)
Node.js Version: $(node --version 2>/dev/null || echo "Not installed")
TypeScript Version: $(tsc --version 2>/dev/null || echo "Not installed")

Disk Usage:
$(df -h)

Memory Usage:
$(free -h)

Docker Images:
$(docker images)

Docker Containers:
$(docker ps -a)

Network Configuration:
$(ip addr show)

Firewall Status:
$(ufw status)

Services Status:
$(systemctl status vpn-proxy --no-pager -l || echo "Service not found")
EOF

# Создание скрипта восстановления
log "Создание скрипта восстановления..."
cat > "$BACKUP_PATH/restore.sh" << 'EOF'
#!/bin/bash

# Скрипт восстановления RedGuard сервера из резервной копии

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

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

# Проверка прав root
if [[ $EUID -ne 0 ]]; then
   error "Этот скрипт должен быть запущен с правами root (sudo)"
fi

log "Начинаем восстановление RedGuard сервера из резервной копии"

# Остановка сервисов
log "Остановка текущих сервисов..."
cd /opt/vpn-proxy
docker compose down || true

# Восстановление конфигурации
log "Восстановление конфигурации..."
cp -r config/* /opt/vpn-proxy/config/ 2>/dev/null || true
cp .env* /opt/vpn-proxy/ 2>/dev/null || true
cp docker-compose*.yml /opt/vpn-proxy/ 2>/dev/null || true

# Восстановление данных
log "Восстановление данных..."
cp -r data/* /opt/vpn-proxy/data/ 2>/dev/null || true

# Восстановление логов
log "Восстановление логов..."
cp -r logs/* /opt/vpn-proxy/logs/ 2>/dev/null || true

# Восстановление SSL сертификатов
log "Восстановление SSL сертификатов..."
cp -r ssl/* /etc/letsencrypt/ 2>/dev/null || true

# Восстановление Docker volumes
log "Восстановление Docker volumes..."
if [ -f "volumes/redis-data.tar.gz" ]; then
    docker run --rm -v vpn-proxy_redis-data:/data -v "$(pwd)/volumes":/backup alpine tar xzf /backup/redis-data.tar.gz -C /data
fi

# Установка прав доступа
log "Установка прав доступа..."
chown -R vpn-proxy:vpn-proxy /opt/vpn-proxy
chmod 600 /opt/vpn-proxy/.env*

# Запуск сервисов
log "Запуск сервисов..."
docker compose up -d

# Ожидание готовности
log "Ожидание готовности сервисов..."
sleep 30

# Проверка статуса
log "Проверка статуса сервисов..."
docker compose ps

# Проверка health check
log "Проверка health check..."
curl -f http://localhost:3000/api/health || warning "Health check failed"

log "Восстановление завершено успешно!"
EOF

chmod +x "$BACKUP_PATH/restore.sh"

# Создание архива
log "Создание архива резервной копии..."
cd "$BACKUP_DIR"
tar -czf "$BACKUP_NAME.tar.gz" "$BACKUP_NAME"

# Удаление временной директории
rm -rf "$BACKUP_PATH"

# Проверка размера архива
ARCHIVE_SIZE=$(du -h "$BACKUP_NAME.tar.gz" | cut -f1)
log "Архив создан: $BACKUP_NAME.tar.gz (размер: $ARCHIVE_SIZE)"

# Запуск сервисов обратно
log "Запуск сервисов..."
cd /opt/vpn-proxy
docker compose up -d

# Ожидание готовности
sleep 30

# Проверка статуса
log "Проверка статуса сервисов..."
docker compose ps

# Очистка старых бэкапов
log "Очистка старых бэкапов (старше $RETENTION_DAYS дней)..."
find "$BACKUP_DIR" -name "vpn-proxy-backup-*.tar.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true

# Показать список бэкапов
log "Доступные резервные копии:"
ls -lh "$BACKUP_DIR"/vpn-proxy-backup-*.tar.gz 2>/dev/null || echo "Резервные копии не найдены"

# Создание cron задачи для автоматического бэкапа
log "Настройка автоматического бэкапа..."
cat > /etc/cron.d/vpn-proxy-backup << EOF
# Автоматический бэкап RedGuard сервера
# Каждый день в 2:00
0 2 * * * root /opt/vpn-proxy/scripts/backup.sh > /opt/vpn-proxy/logs/backup.log 2>&1
EOF

log "Автоматический бэкап настроен (каждый день в 2:00)"

# Финальная информация
log "Резервная копия создана успешно!"
info "Файл: $BACKUP_DIR/$BACKUP_NAME.tar.gz"
info "Размер: $ARCHIVE_SIZE"
info "Восстановление: tar -xzf $BACKUP_NAME.tar.gz && cd $BACKUP_NAME && ./restore.sh"

# Отправка уведомления (если настроено)
if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
    curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
        -d chat_id="$TELEGRAM_CHAT_ID" \
        -d text="🔄 RedGuard Server Backup

✅ Резервная копия создана успешно
📁 Файл: $BACKUP_NAME.tar.gz
📊 Размер: $ARCHIVE_SIZE
🕐 Время: $(date)
🖥️ Сервер: $(hostname)" \
        > /dev/null 2>&1 || true
fi

log "Скрипт резервного копирования завершен!"
