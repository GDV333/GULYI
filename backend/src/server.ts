import Fastify from 'fastify'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import jwt from '@fastify/jwt'
import multipart from '@fastify/multipart'
import staticPlugin from '@fastify/static'
import { join } from 'path'
import { mkdirSync } from 'fs'
import { config } from './config'

import { authRoutes }    from './modules/auth/auth.routes'
import { catalogRoutes } from './modules/catalog/catalog.routes'
import { bookingRoutes } from './modules/bookings/booking.routes'
import { profileRoutes } from './modules/profile/profile.routes'
import { reviewRoutes }  from './modules/reviews/review.routes'
import { favoriteRoutes } from './modules/favorites/favorite.routes'
import { chatRoutes }     from './modules/chat/chat.routes'
import { eventRoutes }    from './modules/events/event.routes'
import { adminRoutes }    from './modules/admin/admin.routes'
import { metricsRoutes }  from './modules/metrics/metrics.routes'

// Создаём папки для загрузок
try { mkdirSync('./uploads/avatars',   { recursive: true }) } catch {}
try { mkdirSync('./uploads/portfolio', { recursive: true }) } catch {}

const app = Fastify({
  logger: {
    transport: config.env === 'development'
      ? { target: 'pino-pretty' }
      : undefined,
  },
})

// ─── Plugins ─────────────────────────────────────────────────────────────────

await app.register(cors, {
  origin: config.env === 'production'
    ? ['https://gulyay.ru']
    : ['http://localhost:3000', 'https://gulyay.ru'],
  credentials: true,
})

// Общий потолок запросов с одного IP — чтобы никто не заваливал API перебором
// паролей, спамом регистраций или флудом в трекер посещений.
await app.register(rateLimit, {
  global: true,
  max: 300,
  timeWindow: '1 minute',
  errorResponseBuilder: () => ({ statusCode: 429, error: 'Too Many Requests', message: 'Слишком много запросов, попробуйте позже' }),
})

await app.register(jwt, {
  secret: config.jwt.secret,
  sign: { expiresIn: config.jwt.expiresIn },
})

await app.register(multipart, {
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 МБ
})

await app.register(staticPlugin, {
  root: join(process.cwd(), 'uploads'),
  prefix: '/uploads/',
})

// ─── Auth hook ────────────────────────────────────────────────────────────────

app.decorate('authenticate', async function (request: any, reply: any) {
  try {
    await request.jwtVerify()
  } catch {
    reply.status(401).send({ error: 'Unauthorized' })
  }
})

// ─── Ошибки ───────────────────────────────────────────────────────────────────
// Наружу — обезличенный текст: иначе Fastify отдаёт сообщение исключения, а в
// нём, например, целиком SQL-запрос со всеми таблицами и колонками.
app.setErrorHandler((err, request, reply) => {
  const status = err.statusCode ?? 500
  if (status >= 500) {
    request.log.error({ err }, 'unhandled error')
    return reply.status(status).send({ error: 'Внутренняя ошибка сервера' })
  }
  reply.status(status).send({ error: err.message })
})

// ─── Routes ──────────────────────────────────────────────────────────────────

await app.register(authRoutes,    { prefix: '/api/auth' })
await app.register(catalogRoutes, { prefix: '/api/catalog' })
await app.register(bookingRoutes, { prefix: '/api/bookings' })
await app.register(profileRoutes, { prefix: '/api/profile' })
await app.register(reviewRoutes,  { prefix: '/api/reviews' })
await app.register(favoriteRoutes, { prefix: '/api/favorites' })
await app.register(chatRoutes,     { prefix: '/api/chat' })
await app.register(eventRoutes,    { prefix: '/api/events' })
await app.register(adminRoutes,    { prefix: '/api/admin' })
await app.register(metricsRoutes,  { prefix: '/api/metrics' })

app.get('/health', () => ({ status: 'ok', version: '1.0.0' }))

// ─── Start ───────────────────────────────────────────────────────────────────

try {
  await app.listen({ port: config.port, host: '0.0.0.0' })
  console.log(`🚀 Сервер запущен на порту ${config.port}`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}