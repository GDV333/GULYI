import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { AuthService } from './auth.service'

const registerSchema = z.object({
  name:     z.string().min(2).max(100),
  email:    z.string().email(),
  password: z.string().min(8),
  role:     z.enum(['client', 'vendor']),
  phone:    z.string().optional(),
  city:     z.string().max(80).optional(),
})

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string(),
})

const deleteAccountSchema = z.object({
  password: z.string().min(1),
})

const setupProfileSchema = z.object({
  categorySlug: z.string().min(2),
  city:         z.string().min(2).max(80),
  displayName:  z.string().min(2).max(120),
  bio:          z.string().max(1000).optional(),
  priceFrom:    z.number().int().positive().optional(),
  priceUnit:    z.string().max(40).optional(),
})

export async function authRoutes(app: FastifyInstance) {
  const authService = new AuthService(app)

  // POST /api/auth/register
  app.post('/register', async (request, reply) => {
    const body = registerSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    try {
      const result = await authService.register(body.data)
      reply.status(201).send(result)
    } catch (err: any) {
      reply.status(409).send({ error: err.message })
    }
  })

  // POST /api/auth/login
  app.post('/login', async (request, reply) => {
    const body = loginSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    try {
      const result = await authService.login(body.data)
      reply.send(result)
    } catch (err: any) {
      reply.status(401).send({ error: err.message })
    }
  })

  // POST /api/auth/setup-profile  (защищённый, только для vendor)
  app.post('/setup-profile', { onRequest: [(app as any).authenticate] }, async (request, reply) => {
    const payload = request.user as { id: string; role: string }
    if (payload.role !== 'vendor') {
      return reply.status(403).send({ error: 'Только для исполнителей' })
    }
    const body = setupProfileSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    try {
      const result = await authService.setupProfile(payload.id, body.data)
      reply.status(201).send(result)
    } catch (err: any) {
      reply.status(409).send({ error: err.message })
    }
  })

  // GET /api/auth/me  (защищённый)
  app.get('/me', { onRequest: [(app as any).authenticate] }, async (request, reply) => {
    const payload = request.user as { id: string }
    const user = await authService.getUser(payload.id)
    if (!user) return reply.status(404).send({ error: 'User not found' })
    reply.send(user)
  })
  // PATCH /api/auth/update
  app.patch('/update', { onRequest: [(app as any).authenticate] }, async (request, reply) => {
    const { id } = request.user as { id: string }
    const body = request.body as { name?: string; city?: string; currentPassword?: string; newPassword?: string }
    try {
      const result = await authService.updateAccount(id, body)
      reply.send(result)
    } catch (err: any) {
      reply.status(400).send({ error: err.message })
    }
  })

  // DELETE /api/auth/me — безвозвратное удаление аккаунта и всех связанных данных
  app.delete('/me', { onRequest: [(app as any).authenticate] }, async (request, reply) => {
    const { id } = request.user as { id: string }
    const body = deleteAccountSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    try {
      const result = await authService.deleteAccount(id, body.data.password)
      reply.send(result)
    } catch (err: any) {
      reply.status(400).send({ error: err.message })
    }
  })
}