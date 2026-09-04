import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { ChatService } from './chat.service'

const sendSchema = z.object({ text: z.string().min(1).max(2000) })

export async function chatRoutes(app: FastifyInstance) {
  const svc = new ChatService()

  app.addHook('onRequest', (app as any).authenticate)

  // GET /api/chat — список диалогов текущего пользователя
  app.get('/', async (request, reply) => {
    const { id } = request.user as { id: string }
    const list = await svc.listConversations(id)
    reply.send(list)
  })

  // GET /api/chat/by-booking/:bookingId — найти диалог по id брони
  app.get('/by-booking/:bookingId', async (request, reply) => {
    const { id } = request.user as { id: string }
    const { bookingId } = request.params as { bookingId: string }
    const conv = await svc.findByBookingId(id, bookingId)
    if (!conv) return reply.status(404).send({ error: 'Диалог ещё не создан' })
    reply.send(conv)
  })

  // POST /api/chat/booking/:bookingId — открыть (создать при необходимости) личный диалог по брони
  app.post('/booking/:bookingId', async (request, reply) => {
    const { id } = request.user as { id: string }
    const { bookingId } = request.params as { bookingId: string }
    try {
      const conv = await svc.ensureForBooking(bookingId, id)
      reply.send(conv)
    } catch (err: any) {
      reply.status(400).send({ error: err.message })
    }
  })

  // GET /api/chat/:id/messages
  app.get('/:id/messages', async (request, reply) => {
    const { id: userId } = request.user as { id: string }
    const { id } = request.params as { id: string }
    try {
      const list = await svc.getMessages(id, userId)
      reply.send(list)
    } catch (err: any) {
      reply.status(404).send({ error: err.message })
    }
  })

  // POST /api/chat/:id/messages
  app.post('/:id/messages', async (request, reply) => {
    const { id: userId } = request.user as { id: string }
    const { id } = request.params as { id: string }
    const body = sendSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    try {
      const message = await svc.sendMessage(id, userId, body.data.text)
      reply.status(201).send(message)
    } catch (err: any) {
      reply.status(404).send({ error: err.message })
    }
  })
}
