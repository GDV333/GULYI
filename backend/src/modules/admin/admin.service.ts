import { desc, count, sql, gte, lt, and, ne, isNotNull } from 'drizzle-orm'
import { db } from '../../db'
import { users, bookings, events, reviews, siteVisits } from '../../db/schema'

const DAY = 86_400_000

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

  /** Короткая сводка по ролям — используется в шапке списка пользователей. */
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

  /** Развёрнутая статистика для дашборда: люди, посещения, мероприятия, брони, отзывы. */
  async overview() {
    const now = new Date()
    const startToday = new Date(now); startToday.setHours(0, 0, 0, 0)
    const ago = (days: number) => new Date(now.getTime() - days * DAY)

    const fillDays = (rows: { d: string; c: unknown; u?: unknown }[], days: number) => {
      const map = new Map(rows.map(r => [r.d, r]))
      const out: { date: string; count: number; unique?: number }[] = []
      for (let i = days - 1; i >= 0; i--) {
        const key = new Date(now.getTime() - i * DAY).toISOString().slice(0, 10)
        const r = map.get(key)
        out.push({
          date: key,
          count: Number(r?.c ?? 0),
          ...(rows.length && rows[0].u !== undefined ? { unique: Number(r?.u ?? 0) } : {}),
        })
      }
      return out
    }

    const uDay = sql<string>`to_char(${users.createdAt}, 'YYYY-MM-DD')`
    const vDay = sql<string>`to_char(${siteVisits.createdAt}, 'YYYY-MM-DD')`

    const [
      usersByRole, uNewToday, uNew7, uNew30, regRows,
      evByStatus, evPassed, evUpcoming, evCreated30,
      bkByStatus,
      rvAgg,
      topEventCities,
    ] = await Promise.all([
      db.select({ k: users.role, c: count() }).from(users).groupBy(users.role),
      db.select({ c: count() }).from(users).where(gte(users.createdAt, startToday)),
      db.select({ c: count() }).from(users).where(gte(users.createdAt, ago(7))),
      db.select({ c: count() }).from(users).where(gte(users.createdAt, ago(30))),
      db.select({ d: uDay, c: count() }).from(users).where(gte(users.createdAt, ago(29))).groupBy(uDay),

      db.select({ k: events.status, c: count() }).from(events).groupBy(events.status),
      db.select({ c: count() }).from(events).where(and(lt(events.eventDate, now), ne(events.status, 'cancelled'))),
      db.select({ c: count() }).from(events).where(and(gte(events.eventDate, now), ne(events.status, 'cancelled'))),
      db.select({ c: count() }).from(events).where(gte(events.createdAt, ago(30))),

      db.select({ k: bookings.status, c: count(), sum: sql<string>`coalesce(sum(${bookings.total}), 0)` }).from(bookings).groupBy(bookings.status),

      db.select({
        total:     count(),
        pending:   sql<string>`count(*) filter (where ${reviews.isModerated} = false)`,
        published: sql<string>`count(*) filter (where ${reviews.isModerated} = true)`,
        avg:       sql<string>`coalesce(round(avg(${reviews.rating}) filter (where ${reviews.isModerated} = true), 2), 0)`,
      }).from(reviews),

      db.select({ k: events.city, c: count() }).from(events)
        .where(isNotNull(events.city)).groupBy(events.city).orderBy(desc(count())).limit(6),
    ])

    const roles = Object.fromEntries(usersByRole.map(r => [r.k, Number(r.c)])) as Record<string, number>
    const evStatus = Object.fromEntries(evByStatus.map(r => [r.k, Number(r.c)])) as Record<string, number>
    const bkStatus = Object.fromEntries(bkByStatus.map(r => [r.k, { count: Number(r.c), sum: Number(r.sum) }]))
    const bkGet = (s: string) => bkStatus[s] ?? { count: 0, sum: 0 }

    const bookingsTotal = Object.values(bkStatus).reduce((a, b) => a + b.count, 0)
    const accepted = bkGet('confirmed').count + bkGet('paid').count + bkGet('completed').count
    const revenue = bkGet('paid').sum + bkGet('completed').sum
    const paidCount = bkGet('paid').count + bkGet('completed').count

    // Посещения — отдельно и мягко: если миграция ещё не применена, отдаём нули
    let visits = {
      total: 0, today: 0, week: 0, uniqueWeek: 0,
      series: fillDays([], 14) as { date: string; count: number; unique?: number }[],
      topReferrers: [] as { name: string; count: number }[],
      topPaths: [] as { name: string; count: number }[],
    }
    try {
      const [vTotal, vToday, vWeek, visitRows, topRef, topPaths] = await Promise.all([
        db.select({ c: count() }).from(siteVisits),
        db.select({ c: count() }).from(siteVisits).where(gte(siteVisits.createdAt, startToday)),
        db.select({ c: count(), u: sql<string>`count(distinct ${siteVisits.sessionId})` }).from(siteVisits).where(gte(siteVisits.createdAt, ago(7))),
        db.select({ d: vDay, c: count(), u: sql<string>`count(distinct ${siteVisits.sessionId})` }).from(siteVisits).where(gte(siteVisits.createdAt, ago(13))).groupBy(vDay),
        db.select({ k: siteVisits.referrer, c: count() }).from(siteVisits)
          .where(and(gte(siteVisits.createdAt, ago(30)), isNotNull(siteVisits.referrer)))
          .groupBy(siteVisits.referrer).orderBy(desc(count())).limit(6),
        db.select({ k: siteVisits.path, c: count() }).from(siteVisits)
          .where(gte(siteVisits.createdAt, ago(30)))
          .groupBy(siteVisits.path).orderBy(desc(count())).limit(6),
      ])
      visits = {
        total:      Number(vTotal[0]?.c ?? 0),
        today:      Number(vToday[0]?.c ?? 0),
        week:       Number(vWeek[0]?.c ?? 0),
        uniqueWeek: Number(vWeek[0]?.u ?? 0),
        series:     fillDays(visitRows.map(r => ({ d: r.d, c: r.c, u: r.u })), 14),
        topReferrers: topRef.map(r => ({ name: r.k as string, count: Number(r.c) })),
        topPaths:     topPaths.map(r => ({ name: r.k as string, count: Number(r.c) })),
      }
    } catch { /* таблица site_visits ещё не создана */ }

    const rv = rvAgg[0]

    return {
      generatedAt: now,
      users: {
        total:    Object.values(roles).reduce((a, b) => a + b, 0),
        client:   roles.client ?? 0,
        vendor:   roles.vendor ?? 0,
        admin:    roles.admin ?? 0,
        newToday: Number(uNewToday[0]?.c ?? 0),
        new7d:    Number(uNew7[0]?.c ?? 0),
        new30d:   Number(uNew30[0]?.c ?? 0),
        series:   fillDays(regRows.map(r => ({ d: r.d, c: r.c })), 30),
      },
      visits,
      events: {
        total:     Object.values(evStatus).reduce((a, b) => a + b, 0),
        active:    evStatus.active ?? 0,
        paid:      evStatus.paid ?? 0,
        completed: evStatus.completed ?? 0,
        cancelled: evStatus.cancelled ?? 0,
        passed:    Number(evPassed[0]?.c ?? 0),
        upcoming:  Number(evUpcoming[0]?.c ?? 0),
        new30d:    Number(evCreated30[0]?.c ?? 0),
        topCities: topEventCities.map(r => ({ name: r.k as string, count: Number(r.c) })),
      },
      bookings: {
        total:        bookingsTotal,
        pending:      bkGet('pending').count,
        confirmed:    bkGet('confirmed').count,
        paid:         bkGet('paid').count,
        completed:    bkGet('completed').count,
        cancelled:    bkGet('cancelled').count,
        acceptRate:   bookingsTotal ? Math.round((accepted / bookingsTotal) * 100) : 0,
        revenue,
        avgCheck:     paidCount ? Math.round(revenue / paidCount) : 0,
      },
      reviews: {
        total:     Number(rv?.total ?? 0),
        pending:   Number(rv?.pending ?? 0),
        published: Number(rv?.published ?? 0),
        avgRating: Number(rv?.avg ?? 0),
      },
    }
  }
}
