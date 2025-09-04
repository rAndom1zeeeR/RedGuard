Создай Docker-решение для RedGuard сервера с нуля на Ubuntu 22.04.5 LTS с автоматическим обновлением через GitHub, полной TypeScript экосистемой с Next.js 15 App Router и поддержкой горизонтального масштабирования на несколько серверов:

**Задача:**
Развернуть универсальный сервер в Docker контейнере на Ubuntu 22.04.5 LTS, который будет работать как VPN и HTTP/SOCKS прокси с поддержкой современных протоколов, автоматическим управлением SSL сертификатами, автоматическим обновлением через GitHub Actions, полной TypeScript экосистемой с Next.js 15 App Router и возможностью горизонтального масштабирования на несколько серверов для распределения нагрузки.

**Системные требования:**

- Ubuntu 22.04.5 LTS (Jammy Jellyfish) на каждом сервере
- Docker Engine 24.0+ и Docker Compose v2
- Node.js 18+ LTS
- TypeScript 5.0+
- UFW firewall для управления портами
- Systemd для автозапуска сервисов
- Certbot для Let's Encrypt сертификатов
- Git для работы с репозиторием
- GitHub Actions для CI/CD
- Load balancer (HAProxy/Nginx) для распределения нагрузки

**Технические требования:**

- VPN сервер на базе Xray Core (VMess, Shadowsocks, Trojan)
- HTTP/SOCKS прокси сервер для локальных приложений
- Автоматическая генерация и обновление SSL сертификатов
- Reverse proxy (nginx) для распределения трафика
- Multi-stage Docker build для оптимизации размера
- Healthcheck и мониторинг контейнера
- Поддержка IPv6
- Простое логирование через Winston в локальные файлы
- Автоматическое обновление при push в main ветку
- Полная TypeScript экосистема с Next.js 15 App Router
- Горизонтальное масштабирование на несколько серверов
- Автоматическое обнаружение новых серверов
- Распределение нагрузки между серверами

**Архитектура:**

- Load Balancer контейнер (HAProxy/Nginx) для распределения трафика
- Nginx контейнер как entry point на каждом сервере (порты 80, 443, 8080, 1080)
- Xray контейнер для VPN функционала на каждом сервере
- Отдельный контейнер для HTTP/SOCKS прокси на каждом сервере
- Certbot для автоматических SSL сертификатов
- Next.js 15 TypeScript контейнер для API, мониторинга и управления
- Redis для синхронизации между серверами
- Общая сеть для взаимодействия сервисов
- GitHub Actions для автоматического деплоя на все серверы

**Функциональность:**

- VPN сервер для удаленных клиентов с балансировкой нагрузки
- HTTP прокси на порту 8080 (HTTP) и 8443 (HTTPS) с распределением
- SOCKS5 прокси на порту 1080 с балансировкой
- REST API через Next.js 15 App Router
- Веб-интерфейс для мониторинга на Next.js 15
- Автогенерация конфигурации из переменных окружения
- Поддержка множественных пользователей для VPN
- Аутентификация для прокси сервисов
- Hot-reload конфигурации без перезапуска
- Graceful shutdown при остановке
- Backup/restore настроек
- Простые метрики для мониторинга
- Автоматическое обновление при изменениях в main ветке
- Автоматическое масштабирование при добавлении новых серверов
- Мониторинг состояния всех серверов

**Next.js 15 App Router экосистема:**

- Next.js 15 с App Router для API и веб-интерфейса
- TypeScript для строгой типизации
- Server Actions для API endpoints
- React Server Components для оптимизации
- Streaming и Suspense для real-time данных
- Winston для простого логирования в локальные файлы
- JWT с типизацией для аутентификации API
- Zod для валидации данных
- Prisma для работы с БД (если потребуется)

**Простое логирование:**

- Winston для базового логирования
- Логирование в локальные файлы на каждом сервере
- Формат: время + уровень + сообщение + ошибка
- Ротация логов для экономии места
- Логирование ошибок с stack trace
- Простые access logs для API

**Файлы для создания:**

- Dockerfile (multi-stage build)
- docker-compose.yml (основной сервер)
- docker-compose.scale.yml (для масштабирования)
- docker-compose.loadbalancer.yml (load balancer)
- nginx.conf
- haproxy.cfg (конфигурация load balancer)
- entrypoint.sh
- config.json (Xray)
- .env.example
- .env.server1, .env.server2 (конфигурации для разных серверов)
- docker-compose.override.yml
- setup.sh (скрипт установки на Ubuntu)
- setup-scale.sh (скрипт для добавления новых серверов)
- ufw-rules.txt (правила firewall)
- systemd-service.conf (автозапуск)
- .github/workflows/deploy.yml (GitHub Actions для всех серверов)
- .github/workflows/scale.yml (масштабирование)
- scripts/update.sh (скрипт обновления)
- scripts/backup.sh (скрипт резервного копирования)
- scripts/scale.sh (скрипт масштабирования)
- package.json (Next.js 15 + TypeScript зависимости)
- tsconfig.json (конфигурация TypeScript)
- next.config.js (конфигурация Next.js)
- src/ (Next.js 15 App Router исходный код)
- app/ (App Router структура)
- components/ (React компоненты)
- lib/ (утилиты и хелперы)
- types/ (TypeScript типы и интерфейсы)
- README.md с инструкциями

**GitHub Actions и автоматическое обновление:**

- CI/CD pipeline при push в main ветку
- TypeScript compilation и type checking
- Next.js build и optimization
- Автоматический деплой на все серверы
- Автоматическое масштабирование при добавлении новых серверов
- Уведомления в Telegram/Discord при обновлениях
- Rollback при ошибках деплоя
- Версионирование релизов
- Автоматическое создание тегов

**Ubuntu-специфичные особенности:**

- Использование apt вместо yum/dnf
- Настройка UFW firewall правил
- Systemd сервис для автозапуска
- Интеграция с Ubuntu security updates
- Поддержка snap packages если необходимо
- Логирование в journald
- Автоматическое обновление системы
- Node.js через NodeSource репозиторий

**Безопасность:**

- Non-root пользователь в контейнерах
- Read-only файловая система где возможно
- Минимальные привилегии
- Изоляция сетей
- Аутентификация для прокси сервисов
- Ограничение доступа по IP
- UFW firewall правила
- Fail2ban интеграция
- SSH ключи для GitHub Actions
- Проверка целостности обновлений
- JWT токены для API с типизацией
- Rate limiting
- CORS настройки
- Type-safe валидация входных данных
- Next.js security headers
- Безопасность межсерверного взаимодействия

**Производительность:**

- Размер образа <50MB
- Оптимизация для ARM64/AMD64
- Кэширование слоев Docker
- Сжатие статических ресурсов
- Connection pooling для прокси
- Минимальное время простоя при обновлениях
- Next.js 15 optimization
- React Server Components
- Streaming и Suspense
- Redis для кэширования и синхронизации
- TypeScript compilation optimization
- Load balancer optimization
- Распределение нагрузки между серверами

**Использование:**

- VPN клиенты подключаются к load balancer
- Локальные приложения используют прокси через load balancer
- REST API через Next.js App Router на каждом сервере
- Веб-интерфейс для мониторинга на Next.js 15
- WebSocket для real-time уведомлений
- Автоматическое обновление без вмешательства пользователя
- Автоматическое масштабирование при добавлении серверов

**Установка на Ubuntu:**

- Автоматическая установка Docker, Node.js и зависимостей
- Настройка firewall правил
- Создание systemd сервиса
- Настройка автозапуска
- Интеграция с Ubuntu security
- Настройка GitHub Actions runner или webhook
- Установка Node.js через NodeSource
- Автоматическая настройка межсерверного взаимодействия

**Процесс обновления:**

1. Push в main ветку GitHub
2. GitHub Actions запускает TypeScript compilation
3. Next.js build и optimization
4. Type checking
5. При успешной сборке - автоматический деплой на все серверы
6. Backup текущей конфигурации на всех серверах
7. Обновление контейнеров на всех серверах
8. Проверка работоспособности через health checks
9. Rollback при ошибках деплоя
10. Уведомление об успешном обновлении
11. Логирование процесса обновления

**Процесс масштабирования:**

1. Добавление нового сервера в GitHub Secrets
2. Автоматическая установка и настройка через GitHub Actions
3. Автоматическое добавление в load balancer
4. Проверка работоспособности нового сервера
5. Распределение нагрузки на новый сервер
6. Логирование процесса масштабирования

**Next.js 15 App Router разработка:**

- App Router для современной архитектуры
- Server Components для оптимизации
- Server Actions для API
- Streaming и Suspense для real-time
- Middleware для логирования и аутентификации
- Строгая типизация (strict mode)
- ESLint + Prettier для качества кода
- Husky для pre-commit hooks
- Conventional Commits для git
- Semantic Release для автоматического версионирования
- API документация через Swagger с OpenAPI типами
- Zod схемы для валидации
- Type-safe API endpoints
- Interface-first подход
- Generic типы для переиспользуемых компонентов
- Поддержка multi-server архитектуры

**Минимальное использование JavaScript:**

- Только в конфигурационных файлах где TypeScript не применим
- В shell скриптах и entrypoint
- В Dockerfile инструкциях
- В GitHub Actions workflow файлах

Создай полностью рабочий код без TODO, с детальными комментариями и готовый к продакшену на Ubuntu 22.04.5 LTS с автоматическим обновлением через GitHub, полной TypeScript экосистемой с Next.js 15 App Router, простым логированием через Winston в локальные файлы и поддержкой горизонтального масштабирования на несколько серверов для распределения нагрузки.
