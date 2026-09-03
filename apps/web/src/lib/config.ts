// Единая точка настройки адреса бэкенда.
// На проде задайте переменную окружения NEXT_PUBLIC_API_URL (например, в .env.production),
// иначе используется адрес локального дев-сервера.
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
