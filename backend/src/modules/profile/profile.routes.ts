import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { ProfileService } from './profile.service'

const updateSchema = z.object({
  displayName: z.string().min(2).max(120).optional(),
  bio:         z.string().max(2000).optional(),
  city:        z.string().min(2).max(80).optional(),
  priceFrom:   z.string().optional(),
  priceUnit:   z.string().max(40).optional(),
  contacts:    z.array(z.object({
    platform:  z.string(),
    value:     z.string(),
    isVisible: z.boolean().default(true),
  })).optional(),
})

const albumSchema = z.object({
  title:       z.string().min(1).max(120),
  description: z.string().max(500).optional(),
})

const serviceSchema = z.object({
  category:    z.string().min(1).max(80),
  title:       z.string().min(1).max(120),
  description: z.string().max(1000).optional(),
  price:       z.number().positive(),
  priceUnit:   z.string().max(40).optional(),
})

const setAvailabilityDateSchema = z.object({
  isAvailable: z.boolean(),
  timeFrom:    z.string().max(5).optional(),
  timeTo:      z.string().max(5).optional(),
  note:        z.string().max(500).optional(),
})

export async function profileRoutes(app: FastifyInstance) {
  const svc = new ProfileService()

  app.addHook('onRequest', (app as any).authenticate)

  // GET /api/profile/me
  app.get('/me', async (request, reply) => {
    const { id } = request.user as { id: string }
    const profile = await svc.getMyProfile(id)
    if (!profile) return reply.status(404).send({ error: 'Профиль не найден' })
    reply.send(profile)
  })

  // PATCH /api/profile/me
  app.patch('/me', async (request, reply) => {
    const { id } = request.user as { id: string }
    const body = updateSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    const profile = await svc.updateProfile(id, body.data)
    reply.send(profile)
  })

  // POST /api/profile/avatar
  app.post('/avatar', async (request, reply) => {
    const { id } = request.user as { id: string }
    const data = await request.file()
    if (!data) return reply.status(400).send({ error: 'Файл не найден' })
    try {
      const url = await svc.uploadAvatar(id, data)
      reply.send({ avatarUrl: url })
    } catch (err: any) {
      reply.status(400).send({ error: err.message })
    }
  })

  // POST /api/profile/portfolio
  app.post('/portfolio', async (request, reply) => {
    const { id } = request.user as { id: string }
    const data = await request.file()
    if (!data) return reply.status(400).send({ error: 'Файл не найден' })
    try {
      const item = await svc.uploadPortfolioItem(id, data)
      reply.send(item)
    } catch (err: any) {
      reply.status(400).send({ error: err.message })
    }
  })

  // DELETE /api/profile/portfolio/:itemId
  app.delete('/portfolio/:itemId', async (request, reply) => {
    const { id } = request.user as { id: string }
    const { itemId } = request.params as { itemId: string }
    try {
      await svc.deletePortfolioItem(id, itemId)
      reply.send({ ok: true })
    } catch (err: any) {
      reply.status(403).send({ error: err.message })
    }
  })

  // ── Альбомы ──────────────────────────────────────────────────────────────

  // GET /api/profile/albums
  app.get('/albums', async (request, reply) => {
    const { id } = request.user as { id: string }
    const albums = await svc.getAlbums(id)
    reply.send(albums)
  })

  // POST /api/profile/albums
  app.post('/albums', async (request, reply) => {
    const { id } = request.user as { id: string }
    const body = albumSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    const album = await svc.createAlbum(id, body.data)
    reply.status(201).send(album)
  })

  // DELETE /api/profile/albums/:albumId
  app.delete('/albums/:albumId', async (request, reply) => {
    const { id } = request.user as { id: string }
    const { albumId } = request.params as { albumId: string }
    try {
      await svc.deleteAlbum(id, albumId)
      reply.send({ ok: true })
    } catch (err: any) {
      reply.status(403).send({ error: err.message })
    }
  })

  // POST /api/profile/albums/:albumId/photos
  app.post('/albums/:albumId/photos', async (request, reply) => {
    const { id } = request.user as { id: string }
    const { albumId } = request.params as { albumId: string }
    const data = await request.file()
    if (!data) return reply.status(400).send({ error: 'Файл не найден' })
    try {
      const photo = await svc.uploadAlbumPhoto(id, albumId, data)
      reply.send(photo)
    } catch (err: any) {
      reply.status(403).send({ error: err.message })
    }
  })

  // DELETE /api/profile/albums/:albumId/photos/:photoId
  app.delete('/albums/:albumId/photos/:photoId', async (request, reply) => {
    const { id } = request.user as { id: string }
    const { photoId } = request.params as { albumId: string; photoId: string }
    try {
      await svc.deleteAlbumPhoto(id, photoId)
      reply.send({ ok: true })
    } catch (err: any) {
      reply.status(403).send({ error: err.message })
    }
  })

  // ── Услуги ───────────────────────────────────────────────────────────────

  // GET /api/profile/services
  app.get('/services', async (request, reply) => {
    const { id } = request.user as { id: string }
    const services = await svc.getServices(id)
    reply.send(services)
  })

  // POST /api/profile/services
  app.post('/services', async (request, reply) => {
    const { id } = request.user as { id: string }
    const body = serviceSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    const service = await svc.createService(id, body.data)
    reply.status(201).send(service)
  })

  // PATCH /api/profile/services/:serviceId
  app.patch('/services/:serviceId', async (request, reply) => {
    const { id } = request.user as { id: string }
    const { serviceId } = request.params as { serviceId: string }
    const body = serviceSchema.partial().safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    try {
      const service = await svc.updateService(id, serviceId, body.data)
      reply.send(service)
    } catch (err: any) {
      reply.status(403).send({ error: err.message })
    }
  })

  // DELETE /api/profile/services/:serviceId
  app.delete('/services/:serviceId', async (request, reply) => {
    const { id } = request.user as { id: string }
    const { serviceId } = request.params as { serviceId: string }
    try {
      await svc.deleteService(id, serviceId)
      reply.send({ ok: true })
    } catch (err: any) {
      reply.status(403).send({ error: err.message })
    }
  })

  // ── Доступность (календарь по датам) ────────────────────────────────────

  // GET /api/profile/availability
  app.get('/availability', async (request, reply) => {
    const { id } = request.user as { id: string }
    const dates = await svc.getAvailability(id)
    reply.send(dates)
  })

  // PUT /api/profile/availability/:date  (YYYY-MM-DD)
  app.put('/availability/:date', async (request, reply) => {
    const { id } = request.user as { id: string }
    const { date } = request.params as { date: string }
    const body = setAvailabilityDateSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    try {
      const entry = await svc.setAvailabilityDate(id, date, body.data)
      reply.send(entry)
    } catch (err: any) {
      reply.status(400).send({ error: err.message })
    }
  })

  // DELETE /api/profile/availability/:date
  app.delete('/availability/:date', async (request, reply) => {
    const { id } = request.user as { id: string }
    const { date } = request.params as { date: string }
    try {
      await svc.deleteAvailabilityDate(id, date)
      reply.send({ ok: true })
    } catch (err: any) {
      reply.status(400).send({ error: err.message })
    }
  })
}