#!/bin/bash

# Скрипт обновления RedGuard сервера
# Автоматическое обновление с бэкапом и rollback

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
UPDATE_DIR="/opt/vpn-proxy"
BACKUP_DIR="/opt/vpn-proxy/backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_NAME="pre-update-backup-$TIMESTAMP"

# Проверка прав root
if [[ $EUID -ne 0 ]]; then
   error "Этот скрипт должен быть запущен с правами root (sudo)"
fi

log "Начинаем обновление RedGuard сервера"
info "Время обновления: $TIMESTAMP"

# Переход в директорию проекта
cd "$UPDATE_DIR"

# Создание бэкапа перед обновлением
log "Создание бэкапа перед обновлением..."
mkdir -p "$BACKUP_DIR"
tar -czf "$BACKUP_DIR/$BACKUP_NAME.tar.gz" \
    --exclude="node_modules" \
    --exclude=".git" \
    --exclude="backups" \
    --exclude="logs" \
    . 2>/dev/null || true

log "Бэкап создан: $BACKUP_DIR/$BACKUP_NAME.tar.gz"

# Остановка сервисов
log "Остановка сервисов..."
docker compose down || true

# Ожидание полной остановки
sleep 10

# Обновление из Git (если репозиторий настроен)
if [ -d ".git" ]; then
    log "Обновление из Git репозитория..."
    
    # Сохранение локальных изменений
    git stash push -m "Auto-stash before update $TIMESTAMP" || true
    
    # Получение обновлений
    git fetch origin
    
    # Проверка изменений
    LOCAL=$(git rev-parse HEAD)
    REMOTE=$(git rev-parse origin/main)
    
    if [ "$LOCAL" = "$REMOTE" ]; then
        warning "Нет новых обновлений в репозитории"
    else
        log "Найдены новые обновления. Применяем..."
        git reset --hard origin/main
        log "Код обновлен до версии: $(git rev-parse --short HEAD)"
    fi
else
    warning "Git репозиторий не настроен. Пропускаем обновление кода."
fi

# Обновление зависимостей Node.js
if [ -f "package.json" ]; then
    log "Обновление зависимостей Node.js..."
    npm install --production || true
fi

# Обновление Docker образов
log "Обновление Docker образов..."
docker compose pull

# Пересборка локальных образов
log "Пересборка локальных образов..."
docker compose build --no-cache

# Очистка неиспользуемых образов
log "Очистка неиспользуемых Docker образов..."
docker image prune -f || true

# Запуск сервисов
log "Запуск обновленных сервисов..."
docker compose up -d

# Ожидание готовности сервисов
log "Ожидание готовности сервисов..."
sleep 30

# Проверка статуса сервисов
log "Проверка статуса сервисов..."
docker compose ps

# Проверка health check
log "Проверка health check..."
HEALTH_CHECK_ATTEMPTS=0
MAX_HEALTH_CHECK_ATTEMPTS=10

while [ $HEALTH_CHECK_ATTEMPTS -lt $MAX_HEALTH_CHECK_ATTEMPTS ]; do
    if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
        log "Health check прошел успешно"
        break
    else
        HEALTH_CHECK_ATTEMPTS=$((HEALTH_CHECK_ATTEMPTS + 1))
        warning "Health check не прошел (попытка $HEALTH_CHECK_ATTEMPTS/$MAX_HEALTH_CHECK_ATTEMPTS)"
        sleep 10
    fi
done

# Если health check не прошел, выполняем rollback
if [ $HEALTH_CHECK_ATTEMPTS -eq $MAX_HEALTH_CHECK_ATTEMPTS ]; then
    error "Health check не прошел после $MAX_HEALTH_CHECK_ATTEMPTS попыток. Выполняем rollback..."
    
    log "Выполнение rollback..."
    
    # Остановка сервисов
    docker compose down || true
    
    # Восстановление из бэкапа
    if [ -f "$BACKUP_DIR/$BACKUP_NAME.tar.gz" ]; then
        log "Восстановление из бэкапа: $BACKUP_NAME.tar.gz"
        tar -xzf "$BACKUP_DIR/$BACKUP_NAME.tar.gz"
        
        # Запуск сервисов
        docker compose up -d
        
        # Ожидание готовности
        sleep 30
        
        # Проверка восстановления
        if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
            log "Rollback выполнен успешно"
        else
            error "Rollback не удался. Требуется ручное вмешательство."
        fi
    else
        error "Бэкап не найден. Требуется ручное вмешательство."
    fi
    
    exit 1
fi

# Проверка логов на ошибки
log "Проверка логов на ошибки..."
ERROR_COUNT=$(docker compose logs --since="5m" | grep -i "error\|exception\|fatal" | wc -l)

if [ $ERROR_COUNT -gt 0 ]; then
    warning "Найдено $ERROR_COUNT ошибок в логах за последние 5 минут"
    docker compose logs --since="5m" | grep -i "error\|exception\|fatal" | tail -10
fi

# Обновление systemd сервиса
log "Обновление systemd сервиса..."
systemctl daemon-reload
systemctl enable vpn-proxy

# Проверка версий
log "Проверка версий компонентов..."
info "Docker версия: $(docker --version)"
info "Docker Compose версия: $(docker compose version)"
if command -v node &> /dev/null; then
    info "Node.js версия: $(node --version)"
fi
if command -v tsc &> /dev/null; then
    info "TypeScript версия: $(tsc --version)"
fi

# Создание отчета об обновлении
log "Создание отчета об обновлении..."
cat > "/opt/vpn-proxy/update-report-$TIMESTAMP.txt" << EOF
RedGuard Server Update Report
==============================

Update Date: $(date)
Update Time: $TIMESTAMP
Server ID: ${SERVER_ID:-unknown}
Hostname: $(hostname)

Pre-Update Backup: $BACKUP_NAME.tar.gz

Components Updated:
- Docker Images: Updated
- Node.js Dependencies: Updated
- Application Code: Updated (if Git repo configured)

Post-Update Status:
- Services: $(docker compose ps --format "table {{.Name}}\t{{.Status}}" | tail -n +2)
- Health Check: Passed
- Errors in Logs: $ERROR_COUNT

Docker Images:
$(docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}")

System Resources:
$(df -h | head -1)
$(df -h | grep -E "(/$|/opt)")

Memory Usage:
$(free -h)

Network Status:
$(netstat -tlnp | grep -E ':(80|443|8080|1080|3000|6379|8404)')

Update completed successfully!
EOF

log "Отчет об обновлении создан: /opt/vpn-proxy/update-report-$TIMESTAMP.txt"

# Очистка старых отчетов (старше 30 дней)
find /opt/vpn-proxy -name "update-report-*.txt" -mtime +30 -delete 2>/dev/null || true

# Отправка уведомления об успешном обновлении
if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
    curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
        -d chat_id="$TELEGRAM_CHAT_ID" \
        -d text="🔄 RedGuard Server Update

✅ Обновление завершено успешно
🕐 Время: $(date)
🖥️ Сервер: $(hostname)
📊 Ошибок в логах: $ERROR_COUNT
💾 Бэкап: $BACKUP_NAME.tar.gz" \
        > /dev/null 2>&1 || true
fi

# Финальная информация
log "Обновление RedGuard сервера завершено успешно!"
info "Время обновления: $TIMESTAMP"
info "Бэкап: $BACKUP_DIR/$BACKUP_NAME.tar.gz"
info "Отчет: /opt/vpn-proxy/update-report-$TIMESTAMP.txt"
info "Ошибок в логах: $ERROR_COUNT"

# Показать статус сервисов
echo
log "Текущий статус сервисов:"
docker compose ps

log "Скрипт обновления завершен!"
