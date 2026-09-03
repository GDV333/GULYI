import type { FastifyInstance } from 'fastify'
import { AdminService } from './admin.service'

export async function adminRoutes(app: FastifyInstance) {
  const svc = new AdminService()

  // Все эндпоинты — только для авторизованного администратора
  app.addHook('onRequest', (app as any).authenticate)
  app.addHook('preHandler', async (request, reply) => {
    const user = request.user as { role: string }
    if (user.role !== 'admin') {
      return reply.status(403).send({ error: 'Только для администратора' })
    }
  })

  // GET /api/admin/users — полный список зарегистрированных пользователей
  app.get('/users', async () => svc.listUsers())

  // GET /api/admin/stats — сводка по ролям
  app.get('/stats', async () => svc.stats())
}
