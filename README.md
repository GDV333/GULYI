# Гуляй — маркетплейс для организации мероприятий

Заказчик описывает событие (дата, город, бюджет, нужные роли), система рассылает
заявки исполнителям, подтвердившие попадают в общий чат мероприятия и «корзину»,
после чего заказчик оплачивает всю команду одним действием.

Монорепозиторий (npm workspaces):

```
gulyay/
├── apps/web/          Next.js 14 (App Router) — фронтенд, порт 3000
├── backend/           Fastify + Drizzle ORM — API, порт 4000
├── packages/shared/   общий код (заглушка)
└── infra/docker/      docker-compose: PostgreSQL + MinIO + Redis
```

| Слой     | Технология                              |
|----------|-----------------------------------------|
| Фронтенд | Next.js 14, React 18, кастомный `apiFetch` (без axios/react-query) |
| Бэкенд   | Fastify 4, TypeScript, Zod              |
| ORM / БД | Drizzle ORM + PostgreSQL 16             |
| Медиа    | MinIO локально (S3-совместимое), Yandex Object Storage в проде |
| Авторизация | JWT (`@fastify/jwt`), токен в `localStorage` на клиенте |

---

## Запуск на новом ноутбуке — с нуля

### 0. Что должно быть установлено

| Инструмент | Версия | Проверка | Как поставить (macOS) |
|-----------|--------|----------|-----------------------|
| **Node.js** | 20 LTS или новее | `node -v` | `brew install node@20` или [nodejs.org](https://nodejs.org) |
| **npm** | 10+ (идёт с Node) | `npm -v` | — |
| **Docker Desktop** | любой свежий | `docker --version` | [docker.com](https://www.docker.com/products/docker-desktop) |
| **git** | любой | `git --version` | `brew install git` |

Docker нужен только для баз (PostgreSQL + MinIO). Если Postgres и S3 уже есть
где-то ещё — Docker можно не ставить, просто пропишите свои адреса в `backend/.env`.

### 1. Склонировать репозиторий

```bash
git clone https://github.com/<твой-логин>/gulyay.git
cd gulyay
```

### 2. Установить зависимости (одной командой из корня)

```bash
npm install
```

npm workspaces сам поставит зависимости и для `backend/`, и для `apps/web/`.
Отдельно заходить в подпапки и делать `npm install` не нужно.

### 3. Поднять базы данных (Docker)

```bash
docker compose -f infra/docker/docker-compose.yml up -d
```

Поднимутся три контейнера:

| Контейнер | Порт | Назначение |
|-----------|------|------------|
| `gulyay_postgres` | 5432 | PostgreSQL (база `gulyay_db`, юзер/пароль `gulyay` / `gulyay`) |
| `gulyay_minio`    | 9000 (API), 9001 (веб-консоль) | хранилище фото/видео |
| `gulyay_redis`    | 6379 | пока не используется, можно игнорировать |

Проверить, что поднялось: `docker ps` — у `gulyay_postgres` должно быть
`healthy`. Данные лежат в docker-волюмах и переживают перезапуск контейнеров.

### 4. Настроить переменные окружения бэкенда

```bash
cp backend/.env.example backend/.env
```

Значения по умолчанию уже совпадают с docker-compose — для локального запуска
**менять ничего не нужно**. Файл `backend/.env` в git не коммитится.

### 5. Создать таблицы в базе

```bash
npm run db:push --workspace @gulyay/backend
```

Drizzle прочитает `backend/src/db/schema.ts` и создаст/обновит все таблицы
напрямую (без файлов миграций). На чистой базе просто применится. Если спросит
подтверждение при повторных запусках — можно форсить:

```bash
npm run db:push --workspace @gulyay/backend -- --force
```

### 6. Наполнить базу данными

```bash
# ОБЯЗАТЕЛЬНО — справочник категорий (без него каталог и регистрация не работают)
npm run db:seed --workspace @gulyay/backend

# ОПЦИОНАЛЬНО — ~60 демо-исполнителей + 2 демо-заказчика
npm run db:seed:demo --workspace @gulyay/backend
```

Оба скрипта идемпотентны — существующие записи пропускаются, можно запускать
повторно.

Демо-аккаунты (пароль у всех — `test1234`):

| Email | Роль |
|-------|------|
| `client1@gulyay.test`, `client2@gulyay.test` | заказчик |
| `host1@gulyay.test` … (по 3 на категорию) | исполнитель |

### 7. Запустить бэкенд

```bash
npm run dev --workspace @gulyay/backend
```

API поднимется на **http://localhost:4000**. Проверка: `curl http://localhost:4000/health` → `{"status":"ok"}`.

> ⚠️ Дев-сервер бэкенда (`tsx`) **без watch** — после изменений в `backend/src`
> его нужно перезапускать вручную (Ctrl+C и снова `npm run dev`).

### 8. Запустить фронтенд (в отдельном терминале)

```bash
npm run dev --workspace @gulyay/web
```

Откроется на **http://localhost:3000**. Фронтенд по умолчанию ходит на
`http://localhost:4000` — если API на другом адресе, создай `apps/web/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### 9. Готово

Открой http://localhost:3000, зарегистрируйся или войди демо-аккаунтом.

---

## Как сделать себя администратором

Раздел `/admin` (список всех пользователей + модерация отзывов) доступен только
роли `admin`. Сидов админа нет — зарегистрируйся обычным способом и переключи роль
в базе:

```bash
docker exec -it gulyay_postgres psql -U gulyay -d gulyay_db \
  -c "UPDATE users SET role='admin' WHERE email='ТВОЙ_EMAIL';"
```

После этого перелогинься (роль зашита в JWT).

---

## MinIO (хранилище фото)

- Веб-консоль: **http://localhost:9001**, логин `gulyay` / пароль `gulyay123`.
- Бакет `gulyay-media` **создаётся автоматически** при первой загрузке файла и
  сразу открывается на публичное чтение — вручную ничего настраивать не надо.
- Если фото не отображаются — проверь, что контейнер `gulyay_minio` запущен и
  `S3_*` в `backend/.env` указывают на него.

---

## Полезные команды

```bash
# Всё разом (turbo) — из корня
npm run dev            # backend + web параллельно
npm run build          # прод-сборка обоих

# По отдельности
npm run dev   --workspace @gulyay/backend
npm run dev   --workspace @gulyay/web
npm run build --workspace @gulyay/web

# База
npm run db:push      --workspace @gulyay/backend   # применить схему
npm run db:seed      --workspace @gulyay/backend   # категории
npm run db:seed:demo --workspace @gulyay/backend   # демо-данные

# Docker
docker compose -f infra/docker/docker-compose.yml up -d     # поднять
docker compose -f infra/docker/docker-compose.yml down      # остановить
docker compose -f infra/docker/docker-compose.yml down -v   # + стереть данные БД

# Прямой доступ к базе
docker exec -it gulyay_postgres psql -U gulyay -d gulyay_db
```

---

## Переменные окружения (`backend/.env`)

| Переменная | По умолчанию | Назначение |
|-----------|--------------|------------|
| `PORT` | `4000` | порт API |
| `DATABASE_URL` | `postgresql://gulyay:gulyay@localhost:5432/gulyay_db` | строка подключения к PostgreSQL |
| `JWT_SECRET` | `your-super-secret-key-…` | подпись токенов — **сменить в проде** |
| `JWT_EXPIRES_IN` | `7d` | срок жизни токена |
| `S3_ENDPOINT` | `http://localhost:9000` | адрес S3/MinIO |
| `S3_REGION` | `us-east-1` | регион (для MinIO любой) |
| `S3_BUCKET` | `gulyay-media` | имя бакета |
| `S3_ACCESS_KEY` / `S3_SECRET_KEY` | `gulyay` / `gulyay123` | ключи доступа |
| `S3_PUBLIC_URL` | `= S3_ENDPOINT` | базовый URL для ссылок в `<img>` |

Фронтенд: `NEXT_PUBLIC_API_URL` в `apps/web/.env.local` (по умолчанию `http://localhost:4000`).

---

## Траблшутинг

| Симптом | Причина / решение |
|---------|-------------------|
| `ECONNREFUSED 127.0.0.1:5432` | контейнер Postgres не поднят → `docker compose -f infra/docker/docker-compose.yml up -d` |
| `Missing required env var: DATABASE_URL` | нет `backend/.env` → `cp backend/.env.example backend/.env` |
| Каталог пустой, регистрация исполнителя падает | не выполнен `npm run db:seed` (нет категорий) |
| `EADDRINUSE :::3000` / `:::4000` | уже запущен другой инстанс → `lsof -ti :3000 -sTCP:LISTEN \| xargs kill` |
| Изменения в `backend/src` не подхватываются | перезапусти дев-сервер бэкенда вручную |
| Правки в `apps/web/src/app/layout.tsx` не видны | корневой layout Next не поддерживает HMR — перезапусти `npm run dev` фронтенда |
| Фото не грузятся / не видны | проверь контейнер `gulyay_minio` и `S3_*` в `.env` |
| 401 и выкидывает на `/auth/login?expired=1` | токен протух (7 дней) или сменился `JWT_SECRET` — просто войди заново |
