import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { ReviewService } from './review.service'

const createSchema = z.object({
  profileId: z.string().uuid(),
  rating:    z.coerce.number().int().min(1).max(5),
  comment:   z.string().max(1000).optional(),
})

export async function reviewRoutes(app: FastifyInstance) {
  const svc = new ReviewService()

  app.addHook('onRequest', (app as any).authenticate)

  // POST /api/reviews — клиент оставляет отзыв (уходит на модерацию)
  app.post('/', async (request, reply) => {
    const body = createSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    const user = request.user as { id: string; role: string }
    if (user.role !== 'client') return reply.status(403).send({ error: 'Оставлять отзывы могут только клиенты' })

    try {
      const review = await svc.create({ ...body.data, authorId: user.id })
      reply.status(201).send(review)
    } catch (err: any) {
      reply.status(409).send({ error: err.message })
    }
  })

  // GET /api/reviews/pending — очередь модерации (только роль admin)
  app.get('/pending', async (request, reply) => {
    const user = request.user as { role: string }
    if (user.role !== 'admin') return reply.status(403).send({ error: 'Только для администратора' })
    const pending = await svc.listPending()
    reply.send(pending)
  })

  // PATCH /api/reviews/:id/approve — опубликовать отзыв (только роль admin)
  app.patch('/:id/approve', async (request, reply) => {
    const user = request.user as { role: string }
    if (user.role !== 'admin') return reply.status(403).send({ error: 'Только для администратора' })
    const { id } = request.params as { id: string }
    try {
      const review = await svc.approve(id)
      reply.send(review)
    } catch (err: any) {
      reply.status(404).send({ error: err.message })
    }
  })

  // PATCH /api/reviews/:id/reject — отклонить и удалить отзыв (только роль admin)
  app.patch('/:id/reject', async (request, reply) => {
    const user = request.user as { role: string }
    if (user.role !== 'admin') return reply.status(403).send({ error: 'Только для администратора' })
    const { id } = request.params as { id: string }
    try {
      const review = await svc.reject(id)
      reply.send(review)
    } catch (err: any) {
      reply.status(404).send({ error: err.message })
    }
  })
}
