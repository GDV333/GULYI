import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { CatalogService } from './catalog.service'

// Границы важны не только для порядка: без них page=-1 уходил в SQL как
// отрицательный OFFSET, а date=abc — как Invalid Date, и оба валили запрос в 500.
const filtersSchema = z.object({
  categorySlug: z.string().max(80).optional(),
  city:         z.string().max(80).optional(),
  priceMin:     z.coerce.number().min(0).max(100_000_000).optional(),
  priceMax:     z.coerce.number().min(0).max(100_000_000).optional(),
  search:       z.string().max(120).optional(),
  date:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Дата в формате ГГГГ-ММ-ДД')
                  .refine(d => !Number.isNaN(Date.parse(d)), 'Некорректная дата').optional(),
  page:         z.coerce.number().int().min(1).max(10_000).default(1),
  limit:        z.coerce.number().int().min(1).max(50).default(12),
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
