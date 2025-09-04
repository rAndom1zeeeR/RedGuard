# RedGuard Server с горизонтальным масштабированием

Полнофункциональный RedGuard сервер на базе Docker с Next.js 15, TypeScript, автоматическим обновлением через GitHub Actions и поддержкой горизонтального масштабирования на несколько серверов.

## 🚀 Возможности

- **VPN сервер** на базе Xray Core (VMess, Shadowsocks, Trojan)
- **HTTP/SOCKS прокси** для локальных приложений
- **Автоматические SSL сертификаты** через Let's Encrypt
- **Load Balancer** (HAProxy) для распределения нагрузки
- **Next.js 15 App Router** для API и веб-интерфейса
- **TypeScript** для строгой типизации
- **Redis** для синхронизации между серверами
- **Автоматическое обновление** через GitHub Actions
- **Горизонтальное масштабирование** на несколько серверов
- **Мониторинг и логирование** через Winston
- **Безопасность** с UFW firewall и fail2ban

## 📋 Системные требования

- Ubuntu 22.04.5 LTS (Jammy Jellyfish)
- Docker Engine 24.0+ и Docker Compose v2
- Node.js 18+ LTS
- TypeScript 5.0+
- Минимум 2GB RAM
- Минимум 20GB свободного места

## 🛠 Установка

### Автоматическая установка

```bash
# Скачивание и запуск скрипта установки
curl -fsSL https://raw.githubusercontent.com/your-repo/vpn-proxy-server/main/setup.sh | sudo bash
```

### Ручная установка

1. **Клонирование репозитория**
```bash
git clone https://github.com/your-repo/vpn-proxy-server.git
cd vpn-proxy-server
```

2. **Установка зависимостей**
```bash
# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Установка Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Установка TypeScript
sudo npm install -g typescript
```

3. **Настройка конфигурации**
```bash
# Копирование примера конфигурации
cp env.example .env

# Редактирование конфигурации
nano .env
```

4. **Сборка и запуск**
```bash
# Сборка Docker образов
docker compose build

# Запуск сервисов
docker compose up -d
```

## ⚙️ Конфигурация

### Основные настройки

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
```

### Порты

- **80** - HTTP (Let's Encrypt challenge)
- **443** - HTTPS/VPN
- **8080** - HTTP прокси
- **1080** - SOCKS5 прокси
- **3000** - Next.js приложение
- **6379** - Redis
- **8404** - HAProxy статистика

## 🔧 Использование

### Запуск сервисов

```bash
# Запуск всех сервисов
docker compose up -d

# Запуск с масштабированием
docker compose -f docker-compose.scale.yml up -d

# Запуск load balancer
docker compose -f docker-compose.loadbalancer.yml up -d
```

### Мониторинг

```bash
# Проверка статуса
docker compose ps

# Просмотр логов
docker compose logs -f

# Мониторинг ресурсов
docker stats

# Health check
curl http://localhost:3000/api/health
```

### Управление серверами

```bash
# Добавление нового сервера
curl -X POST http://localhost:3000/api/servers \
  -H "Content-Type: application/json" \
  -d '{
    "id": "server2",
    "name": "Server 2",
    "region": "us",
    "weight": 100,
    "ip": "192.168.1.2"
  }'

# Получение списка серверов
curl http://localhost:3000/api/servers

# Получение метрик сервера
curl http://localhost:3000/api/servers/server1/metrics
```

## 🌐 Веб-интерфейс

После запуска сервисов веб-интерфейс будет доступен по адресу:

- **Основной интерфейс**: http://localhost:3000
- **HAProxy статистика**: http://localhost:8404/stats
- **API документация**: http://localhost:3000/api

### Функции веб-интерфейса

- 📊 Мониторинг серверов в реальном времени
- 🔄 Управление статусом серверов
- 📈 Просмотр метрик и статистики
- ⚖️ Настройка load balancer
- 🔐 Управление VPN пользователями
- 📝 Просмотр логов

## 🔄 Автоматическое обновление

### GitHub Actions

Проект настроен для автоматического обновления через GitHub Actions:

1. **Push в main ветку** запускает CI/CD pipeline
2. **TypeScript проверка** и линтинг
3. **Сборка Next.js** приложения
4. **Сборка Docker** образов
5. **Автоматический деплой** на все серверы
6. **Уведомления** в Telegram/Discord

### Настройка GitHub Secrets

Добавьте следующие secrets в настройках репозитория:

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

## 📈 Масштабирование

### Горизонтальное масштабирование

```bash
# Запуск на нескольких серверах
SERVER_ID=server1 docker compose -f docker-compose.scale.yml up -d
SERVER_ID=server2 docker compose -f docker-compose.scale.yml up -d
SERVER_ID=server3 docker compose -f docker-compose.scale.yml up -d

# Запуск load balancer
docker compose -f docker-compose.loadbalancer.yml up -d
```

### Автоматическое обнаружение серверов

Сервис автоматически обнаруживает новые серверы и добавляет их в load balancer:

- Health check каждые 30 секунд
- Автоматическое удаление недоступных серверов
- Балансировка нагрузки по алгоритму Round Robin

## 🔒 Безопасность

### Firewall (UFW)

```bash
# Просмотр правил
sudo ufw status

# Добавление правил
sudo ufw allow 443/tcp
sudo ufw allow 8080/tcp
```

### Fail2ban

```bash
# Просмотр статуса
sudo fail2ban-client status

# Просмотр заблокированных IP
sudo fail2ban-client status sshd
```

### SSL сертификаты

```bash
# Получение сертификата
docker compose exec certbot certbot certonly --webroot -w /var/www/html -d your-domain.com

# Обновление сертификатов
docker compose exec certbot certbot renew
```

## 📊 Мониторинг и логирование

### Логи

Логи сохраняются в директории `logs/`:

- `app-YYYY-MM-DD.log` - Основные логи приложения
- `error-YYYY-MM-DD.log` - Логи ошибок
- `access-YYYY-MM-DD.log` - Логи доступа

### Метрики

Метрики серверов сохраняются в Redis и доступны через API:

```bash
# Получение метрик сервера
curl http://localhost:3000/api/servers/server1/metrics?hours=24

# Получение статистики
curl http://localhost:3000/api/servers
```

## 🛠 Разработка

### Локальная разработка

```bash
# Установка зависимостей
npm install

# Запуск в режиме разработки
npm run dev

# Проверка типов
npm run type-check

# Линтинг
npm run lint
```

### Структура проекта

```
src/
├── app/                    # Next.js 15 App Router
│   ├── api/               # API endpoints
│   ├── globals.css        # Глобальные стили
│   ├── layout.tsx         # Корневой layout
│   └── page.tsx           # Главная страница
├── components/            # React компоненты
├── lib/                   # Утилиты и хелперы
│   ├── logger.ts          # Winston логгер
│   ├── redis.ts           # Redis клиент
│   └── server-discovery.ts # Обнаружение серверов
└── types/                 # TypeScript типы
    └── index.ts           # Основные типы
```

## 🐛 Устранение неполадок

### Проблемы с Docker

```bash
# Очистка Docker
docker system prune -a

# Пересборка образов
docker compose build --no-cache
```

### Проблемы с Redis

```bash
# Проверка подключения
docker compose exec redis redis-cli ping

# Очистка данных
docker compose exec redis redis-cli flushall
```

### Проблемы с сертификатами

```bash
# Проверка сертификатов
docker compose exec certbot certbot certificates

# Принудительное обновление
docker compose exec certbot certbot renew --force-renewal
```

## 📝 Лицензия

MIT License - см. файл [LICENSE](LICENSE)

## 🤝 Вклад в проект

1. Fork репозитория
2. Создайте feature ветку (`git checkout -b feature/amazing-feature`)
3. Commit изменения (`git commit -m 'Add amazing feature'`)
4. Push в ветку (`git push origin feature/amazing-feature`)
5. Откройте Pull Request

## 📞 Поддержка

- 📧 Email: support@example.com
- 💬 Telegram: @your_telegram
- 🐛 Issues: [GitHub Issues](https://github.com/your-repo/vpn-proxy-server/issues)

## 🙏 Благодарности

- [Next.js](https://nextjs.org/) - React фреймворк
- [Xray Core](https://github.com/XTLS/Xray-core) - VPN сервер
- [HAProxy](https://www.haproxy.org/) - Load balancer
- [Redis](https://redis.io/) - База данных
- [Docker](https://www.docker.com/) - Контейнеризация


### Sudo
sudo systemctl daemon-reload
sudo systemctl reset-failed user@0.service
sudo systemctl start user@0.service
systemctl status user@0.service
