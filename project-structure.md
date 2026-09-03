# Структура проекта «Гуляй»

## Монорепозиторий

gulyay/
├── apps/
│   ├── web/          ← Next.js 14 (фронтенд)
│   └── mobile/       ← React Native + Expo (будущее)
├── packages/
│   ├── api/          ← Общие типы API
│   ├── shared/       ← Общая бизнес-логика (хуки, утилиты)
│   └── ui/           ← Общие UI-компоненты (потом)
├── backend/          ← Node.js + Fastify (API-сервер)
└── infra/            ← Docker, миграции, конфиги
