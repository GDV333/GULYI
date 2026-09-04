import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../../db'
import { siteVisits } from '../../db/schema'

const visitSchema = z.object({
  path:      z.string().max(300),
  sessionId: z.string().max(48).optional(),
  referrer:  z.string().max(120).optional(),
})

// Публичный лёгкий трекер посещений. Никогда не мешает пользователю:
// при любой ошибке молча отвечает 204.
export async function metricsRoutes(app: FastifyInstance) {
  app.post('/visit', async (request, reply) => {
    const body = visitSchema.safeParse(request.body)
    if (body.success) {
      try {
        await db.insert(siteVisits).values({
          path:      body.data.path.slice(0, 200),
          sessionId: body.data.sessionId?.slice(0, 48) || null,
          referrer:  body.data.referrer?.slice(0, 120) || null,
        })
      } catch { /* ignore */ }
    }
    reply.status(204).send()
  })
}
