import type { FastifyInstance } from 'fastify'
export async function paymentRoutes(app: FastifyInstance) {
  // TODO: Шаг 4 — интеграция с ЮKассой и эскроу-логика
  app.get('/', async () => ({ message: 'Payments module coming soon' }))
}
