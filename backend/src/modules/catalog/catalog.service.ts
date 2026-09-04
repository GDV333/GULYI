import { eq, and, gte, lte, ilike, desc, asc, sql, count, notInArray, inArray } from 'drizzle-orm'
import { db } from '../../db'
import { profiles, profileCategories, categories, portfolioItems, reviews, albums, services, bookings } from '../../db/schema'

interface ListFilters {
  categorySlug?: string
  city?: string
  priceMin?: number
  priceMax?: number
  search?: string
  date?: string
  page: number
  limit: number
  sortBy: 'rating' | 'price_asc' | 'price_desc' | 'reviews'
}

export class CatalogService {
  async list(filters: ListFilters) {
    const conditions = []

    if (filters.city) {
      conditions.push(ilike(profiles.city, `%${filters.city}%`))
    }
    if (filters.priceMin) {
      conditions.push(gte(profiles.priceFrom, String(filters.priceMin)))
    }
    if (filters.priceMax) {
      conditions.push(lte(profiles.priceFrom, String(filters.priceMax)))
    }
    if (filters.search) {
      conditions.push(ilike(profiles.displayName, `%${filters.search}%`))
    }

    conditions.push(eq(profiles.isActive, true))
    conditions.push(
      sql`EXISTS (
        SELECT 1 FROM users u WHERE u.id = ${profiles.userId} AND u.role = 'vendor'
      )`
    )

    if (filters.categorySlug) {
      const category = await db.query.categories.findFirst({
        where: eq(categories.slug, filters.categorySlug),
      })
      if (category) {
        conditions.push(
          sql`EXISTS (
            SELECT 1 FROM profile_categories pc
            WHERE pc.profile_id = ${profiles.id}
            AND pc.category_id = ${category.id}
          )`
        )
      }
    }

    // Фильтр по дате — исключаем занятых исполнителей
    if (filters.date) {
    const dateStart = new Date(filters.date)
    dateStart.setHours(0, 0, 0, 0)
    const dateEnd = new Date(filters.date)
    dateEnd.setHours(23, 59, 59, 999)

      // confirmed/paid/completed — не только confirmed, иначе оплаченная бронь
      // "освобождает" исполнителя для повторного бронирования на ту же дату
      const busyBookings = await db.select({ profileId: bookings.profileId })
        .from(bookings)
        .where(
          and(
            inArray(bookings.status, ['confirmed', 'paid', 'completed']),
            gte(bookings.eventDate, dateStart),
            lte(bookings.eventDate, dateEnd),
          )
        )

      const busyProfileIds = busyBookings.map(b => b.profileId)

      if (busyProfileIds.length > 0) {
        conditions.push(notInArray(profiles.id, busyProfileIds))
      }
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined

    const orderBy = {
      rating:     desc(profiles.avgRating),
      reviews:    desc(profiles.reviewsCount),
      price_asc:  asc(profiles.priceFrom),
      price_desc: desc(profiles.priceFrom),
    }[filters.sortBy]

    const offset = (filters.page - 1) * filters.limit

    const [data, [{ total }]] = await Promise.all([
      db.query.profiles.findMany({
        where,
        limit:   filters.limit,
        offset,
        orderBy: [orderBy],
        with: {
          user:              { columns: { role: true } },
          profileCategories: {
            where: eq(profileCategories.isPrimary, true),
            with:  { category: { columns: { slug: true, name: true, icon: true } } },
          },
          portfolio: { limit: 1, orderBy: (p) => [asc(p.sortOrder)] },
        },
      }),
      db.select({ total: count() }).from(profiles).where(where),
    ])

    return {
      data,
      total:      Number(total),
      page:       filters.page,
      limit:      filters.limit,
      totalPages: Math.ceil(Number(total) / filters.limit),
    }
  }

  async getById(id: string) {
    const todayStr = new Date().toISOString().split('T')[0]
    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, id),
      with: {
        user:              { columns: { role: true } },
        profileCategories: { with: { category: true } },
        contacts:  { where: (c: any) => eq(c.isVisible, true) },
        portfolio: { orderBy: (p) => [asc(p.sortOrder)] },
        albums: {
          orderBy: (a) => [asc(a.sortOrder)],
          with: { photos: { orderBy: (p) => [asc(p.sortOrder)] } },
        },
        availabilityDates: {
          where: (a) => gte(a.date, todayStr),
          orderBy: (a) => [asc(a.date)],
        },
        services: {
          where: (s) => eq(s.isActive, true),
          orderBy: (s) => [asc(s.sortOrder)],
        },
        reviews: {
          where: (r) => eq(r.isModerated, true),
          limit: 10,
          orderBy: (r) => [desc(r.createdAt)],
          with: { author: { columns: { id: true } } },
        },
      },
    })
    if (!profile || profile.user.role !== 'vendor') return null
    return profile
  }

  async getBySlug(slug: string) {
    return this.getById(slug)
  }
}