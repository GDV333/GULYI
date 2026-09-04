import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { EventService } from './event.service'

const createSchema = z.object({
  eventType:     z.string().max(80).optional(),
  eventDate:     z.string().datetime(),
  eventTimeFrom: z.string().length(5).optional(),
  eventTimeTo:   z.string().length(5).optional(),
  city:          z.string().max(80).optional(),
  location:      z.string().max(255).optional(),
  guestsCount:   z.coerce.number().optional(),
  budget:        z.coerce.number().optional(),
  description:   z.string().max(2000).optional(),
  roleCategorySlugs: z.array(z.string()).min(1),
})

const updateSchema = z.object({
  eventType:     z.string().max(80).optional(),
  eventDate:     z.string().datetime().optional(),
  eventTimeFrom: z.string().length(5).optional(),
  eventTimeTo:   z.string().length(5).optional(),
  city:          z.string().max(80).optional(),
  location:      z.string().max(255).optional(),
  guestsCount:   z.coerce.number().optional(),
  budget:        z.coerce.number().optional(),
  description:   z.string().max(2000).optional(),
})

const addRoleSchema = z.object({
  categorySlug: z.string(),
  notes:        z.string().max(500).optional(),
})

const sendMessageSchema = z.object({ text: z.string().min(1).max(2000) })

export async function eventRoutes(app: FastifyInstance) {
  const svc = new EventService()

  app.addHook('onRequest', (app as any).authenticate)

  app.post('/', async (request, reply) => {
    const body = createSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    const user = request.user as { id: string; role: string }
    if (user.role !== 'client') return reply.status(403).send({ error: 'Только заказчики могут создавать мероприятия' })

    const event = await svc.create(user.id, body.data)
    reply.status(201).send(event)
  })

  app.get('/', async (request, reply) => {
    const user = request.user as { id: string; role: string }
    const list = await svc.listForUser(user.id, user.role as any)
    reply.send(list)
  })

  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = request.user as { id: string }
    try {
      const event = await svc.getById(id, user.id)
      reply.send(event)
    } catch (err: any) {
      reply.status(404).send({ error: err.message })
    }
  })

  app.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = request.user as { id: string }
    const body = updateSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    try {
      const event = await svc.update(id, user.id, body.data)
      reply.send(event)
    } catch (err: any) {
      reply.status(403).send({ error: err.message })
    }
  })

  app.post('/:id/roles', async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = request.user as { id: string }
    const body = addRoleSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    try {
      const event = await svc.addRole(id, user.id, body.data.categorySlug, body.data.notes)
      reply.send(event)
    } catch (err: any) {
      reply.status(403).send({ error: err.message })
    }
  })

  app.delete('/:id/roles/:roleId', async (request, reply) => {
    const { id, roleId } = request.params as { id: string; roleId: string }
    const user = request.user as { id: string }
    try {
      const event = await svc.removeRole(id, user.id, roleId)
      reply.send(event)
    } catch (err: any) {
      reply.status(403).send({ error: err.message })
    }
  })

  app.patch('/:id/checkout', async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = request.user as { id: string }
    try {
      const event = await svc.checkout(id, user.id)
      reply.send(event)
    } catch (err: any) {
      reply.status(400).send({ error: err.message })
    }
  })

  app.get('/:id/chat/messages', async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = request.user as { id: string }
    try {
      const messages = await svc.getChatMessages(id, user.id)
      reply.send(messages)
    } catch (err: any) {
      reply.status(403).send({ error: err.message })
    }
  })

  app.post('/:id/chat/messages', async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = request.user as { id: string }
    const body = sendMessageSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    try {
      const message = await svc.sendChatMessage(id, user.id, body.data.text)
      reply.status(201).send(message)
    } catch (err: any) {
      reply.status(403).send({ error: err.message })
    }
  })
}
