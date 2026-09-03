import { desc, count } from 'drizzle-orm'
import { db } from '../../db'
import { users, bookings, events } from '../../db/schema'

export class AdminService {
  /** Полный список зарегистрированных пользователей с профилем и агрегатами. */
  async listUsers() {
    const rows = await db.query.users.findMany({
      orderBy: [desc(users.createdAt)],
      with: {
        profile: {
          columns: {
            id: true, displayName: true, city: true, avatarUrl: true,
            priceFrom: true, priceUnit: true, reviewsCount: true,
            avgRating: true, isActive: true,
          },
        },
      },
    })

    // Счётчики одним запросом на таблицу, затем раскладываем по id
    const [clientBookings, createdEvents, vendorBookings] = await Promise.all([
      db.select({ k: bookings.clientId, c: count() }).from(bookings).groupBy(bookings.clientId),
      db.select({ k: events.clientId, c: count() }).from(events).groupBy(events.clientId),
      db.select({ k: bookings.profileId, c: count() }).from(bookings).groupBy(bookings.profileId),
    ])
    const cbMap = new Map(clientBookings.map(r => [r.k, Number(r.c)]))
    const evMap = new Map(createdEvents.map(r => [r.k, Number(r.c)]))
    const vbMap = new Map(vendorBookings.map(r => [r.k, Number(r.c)]))

    return rows.map(u => ({
      id:               u.id,
      email:            u.email,
      role:             u.role,
      isVerified:       u.isVerified,
      createdAt:        u.createdAt,
      name:             u.profile?.displayName ?? null,
      city:             u.profile?.city || null,
      avatarUrl:        u.profile?.avatarUrl ?? null,
      hasProfile:       !!u.profile,
      profileActive:    u.profile?.isActive ?? null,
      priceFrom:        u.profile?.priceFrom ?? null,
      priceUnit:        u.profile?.priceUnit ?? null,
      reviewsCount:     u.profile?.reviewsCount ?? 0,
      avgRating:        u.profile?.avgRating ?? null,
      bookingsAsClient: cbMap.get(u.id) ?? 0,
      eventsCreated:    evMap.get(u.id) ?? 0,
      bookingsAsVendor: u.profile ? (vbMap.get(u.profile.id) ?? 0) : 0,
    }))
  }

  /** Сводка по количеству пользователей и разбивке по ролям. */
  async stats() {
    const byRole = await db.select({ role: users.role, c: count() }).from(users).groupBy(users.role)
    const counts = Object.fromEntries(byRole.map(r => [r.role, Number(r.c)])) as Record<string, number>
    return {
      total:  Object.values(counts).reduce((a, b) => a + b, 0),
      client: counts.client ?? 0,
      vendor: counts.vendor ?? 0,
      admin:  counts.admin ?? 0,
    }
  }
}
