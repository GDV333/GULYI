import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { BookingService } from './booking.service'

const createSchema = z.object({
  profileId:     z.string().uuid(),
  eventId:       z.string().uuid().optional(),
  eventRoleId:   z.string().uuid().optional(),
  eventDate:     z.string().datetime(),
  eventTimeFrom: z.string().length(5).optional(),
  eventTimeTo:   z.string().length(5).optional(),
  eventType:     z.string().max(80).optional(),
  guestsCount:   z.coerce.number().optional(),
  ageCategory:   z.string().max(40).optional(),
  duration:      z.coerce.number().optional(),
  location:      z.string().max(255).optional(),
  budget:        z.coerce.number().optional(),
  notes:         z.string().optional(),
  // "total" сюда намеренно не входит — цену считает сервер по профилю исполнителя,
  // иначе клиент мог бы прислать любую сумму в теле запроса
})

export async function bookingRoutes(app: FastifyInstance) {
  const svc = new BookingService()

  app.addHook('onRequest', (app as any).authenticate)

  app.post('/', async (request, reply) => {
    const body = createSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    const user = request.user as { id: string; role: string }
    if (user.role !== 'client') return reply.status(403).send({ error: 'Только клиенты могут создавать брони' })

    const booking = await svc.create({ ...body.data, clientId: user.id })
    reply.status(201).send(booking)
  })

  app.get('/', async (request, reply) => {
    const user = request.user as { id: string; role: string }
    const bookings = await svc.listForUser(user.id, user.role as any)
    reply.send(bookings)
  })

  // GET /api/bookings/busy/:profileId — занятые дни профиля
  app.get('/busy/:profileId', async (request, reply) => {
    const { profileId } = request.params as { profileId: string }
    const busy = await svc.getBusySlots(profileId)
    reply.send(busy)
  })

  app.patch('/:id/confirm', async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = request.user as { id: string; role: string }
    if (user.role !== 'vendor') return reply.status(403).send({ error: 'Только исполнители могут подтверждать' })
    try {
      const booking = await svc.confirm(id, user.id)
      reply.send(booking)
    } catch (err: any) {
      reply.status(403).send({ error: err.message })
    }
  })

  app.patch('/:id/cancel', async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = request.user as { id: string }
    try {
      const booking = await svc.cancel(id, user.id)
      reply.send(booking)
    } catch (err: any) {
      reply.status(403).send({ error: err.message })
    }
  })

  app.patch('/:id/complete', async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = request.user as { id: string; role: string }
    try {
      const booking = await svc.complete(id, user.id)
      reply.send(booking)
    } catch (err: any) {
      reply.status(403).send({ error: err.message })
    }
  })

  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = request.user as { id: string }
    try {
      const result = await svc.delete(id, user.id)
      reply.send(result)
    } catch (err: any) {
      reply.status(400).send({ error: err.message })
    }
  })
}