import type { FastifyInstance } from 'fastify'
import { FavoriteService } from './favorite.service'

export async function favoriteRoutes(app: FastifyInstance) {
  const svc = new FavoriteService()

  app.addHook('onRequest', (app as any).authenticate)

  // GET /api/favorites — список избранного (для страницы «Избранное»)
  app.get('/', async (request, reply) => {
    const { id } = request.user as { id: string }
    const list = await svc.list(id)
    reply.send(list)
  })

  // GET /api/favorites/ids — только id профилей (для сердечек на карточках)
  app.get('/ids', async (request, reply) => {
    const { id } = request.user as { id: string }
    const ids = await svc.ids(id)
    reply.send(ids)
  })

  // POST /api/favorites/:profileId — добавить в избранное
  app.post('/:profileId', async (request, reply) => {
    const { id } = request.user as { id: string }
    const { profileId } = request.params as { profileId: string }
    const row = await svc.add(id, profileId)
    reply.status(201).send(row)
  })

  // DELETE /api/favorites/:profileId — убрать из избранного
  app.delete('/:profileId', async (request, reply) => {
    const { id } = request.user as { id: string }
    const { profileId } = request.params as { profileId: string }
    await svc.remove(id, profileId)
    reply.send({ ok: true })
  })
}
