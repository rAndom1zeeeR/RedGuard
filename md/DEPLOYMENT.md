# Руководство по развертыванию RedGuard Server

Полное руководство по развертыванию RedGuard сервера с горизонтальным масштабированием на Ubuntu 22.04.5 LTS.

## 🚀 Быстрый старт

### 1. Автоматическая установка

```bash
# Скачивание и запуск скрипта установки
curl -fsSL https://raw.githubusercontent.com/your-repo/vpn-proxy-server/main/setup.sh | sudo bash
```

### 2. Ручная установка

```bash
# Клонирование репозитория
git clone https://github.com/your-repo/vpn-proxy-server.git
cd vpn-proxy-server

# Запуск скрипта установки
sudo ./setup.sh
```

## 📋 Предварительные требования

### Системные требования

- **ОС**: Ubuntu 22.04.5 LTS (Jammy Jellyfish)
- **RAM**: Минимум 2GB, рекомендуется 4GB+
- **Диск**: Минимум 20GB свободного места
- **CPU**: 2+ ядра
- **Сеть**: Статический IP адрес

### Порты

Убедитесь, что следующие порты открыты:

- **80** - HTTP (Let's Encrypt challenge)
- **443** - HTTPS/VPN
- **8080** - HTTP прокси
- **1080** - SOCKS5 прокси
- **3000** - Next.js приложение
- **6379** - Redis
- **8404** - HAProxy статистика

## ⚙️ Конфигурация

### 1. Основные настройки

Отредактируйте файл `.env`:

```bash
nano /opt/vpn-proxy/.env
```

Основные параметры:

```env
# Основные настройки
NODE_ENV=production
SERVER_ID=server1
SERVER_HOST=your-domain.com
SERVER_REGION=eu
SERVER_WEIGHT=100

# Безопасность
JWT_SECRET=your-jwt-secret-here
VPN_SECRET=your-vpn-secret-here
REDIS_PASSWORD=your-redis-password-here

# Прокси настройки
PROXY_USER=proxy_user
PROXY_PASS=your-proxy-password-here

# VMess настройки
VMESS_UUID=your-vmess-uuid-here

# Certbot настройки
CERTBOT_EMAIL=admin@your-domain.com
```

### 2. Генерация секретов

```bash
# Генерация JWT секрета
openssl rand -base64 32

# Генерация VPN секрета
openssl rand -base64 32

# Генерация Redis пароля
openssl rand -base64 32

# Генерация VMess UUID
uuidgen
```

## 🐳 Запуск сервисов

### 1. Основной сервер

```bash
cd /opt/vpn-proxy
docker compose up -d
```

### 2. С масштабированием

```bash
# Запуск с масштабированием
docker compose -f docker-compose.scale.yml up -d
```

### 3. Load Balancer

```bash
# Запуск load balancer
docker compose -f docker-compose.loadbalancer.yml up -d
```

## 📈 Масштабирование

### Добавление нового сервера

```bash
# Использование скрипта масштабирования
./scripts/scale.sh server2 192.168.1.2 us 100
```

### Ручное добавление

1. **Создание конфигурации**:

```bash
# Копирование конфигурации
cp .env .env.server2

# Редактирование для нового сервера
nano .env.server2
```

2. **Настройка портов**:

```bash
# Уникальные порты для каждого сервера
APP_PORT=3001
HTTP_PROXY_PORT=8081
SOCKS_PROXY_PORT=1081
REDIS_PORT=6380
```

3. **Запуск на новом сервере**:

```bash
# На новом сервере
cd /opt/vpn-proxy
docker compose -f docker-compose.scale.yml up -d
```

## 🔧 Управление

### Основные команды

```bash
# Запуск сервисов
docker compose up -d

# Остановка сервисов
docker compose down

# Перезапуск сервисов
docker compose restart

# Просмотр статуса
docker compose ps

# Просмотр логов
docker compose logs -f

# Обновление образов
docker compose pull
docker compose up -d
```

### Systemd управление

```bash
# Запуск через systemd
sudo systemctl start vpn-proxy

# Остановка через systemd
sudo systemctl stop vpn-proxy

# Автозапуск
sudo systemctl enable vpn-proxy

# Статус
sudo systemctl status vpn-proxy
```

### Скрипты управления

```bash
# Обновление
./scripts/update.sh

# Резервное копирование
./scripts/backup.sh

# Масштабирование
./scripts/scale.sh server2 192.168.1.2 us 100

# Мониторинг
./monitor.sh
```

## 🔒 SSL сертификаты

### Получение сертификата

```bash
# Получение сертификата для домена
docker compose exec certbot certbot certonly \
  --webroot -w /var/www/html \
  -d your-domain.com \
  --email admin@your-domain.com \
  --agree-tos \
  --no-eff-email
```

### Автоматическое обновление

```bash
# Настройка cron для обновления сертификатов
echo "0 2 * * * root docker compose exec certbot certbot renew --quiet && docker compose restart nginx" | sudo tee -a /etc/cron.d/certbot-renew
```

## 📊 Мониторинг

### Health Check

```bash
# Проверка состояния API
curl http://localhost:3000/api/health

# Проверка серверов
curl http://localhost:3000/api/servers

# Проверка метрик
curl http://localhost:3000/api/servers/server1/metrics
```

### HAProxy статистика

```bash
# Доступ к статистике HAProxy
curl http://localhost:8404/stats

# Веб-интерфейс
http://localhost:8404/stats
```

### Логи

```bash
# Просмотр логов приложения
tail -f /opt/vpn-proxy/logs/app-$(date +%Y-%m-%d).log

# Просмотр логов ошибок
tail -f /opt/vpn-proxy/logs/error-$(date +%Y-%m-%d).log

# Просмотр логов доступа
tail -f /opt/vpn-proxy/logs/access-$(date +%Y-%m-%d).log
```

## 🔄 GitHub Actions

### Настройка автоматического деплоя

1. **Добавление Secrets в GitHub**:

```
# Для каждого сервера
SERVER1_HOST=192.168.1.1
SERVER1_USERNAME=root
SERVER1_SSH_KEY=your-ssh-private-key
SERVER1_PORT=22

SERVER2_HOST=192.168.1.2
SERVER2_USERNAME=root
SERVER2_SSH_KEY=your-ssh-private-key
SERVER2_PORT=22

# Уведомления
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_CHAT_ID=your-telegram-chat-id
DISCORD_WEBHOOK_URL=your-discord-webhook-url
```

2. **Настройка SSH ключей**:

```bash
# Генерация SSH ключа
ssh-keygen -t rsa -b 4096 -C "github-actions"

# Копирование публичного ключа на сервер
ssh-copy-id -i ~/.ssh/id_rsa.pub root@192.168.1.1

# Добавление приватного ключа в GitHub Secrets
cat ~/.ssh/id_rsa
```

### Процесс деплоя

1. **Push в main ветку** запускает CI/CD pipeline
2. **TypeScript проверка** и линтинг
3. **Сборка Next.js** приложения
4. **Сборка Docker** образов
5. **Автоматический деплой** на все серверы
6. **Уведомления** в Telegram/Discord

## 🛠 Устранение неполадок

### Проблемы с Docker

```bash
# Очистка Docker
docker system prune -a

# Пересборка образов
docker compose build --no-cache

# Проверка логов
docker compose logs
```

### Проблемы с Redis

```bash
# Проверка подключения
docker compose exec redis redis-cli ping

# Очистка данных
docker compose exec redis redis-cli flushall

# Перезапуск Redis
docker compose restart redis
```

### Проблемы с сертификатами

```bash
# Проверка сертификатов
docker compose exec certbot certbot certificates

# Принудительное обновление
docker compose exec certbot certbot renew --force-renewal

# Проверка конфигурации nginx
docker compose exec nginx nginx -t
```

### Проблемы с сетью

```bash
# Проверка портов
netstat -tlnp | grep -E ':(80|443|8080|1080|3000|6379|8404)'

# Проверка firewall
sudo ufw status

# Проверка DNS
nslookup your-domain.com
```

### Проблемы с производительностью

```bash
# Мониторинг ресурсов
docker stats

# Проверка дискового пространства
df -h

# Проверка памяти
free -h

# Проверка нагрузки
htop
```

## 🔐 Безопасность

### Firewall (UFW)

```bash
# Просмотр правил
sudo ufw status

# Добавление правил
sudo ufw allow 443/tcp
sudo ufw allow 8080/tcp

# Удаление правил
sudo ufw delete allow 22/tcp
```

### Fail2ban

```bash
# Просмотр статуса
sudo fail2ban-client status

# Просмотр заблокированных IP
sudo fail2ban-client status sshd

# Разблокировка IP
sudo fail2ban-client set sshd unbanip 192.168.1.100
```

### Обновление системы

```bash
# Обновление пакетов
sudo apt update && sudo apt upgrade -y

# Обновление Docker
sudo apt install docker-ce docker-ce-cli containerd.io

# Обновление Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

## 📝 Логирование

### Настройка логов

```bash
# Просмотр логов systemd
sudo journalctl -u vpn-proxy -f

# Просмотр логов Docker
docker compose logs -f

# Ротация логов
sudo logrotate -f /etc/logrotate.d/vpn-proxy
```

### Мониторинг логов

```bash
# Мониторинг ошибок
tail -f /opt/vpn-proxy/logs/error-*.log | grep -i error

# Мониторинг доступа
tail -f /opt/vpn-proxy/logs/access-*.log | grep -E "(GET|POST)"

# Статистика логов
grep -c "ERROR" /opt/vpn-proxy/logs/error-*.log
```

## 🚀 Производительность

### Оптимизация Docker

```bash
# Ограничение ресурсов
docker compose up -d --scale app=2

# Мониторинг ресурсов
docker stats --no-stream

# Очистка неиспользуемых ресурсов
docker system prune -a
```

### Оптимизация Redis

```bash
# Настройка Redis
docker compose exec redis redis-cli config set maxmemory 512mb
docker compose exec redis redis-cli config set maxmemory-policy allkeys-lru

# Мониторинг Redis
docker compose exec redis redis-cli info memory
```

### Оптимизация Nginx

```bash
# Проверка конфигурации
docker compose exec nginx nginx -t

# Перезагрузка конфигурации
docker compose exec nginx nginx -s reload

# Мониторинг соединений
docker compose exec nginx nginx -s status
```

## 📞 Поддержка

### Полезные команды

```bash
# Полная диагностика
./monitor.sh

# Проверка всех сервисов
docker compose ps
curl http://localhost:3000/api/health

# Создание полного бэкапа
./scripts/backup.sh

# Восстановление из бэкапа
tar -xzf backup-*.tar.gz
cd backup-*/
./restore.sh
```

### Контакты

- 📧 Email: support@example.com
- 💬 Telegram: @your_telegram
- 🐛 Issues: [GitHub Issues](https://github.com/your-repo/vpn-proxy-server/issues)

---

**Примечание**: Это руководство предназначено для развертывания в продакшене. Для разработки используйте `npm run dev` и локальную конфигурацию.
