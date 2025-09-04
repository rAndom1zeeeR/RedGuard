# Структура проекта RedGuard Server

Полное описание структуры проекта с горизонтальным масштабированием на Next.js 15 и TypeScript.

## 📁 Структура файлов

```
vpn-proxy-server/
├── 📄 README.md                           # Основная документация
├── 📄 DEPLOYMENT.md                       # Руководство по развертыванию
├── 📄 PROJECT_STRUCTURE.md                # Структура проекта (этот файл)
├── 📄 prompt.md                           # Исходное техническое задание
├── 📄 env.example                         # Пример конфигурации
├── 📄 package.json                        # Node.js зависимости и скрипты
├── 📄 tsconfig.json                       # Конфигурация TypeScript
├── 📄 next.config.js                      # Конфигурация Next.js 15
├── 📄 Dockerfile                          # Multi-stage Docker образ
├── 📄 setup.sh                            # Скрипт автоматической установки
├── 📄 docker-compose.yml                  # Основной Docker Compose
├── 📄 docker-compose.scale.yml            # Docker Compose для масштабирования
├── 📄 docker-compose.loadbalancer.yml     # Docker Compose для Load Balancer
│
├── 📁 src/                                # Исходный код Next.js 15
│   ├── 📁 app/                            # App Router (Next.js 15)
│   │   ├── 📄 layout.tsx                  # Корневой layout
│   │   ├── 📄 page.tsx                    # Главная страница
│   │   ├── 📄 globals.css                 # Глобальные стили
│   │   └── 📁 api/                        # API Routes
│   │       ├── 📁 health/                 # Health check endpoint
│   │       │   └── 📄 route.ts            # GET /api/health
│   │       ├── 📁 servers/                # Управление серверами
│   │       │   ├── 📄 route.ts            # GET,POST /api/servers
│   │       │   └── 📁 [id]/               # Операции с конкретным сервером
│   │       │       ├── 📄 route.ts        # GET,PUT,DELETE /api/servers/[id]
│   │       │       └── 📁 metrics/        # Метрики сервера
│   │       │           └── 📄 route.ts    # GET,POST /api/servers/[id]/metrics
│   │       └── 📁 discovery/              # Обнаружение серверов
│   │           └── 📁 health/             # Health check для discovery
│   │               └── 📄 route.ts        # GET /api/discovery/health
│   │
│   ├── 📁 components/                     # React компоненты
│   │   ├── 📄 ServerList.tsx              # Список серверов
│   │   ├── 📄 ServerStats.tsx             # Статистика серверов
│   │   └── 📄 LoadBalancerStatus.tsx      # Статус Load Balancer
│   │
│   ├── 📁 lib/                            # Утилиты и хелперы
│   │   ├── 📄 logger.ts                   # Winston логгер
│   │   ├── 📄 redis.ts                    # Redis клиент
│   │   └── 📄 server-discovery.ts         # Сервис обнаружения серверов
│   │
│   └── 📁 types/                          # TypeScript типы
│       └── 📄 index.ts                    # Основные типы и интерфейсы
│
├── 📁 config/                             # Конфигурационные файлы
│   ├── 📁 haproxy/                        # HAProxy конфигурация
│   │   └── 📄 haproxy.cfg                 # Основная конфигурация HAProxy
│   ├── 📁 nginx/                          # Nginx конфигурация
│   │   └── 📄 default.conf                # Конфигурация Nginx для прокси
│   ├── 📁 nginx-static/                   # Nginx для статики
│   │   └── 📄 default.conf                # Конфигурация для статических файлов
│   └── 📁 xray/                           # Xray VPN конфигурация
│       └── 📄 config.json                 # Конфигурация Xray Core
│
├── 📁 scripts/                            # Скрипты управления
│   ├── 📄 backup.sh                       # Скрипт резервного копирования
│   ├── 📄 scale.sh                        # Скрипт масштабирования
│   └── 📄 update.sh                       # Скрипт обновления
│
├── 📁 public/                             # Статические файлы
│   └── 📄 index.html                      # Статическая страница
│
└── 📁 .github/                            # GitHub Actions
    └── 📁 workflows/                      # CI/CD пайплайны
        └── 📄 deploy.yml                  # Автоматический деплой
```

## 🏗 Архитектура

### Компоненты системы

1. **Next.js 15 App Router** - Веб-интерфейс и API
2. **Xray Core** - VPN сервер (VMess, Shadowsocks, Trojan)
3. **Nginx** - HTTP/SOCKS прокси и reverse proxy
4. **HAProxy** - Load Balancer для распределения нагрузки
5. **Redis** - Синхронизация между серверами
6. **Certbot** - Автоматические SSL сертификаты

### Сетевые порты

| Порт | Сервис | Описание |
|------|--------|----------|
| 80 | HTTP | Let's Encrypt challenge |
| 443 | HTTPS/VPN | Основной VPN трафик |
| 8080 | HTTP Proxy | HTTP прокси для приложений |
| 1080 | SOCKS5 | SOCKS5 прокси |
| 3000 | Next.js | Веб-интерфейс и API |
| 6379 | Redis | База данных |
| 8404 | HAProxy | Статистика Load Balancer |

## 🔧 Технологический стек

### Frontend
- **Next.js 15** - React фреймворк с App Router
- **TypeScript** - Строгая типизация
- **CSS Modules** - Стилизация компонентов
- **React Server Components** - Оптимизация производительности

### Backend
- **Next.js API Routes** - REST API endpoints
- **Winston** - Логирование
- **Redis** - Кэширование и синхронизация
- **JWT** - Аутентификация

### Infrastructure
- **Docker** - Контейнеризация
- **Docker Compose** - Оркестрация контейнеров
- **HAProxy** - Load Balancer
- **Nginx** - Reverse Proxy
- **Xray Core** - VPN сервер

### DevOps
- **GitHub Actions** - CI/CD
- **Ubuntu 22.04.5 LTS** - Операционная система
- **UFW** - Firewall
- **Fail2ban** - Защита от атак
- **Systemd** - Управление сервисами

## 📊 Функциональность

### Основные возможности

1. **VPN сервер**
   - Поддержка VMess, Shadowsocks, Trojan
   - Автоматические SSL сертификаты
   - Множественные пользователи

2. **HTTP/SOCKS прокси**
   - HTTP прокси на порту 8080
   - SOCKS5 прокси на порту 1080
   - Аутентификация пользователей

3. **Load Balancer**
   - Автоматическое обнаружение серверов
   - Распределение нагрузки
   - Health checks

4. **Мониторинг**
   - Веб-интерфейс в реальном времени
   - Метрики серверов
   - Логирование через Winston

5. **Масштабирование**
   - Горизонтальное масштабирование
   - Автоматическое добавление серверов
   - Синхронизация через Redis

### API Endpoints

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/api/health` | Health check |
| GET | `/api/servers` | Список серверов |
| POST | `/api/servers` | Добавить сервер |
| GET | `/api/servers/[id]` | Информация о сервере |
| PUT | `/api/servers/[id]` | Обновить сервер |
| DELETE | `/api/servers/[id]` | Удалить сервер |
| GET | `/api/servers/[id]/metrics` | Метрики сервера |
| POST | `/api/servers/[id]/metrics` | Сохранить метрики |
| GET | `/api/discovery/health` | Health check discovery |

## 🚀 Развертывание

### Автоматическая установка

```bash
curl -fsSL https://raw.githubusercontent.com/your-repo/vpn-proxy-server/main/setup.sh | sudo bash
```

### Ручная установка

1. Клонирование репозитория
2. Установка зависимостей
3. Настройка конфигурации
4. Запуск сервисов

### Масштабирование

```bash
./scripts/scale.sh server2 192.168.1.2 us 100
```

## 🔒 Безопасность

### Меры безопасности

1. **Firewall (UFW)**
   - Ограничение доступа по портам
   - Правила для SSH, HTTP, HTTPS

2. **Fail2ban**
   - Защита от brute force атак
   - Автоматическая блокировка IP

3. **SSL/TLS**
   - Автоматические сертификаты Let's Encrypt
   - Шифрование трафика

4. **Аутентификация**
   - JWT токены для API
   - Пароли для прокси сервисов

5. **Контейнеризация**
   - Изоляция сервисов
   - Non-root пользователи

## 📈 Мониторинг

### Логирование

- **Winston** - Структурированное логирование
- **Ротация логов** - Автоматическая очистка
- **Уровни логирования** - Error, Warn, Info, Debug

### Метрики

- **CPU и память** - Использование ресурсов
- **Сеть** - Входящий/исходящий трафик
- **Соединения** - Активные подключения
- **Время отклика** - Производительность

### Алерты

- **Telegram/Discord** - Уведомления
- **Health checks** - Автоматическая проверка
- **Rollback** - Откат при ошибках

## 🔄 CI/CD

### GitHub Actions

1. **TypeScript проверка** - Валидация типов
2. **ESLint** - Проверка качества кода
3. **Сборка Next.js** - Оптимизация приложения
4. **Docker сборка** - Создание образов
5. **Автоматический деплой** - Развертывание на серверах
6. **Уведомления** - Статус деплоя

### Процесс обновления

1. Push в main ветку
2. Запуск CI/CD pipeline
3. Проверка и сборка
4. Деплой на все серверы
5. Health check
6. Rollback при ошибках

## 📝 Документация

### Файлы документации

- **README.md** - Основная документация
- **DEPLOYMENT.md** - Руководство по развертыванию
- **PROJECT_STRUCTURE.md** - Структура проекта
- **env.example** - Пример конфигурации

### Комментарии в коде

- **TypeScript** - JSDoc комментарии
- **Shell скрипты** - Подробные комментарии
- **Docker** - Описание каждого шага
- **Конфигурации** - Объяснение параметров

## 🛠 Разработка

### Локальная разработка

```bash
npm install
npm run dev
npm run type-check
npm run lint
```

### Структура компонентов

- **Server Components** - Для статического контента
- **Client Components** - Для интерактивности
- **API Routes** - Для backend логики
- **Middleware** - Для аутентификации

### Типизация

- **Строгие типы** - TypeScript strict mode
- **Интерфейсы** - Для всех данных
- **Zod схемы** - Для валидации
- **Generic типы** - Для переиспользования

---

Этот проект представляет собой полнофункциональное решение для RedGuard сервера с современной архитектурой, горизонтальным масштабированием и автоматическим управлением через GitHub Actions.
