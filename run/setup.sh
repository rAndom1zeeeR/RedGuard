#!/bin/bash

# Скрипт установки RedGuard сервера на Ubuntu 22.04.5 LTS
# Автоматическая установка Docker, Node.js и настройка системы

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

# Проверка прав root
if [[ $EUID -ne 0 ]]; then
   error "Этот скрипт должен быть запущен с правами root (sudo)"
fi

# Проверка версии Ubuntu
if ! grep -q "22.04" /etc/os-release; then
    warning "Этот скрипт предназначен для Ubuntu 22.04.5 LTS"
    read -p "Продолжить установку? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

log "Начинаем установку RedGuard сервера на Ubuntu 22.04.5 LTS"

# Обновление системы
log "Обновление системы..."
apt update && apt upgrade -y

# Установка необходимых пакетов
log "Установка базовых пакетов..."
apt install -y \
    curl \
    wget \
    git \
    unzip \
    ca-certificates \
    gnupg \
    lsb-release \
    software-properties-common \
    apt-transport-https \
    ufw \
    fail2ban \
    htop \
    nano \
    vim

# Установка Docker
log "Установка Docker..."
if ! command -v docker &> /dev/null; then
    # Удаление старых версий Docker
    apt remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true
    
    # Добавление Docker GPG ключа
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    
    # Добавление Docker репозитория
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Обновление пакетов и установка Docker
    apt update
    apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    
    # Запуск и включение Docker
    systemctl start docker
    systemctl enable docker
    
    log "Docker установлен успешно"
else
    log "Docker уже установлен"
fi

# Установка Docker Compose
log "Проверка Docker Compose..."
if ! docker compose version &> /dev/null; then
    error "Docker Compose не найден. Установите Docker Compose plugin."
else
    log "Docker Compose доступен"
fi

# Установка Node.js 18 LTS
log "Установка Node.js 18 LTS..."
if ! command -v node &> /dev/null; then
    # Добавление NodeSource репозитория
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    
    # Установка Node.js
    apt install -y nodejs
    
    log "Node.js установлен успешно"
else
    log "Node.js уже установлен: $(node --version)"
fi

# Установка TypeScript глобально
log "Установка TypeScript..."
npm install -g typescript

# Создание пользователя для приложения
log "Создание пользователя vpn-proxy..."
if ! id "vpn-proxy" &>/dev/null; then
    useradd -r -s /bin/false -d /opt/vpn-proxy vpn-proxy
    usermod -aG docker vpn-proxy
    log "Пользователь vpn-proxy создан"
else
    log "Пользователь vpn-proxy уже существует"
fi

# Создание директорий
log "Создание директорий..."
mkdir -p /opt/vpn-proxy/{logs,data,config,ssl}
mkdir -p /opt/vpn-proxy/config/{nginx,haproxy,xray,certbot,proxy}
mkdir -p /etc/letsencrypt

# Установка прав доступа
chown -R vpn-proxy:vpn-proxy /opt/vpn-proxy
chmod 755 /opt/vpn-proxy

# Настройка UFW firewall
log "Настройка UFW firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing

# Разрешение SSH
ufw allow ssh

# Разрешение портов для RedGuard
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 8080/tcp
ufw allow 1080/tcp
ufw allow 3000/tcp
ufw allow 6379/tcp
ufw allow 8404/tcp

# Включение UFW
ufw --force enable

log "UFW firewall настроен"

# Настройка fail2ban
log "Настройка fail2ban..."
cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 10
EOF

systemctl restart fail2ban
systemctl enable fail2ban

log "Fail2ban настроен"

# Настройка systemd для автозапуска
log "Создание systemd сервиса..."
cat > /etc/systemd/system/vpn-proxy.service << EOF
[Unit]
Description=RedGuard Server
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/vpn-proxy
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=0
User=vpn-proxy
Group=vpn-proxy

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable vpn-proxy

log "Systemd сервис создан"

# Создание .env файла
log "Создание конфигурационного файла..."
cat > /opt/vpn-proxy/.env << EOF
# Основные настройки
NODE_ENV=production
SERVER_ID=server1
DOMAIN=localhost
SERVER_REGION=eu
SERVER_WEIGHT=100

# Безопасность
JWT_SECRET=$(openssl rand -base64 32)
VPN_SECRET=$(openssl rand -base64 32)
REDIS_PASSWORD=$(openssl rand -base64 32)
HAPROXY_STATS_PASSWORD=$(openssl rand -base64 16)

# Прокси настройки
PROXY_USER=proxy_user
PROXY_PASS=$(openssl rand -base64 16)

# VMess настройки
VMESS_UUID=$(uuidgen)

# Certbot настройки
CERTBOT_EMAIL=admin@example.com

# Redis настройки
REDIS_URL=redis://redis:6379
REDIS_DISCOVERY_PASSWORD=$(openssl rand -base64 32)

# Порты
APP_PORT=3000
HTTP_PROXY_PORT=8080
SOCKS_PROXY_PORT=1080
VPN_PORT=443
HTTP_PORT=80
REDIS_PORT=6379

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

# Сеть
NETWORK_SUBNET=172.20.0.0/16

# Discovery настройки
DISCOVERY_INTERVAL=30000
SERVER_TIMEOUT=60000
HEALTH_CHECK_INTERVAL=30000

# Логирование
LOG_LEVEL=info
EOF

chown vpn-proxy:vpn-proxy /opt/vpn-proxy/.env
chmod 600 /opt/vpn-proxy/.env

log "Конфигурационный файл создан"

# Создание скрипта обновления
log "Создание скрипта обновления..."
cat > /opt/vpn-proxy/update.sh << 'EOF'
#!/bin/bash
set -e

cd /opt/vpn-proxy

log() {
    echo -e "\033[0;32m[$(date +'%Y-%m-%d %H:%M:%S')] $1\033[0m"
}

log "Начинаем обновление RedGuard сервера..."

# Остановка сервисов
log "Остановка сервисов..."
docker compose down

# Создание бэкапа
log "Создание бэкапа..."
tar -czf backup-$(date +%Y%m%d-%H%M%S).tar.gz logs/ data/ config/ .env

# Обновление из Git (если репозиторий настроен)
if [ -d ".git" ]; then
    log "Обновление из Git..."
    git pull origin main
fi

# Пересборка образов
log "Пересборка Docker образов..."
docker compose build --no-cache

# Запуск сервисов
log "Запуск сервисов..."
docker compose up -d

# Проверка статуса
log "Проверка статуса сервисов..."
docker compose ps

log "Обновление завершено успешно!"
EOF

chmod +x /opt/vpn-proxy/update.sh
chown vpn-proxy:vpn-proxy /opt/vpn-proxy/update.sh

# Создание скрипта мониторинга
log "Создание скрипта мониторинга..."
cat > /opt/vpn-proxy/monitor.sh << 'EOF'
#!/bin/bash

cd /opt/vpn-proxy

log() {
    echo -e "\033[0;32m[$(date +'%Y-%m-%d %H:%M:%S')] $1\033[0m"
}

error() {
    echo -e "\033[0;31m[ERROR] $1\033[0m"
}

log "Проверка статуса RedGuard сервера..."

# Проверка Docker
if ! systemctl is-active --quiet docker; then
    error "Docker не запущен"
    exit 1
fi

# Проверка контейнеров
log "Статус контейнеров:"
docker compose ps

# Проверка логов
log "Последние логи:"
docker compose logs --tail=10

# Проверка ресурсов
log "Использование ресурсов:"
docker stats --no-stream

# Проверка портов
log "Открытые порты:"
netstat -tlnp | grep -E ':(80|443|8080|1080|3000|6379|8404)'

log "Мониторинг завершен"
EOF

chmod +x /opt/vpn-proxy/monitor.sh
chown vpn-proxy:vpn-proxy /opt/vpn-proxy/monitor.sh

# Настройка cron для автоматических задач
log "Настройка cron задач..."
cat > /etc/cron.d/vpn-proxy << EOF
# RedGuard Server автоматические задачи
# Обновление сертификатов каждые 12 часов
0 */12 * * * vpn-proxy cd /opt/vpn-proxy && docker compose exec certbot certbot renew --quiet && docker compose restart nginx

# Очистка логов каждую неделю
0 2 * * 0 vpn-proxy find /opt/vpn-proxy/logs -name "*.log" -mtime +7 -delete

# Проверка здоровья каждые 5 минут
*/5 * * * * vpn-proxy /opt/vpn-proxy/monitor.sh > /dev/null 2>&1
EOF

log "Cron задачи настроены"

# Финальная настройка
log "Финальная настройка..."

# Установка прав на Docker socket
usermod -aG docker vpn-proxy

# Создание символической ссылки для удобства
ln -sf /opt/vpn-proxy /home/vpn-proxy 2>/dev/null || true

log "Установка завершена успешно!"
log "Конфигурация сохранена в /opt/vpn-proxy/.env"
log "Для запуска сервера выполните: cd /opt/vpn-proxy && docker compose up -d"
log "Для мониторинга: /opt/vpn-proxy/monitor.sh"
log "Для обновления: /opt/vpn-proxy/update.sh"

# Показать информацию о системе
info "Информация о системе:"
echo "Docker версия: $(docker --version)"
echo "Docker Compose версия: $(docker compose version)"
echo "Node.js версия: $(node --version)"
echo "NPM версия: $(npm --version)"
echo "TypeScript версия: $(tsc --version)"
echo "UFW статус: $(ufw status | head -1)"
echo "Fail2ban статус: $(systemctl is-active fail2ban)"

log "Скрипт установки завершен!"
