import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { CatalogService } from './catalog.service'

const filtersSchema = z.object({
  categorySlug: z.string().optional(),
  city:         z.string().optional(),
  priceMin:     z.coerce.number().optional(),
  priceMax:     z.coerce.number().optional(),
  search:       z.string().optional(),
  date:         z.string().optional(),
  page:         z.coerce.number().default(1),
  limit:        z.coerce.number().max(50).default(12),
  sortBy:       z.enum(['rating','price_asc','price_desc','reviews']).default('rating'),
})

export async function catalogRoutes(app: FastifyInstance) {
  const catalogService = new CatalogService()

  // GET /api/catalog
  app.get('/', async (request, reply) => {
    const filters = filtersSchema.safeParse(request.query)
    if (!filters.success) return reply.status(400).send({ error: filters.error.flatten() })

    const result = await catalogService.list(filters.data)
    reply.send(result)
  })

  // GET /api/catalog/:id
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const profile = await catalogService.getById(id)

    if (!profile) return reply.status(404).send({ error: 'Исполнитель не найден' })
    reply.send(profile)
  })

  // GET /api/catalog/slug/:slug  (для SEO-friendly URL)
  app.get('/slug/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string }
    const profile = await catalogService.getBySlug(slug)

    if (!profile) return reply.status(404).send({ error: 'Исполнитель не найден' })
    reply.send(profile)
  })
}
