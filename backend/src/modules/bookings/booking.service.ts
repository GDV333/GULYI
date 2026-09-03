import { eq, and, or, inArray, lt } from 'drizzle-orm'
import { db } from '../../db'
import { bookings, profiles, eventRoles } from '../../db/schema'
import { EventService } from '../events/event.service'

// Брони в этих статусах занимают дату/время исполнителя — используется и в проверке
// свободных слотов, и в фильтре каталога по дате (иначе оплаченная бронь "освобождает"
// исполнителя для повторного бронирования на то же время).
const OCCUPYING_STATUSES = ['confirmed', 'paid', 'completed'] as const

const eventSvc = new EventService()

export class BookingService {
  async create(dto: {
  clientId:      string
  profileId:     string
  eventId?:      string
  eventRoleId?:  string
  eventDate:     string
  eventTimeFrom?: string
  eventTimeTo?:   string
  eventType?:    string
  guestsCount?:  number
  ageCategory?:  string
  duration?:     number
  location?:     string
  budget?:       number
  notes?:        string
}) {
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, dto.profileId),
  })
  if (!profile) throw new Error('Профиль не найден')

  // Сумму брони считаем сами по цене исполнителя — клиенту нельзя доверять
  // (иначе можно было бы отправить любую цену прямо в теле запроса)
  const total = Number(profile.priceFrom) || 0

  const { eventId, eventRoleId } = await eventSvc.resolveForBooking(dto.clientId, dto)

  const [booking] = await db.insert(bookings).values({
    clientId:      dto.clientId,
    profileId:     dto.profileId,
    eventId,
    eventRoleId,
    eventDate:     new Date(dto.eventDate),
    eventTimeFrom: dto.eventTimeFrom,
    eventTimeTo:   dto.eventTimeTo,
    eventType:     dto.eventType,
    guestsCount:   dto.guestsCount,
    ageCategory:   dto.ageCategory,
    duration:      dto.duration,
    location:      dto.location,
    total:         String(total),
    notes:         dto.notes,
    status:        'pending',
  }).returning()

    return booking
  }

  // Оплаченная бронь, чья дата уже прошла, считается завершённой — без этого
  // статус 'completed' никогда бы не наступал сам по себе, и отзыв было бы не оставить
  private async autoCompletePastDue(where: ReturnType<typeof eq>) {
    await db.update(bookings)
      .set({ status: 'completed', updatedAt: new Date() })
      .where(and(where, eq(bookings.status, 'paid'), lt(bookings.eventDate, new Date())))
  }

  async listForUser(userId: string, role: 'client' | 'vendor') {
    if (role === 'client') {
      await this.autoCompletePastDue(eq(bookings.clientId, userId))
      return db.query.bookings.findMany({
        where: eq(bookings.clientId, userId),
        with: {
          profile: {
            columns: { id: true, displayName: true, city: true, avatarUrl: true },
            with: {
              profileCategories: {
                where: (pc) => eq(pc.isPrimary, true),
                with:  { category: { columns: { slug: true, name: true, icon: true } } },
              },
            },
          },
        },
        orderBy: (b) => [b.createdAt],
      })
    }

    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.userId, userId),
    })
    if (!profile) return []

    await this.autoCompletePastDue(eq(bookings.profileId, profile.id))
    return db.query.bookings.findMany({
      where: eq(bookings.profileId, profile.id),
      with: {
        client: {
          columns: { id: true, email: true },
          with: { profile: { columns: { displayName: true, avatarUrl: true } } },
        },
      },
      orderBy: (b) => [b.createdAt],
    })
  }

  // Возвращает занятые слоты — confirmed/paid/completed, а не только confirmed
  // (иначе исполнитель "освобождался" бы в поиске сразу после оплаты его же брони)
  async getBusySlots(profileId: string) {
    const occupied = await db.query.bookings.findMany({
      where: (b, { eq, and }) => and(
        eq(b.profileId, profileId),
        inArray(b.status, OCCUPYING_STATUSES),
      ),
      columns: { eventDate: true, eventTimeFrom: true, eventTimeTo: true },
    })

    return occupied.map(b => ({
      date:     b.eventDate.toISOString().split('T')[0],
      timeFrom: b.eventTimeFrom,
      timeTo:   b.eventTimeTo,
    }))
  }

  // Бронь видят и меняют только её участники: заказчик и исполнитель, которому она отправлена
  private async assertParticipant(bookingId: string, userId: string, opts: { vendorOnly?: boolean } = {}) {
    const booking = await db.query.bookings.findFirst({ where: eq(bookings.id, bookingId) })
    if (!booking) throw new Error('Бронь не найдена')

    const profile = await db.query.profiles.findFirst({ where: eq(profiles.id, booking.profileId) })
    const isVendor = profile?.userId === userId
    const isClient = booking.clientId === userId

    if (opts.vendorOnly ? !isVendor : !(isVendor || isClient)) {
      throw new Error('Нет доступа к этой брони')
    }
    return booking
  }

  async confirm(id: string, vendorId: string) {
    await this.assertParticipant(id, vendorId, { vendorOnly: true })

    const [updated] = await db
      .update(bookings)
      .set({ status: 'confirmed', updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning()

    if (updated) {
      await eventSvc.onBookingConfirmed(updated)
    }

    return updated
  }

  async cancel(id: string, userId: string) {
    await this.assertParticipant(id, userId)

    const [updated] = await db
      .update(bookings)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning()
    return updated
  }

  async complete(id: string, userId: string) {
    await this.assertParticipant(id, userId)

    const [updated] = await db
      .update(bookings)
      .set({ status: 'completed', updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning()
    return updated
  }

  async delete(id: string, userId: string) {
    const booking = await db.query.bookings.findFirst({ where: eq(bookings.id, id) })
    if (!booking) throw new Error('Бронь не найдена')

    const isClient = booking.clientId === userId
    let isVendor = false
    if (!isClient) {
      const profile = await db.query.profiles.findFirst({ where: eq(profiles.id, booking.profileId) })
      isVendor = profile?.userId === userId
    }
    if (!isClient && !isVendor) throw new Error('Нет доступа к этой брони')

    if (!['cancelled', 'completed', 'refunded'].includes(booking.status)) {
      throw new Error('Можно удалить только отменённую или завершённую бронь')
    }

    await db.delete(bookings).where(eq(bookings.id, id))

    // Если эта бронь была последней, занимавшей роль в мероприятии — освобождаем роль
    if (booking.eventRoleId) {
      const stillFilled = await db.query.bookings.findFirst({
        where: and(eq(bookings.eventRoleId, booking.eventRoleId), or(eq(bookings.status, 'confirmed'), eq(bookings.status, 'paid'))),
      })
      if (!stillFilled) {
        await db.update(eventRoles).set({ status: 'searching' }).where(eq(eventRoles.id, booking.eventRoleId))
      }
    }

    return { ok: true }
  }
}