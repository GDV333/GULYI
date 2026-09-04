import { eq, and, inArray, isNotNull } from 'drizzle-orm'
import { db } from '../../db'
import {
  events, eventRoles, eventConversations, eventConversationMembers, eventMessages,
  categories, bookings, profiles,
} from '../../db/schema'

interface CreateEventDto {
  eventType?:     string
  eventDate:      string
  eventTimeFrom?: string
  eventTimeTo?:   string
  city?:          string
  location?:      string
  guestsCount?:   number
  budget?:        number
  description?:   string
  roleCategorySlugs: string[]
}

interface UpdateEventDto {
  eventType?:     string
  eventDate?:     string
  eventTimeFrom?: string
  eventTimeTo?:   string
  city?:          string
  location?:      string
  guestsCount?:   number
  budget?:        number
  description?:   string
}

interface ResolveForBookingDto {
  eventId?:      string
  eventRoleId?:  string
  profileId:     string
  eventDate:     string
  eventTimeFrom?: string
  eventTimeTo?:  string
  eventType?:    string
  guestsCount?:  number
  location?:     string
  budget?:       number
  notes?:        string
}

export class EventService {
  async create(clientId: string, dto: CreateEventDto) {
    const foundCategories = dto.roleCategorySlugs.length > 0
      ? await db.query.categories.findMany({ where: inArray(categories.slug, dto.roleCategorySlugs) })
      : []

    const [event] = await db.insert(events).values({
      clientId,
      eventType:     dto.eventType,
      eventDate:     new Date(dto.eventDate),
      eventTimeFrom: dto.eventTimeFrom,
      eventTimeTo:   dto.eventTimeTo,
      city:          dto.city,
      location:      dto.location,
      guestsCount:   dto.guestsCount,
      budget:        dto.budget ? String(dto.budget) : undefined,
      description:   dto.description,
    }).returning()

    if (foundCategories.length > 0) {
      await db.insert(eventRoles).values(
        foundCategories.map(c => ({ eventId: event.id, categoryId: c.id }))
      )
    }

    await this.ensureConversation(event.id, clientId)

    return this.getById(event.id, clientId)
  }

  async listForUser(userId: string, role: 'client' | 'vendor') {
    if (role === 'client') {
      return db.query.events.findMany({
        where: eq(events.clientId, userId),
        orderBy: (e) => [e.eventDate],
      })
    }

    const profile = await db.query.profiles.findFirst({ where: eq(profiles.userId, userId) })
    if (!profile) return []

    const rows = await db.selectDistinct({ eventId: bookings.eventId })
      .from(bookings)
      .where(and(eq(bookings.profileId, profile.id), isNotNull(bookings.eventId)))

    const eventIds = rows.map(r => r.eventId).filter((id): id is string => !!id)
    if (eventIds.length === 0) return []

    return db.query.events.findMany({
      where: inArray(events.id, eventIds),
      orderBy: (e) => [e.eventDate],
    })
  }

  async getById(id: string, userId: string) {
    const event = await db.query.events.findFirst({
      where: eq(events.id, id),
      with: {
        roles: { with: { category: true } },
        bookings: {
          with: {
            profile: {
              columns: { id: true, displayName: true, city: true, avatarUrl: true, priceFrom: true, priceUnit: true },
            },
          },
          orderBy: (b) => [b.createdAt],
        },
        conversation: {
          with: { members: { with: { user: { columns: { id: true, email: true } } } } },
        },
      },
    })
    if (!event) throw new Error('Мероприятие не найдено')

    // Полный доступ — заказчик и подтверждённые исполнители (участники чата).
    if (await this.isMember(id, userId)) return event

    // Исполнитель с ещё не подтверждённой заявкой тоже может открыть мероприятие,
    // но видит только дату/город/роли и свою заявку — без чужих откликов и чата.
    const viewerProfile = await db.query.profiles.findFirst({ where: eq(profiles.userId, userId) })
    const ownBooking = viewerProfile
      && event.bookings.find(b => b.profile?.id === viewerProfile.id && b.status !== 'cancelled' && b.status !== 'refunded')
    if (ownBooking) {
      return {
        ...event,
        bookings: event.bookings.filter(b => b.profile?.id === viewerProfile!.id),
        conversation: null,
      }
    }

    throw new Error('Нет доступа к этому мероприятию')
  }

  async update(id: string, userId: string, dto: UpdateEventDto) {
    const event = await db.query.events.findFirst({ where: eq(events.id, id) })
    if (!event) throw new Error('Мероприятие не найдено')
    if (event.clientId !== userId) throw new Error('Нет доступа')

    await db.update(events).set({
      eventType:     dto.eventType,
      eventDate:     dto.eventDate ? new Date(dto.eventDate) : undefined,
      eventTimeFrom: dto.eventTimeFrom,
      eventTimeTo:   dto.eventTimeTo,
      city:          dto.city,
      location:      dto.location,
      guestsCount:   dto.guestsCount,
      budget:        dto.budget !== undefined ? String(dto.budget) : undefined,
      description:   dto.description,
      updatedAt:     new Date(),
    }).where(eq(events.id, id))

    return this.getById(id, userId)
  }

  async addRole(id: string, userId: string, categorySlug: string, notes?: string) {
    const event = await db.query.events.findFirst({ where: eq(events.id, id) })
    if (!event) throw new Error('Мероприятие не найдено')
    if (event.clientId !== userId) throw new Error('Нет доступа')

    const category = await db.query.categories.findFirst({ where: eq(categories.slug, categorySlug) })
    if (!category) throw new Error('Категория не найдена')

    await db.insert(eventRoles).values({ eventId: id, categoryId: category.id, notes })
    return this.getById(id, userId)
  }

  // Вызывается из BookingService.create — привязывает бронь к существующему
  // мероприятию (если пришёл eventId) либо создаёт новое «на лету».
  async resolveForBooking(clientId: string, dto: ResolveForBookingDto): Promise<{ eventId: string; eventRoleId?: string }> {
    if (dto.eventId) {
      const event = await db.query.events.findFirst({ where: eq(events.id, dto.eventId) })
      if (!event || event.clientId !== clientId) throw new Error('Мероприятие не найдено')

      if (dto.eventRoleId) {
        const role = await db.query.eventRoles.findFirst({ where: eq(eventRoles.id, dto.eventRoleId) })
        if (!role || role.eventId !== event.id) throw new Error('Роль не найдена в этом мероприятии')
      }

      return { eventId: event.id, eventRoleId: dto.eventRoleId }
    }

    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, dto.profileId),
      with: {
        profileCategories: {
          where: (pc) => eq(pc.isPrimary, true),
          with: { category: true },
        },
      },
    })
    if (!profile) throw new Error('Профиль не найден')

    // У брони нет отдельного поля "город" — берём город заказчика (указан в профиле),
    // а если он не заполнен, город исполнителя как разумный запасной вариант.
    // "Место проведения" (dto.location) — это адрес/площадка, а не город, его сюда не подставляем.
    const clientProfile = await db.query.profiles.findFirst({ where: eq(profiles.userId, clientId) })

    const [event] = await db.insert(events).values({
      clientId,
      eventType:     dto.eventType,
      eventDate:     new Date(dto.eventDate),
      eventTimeFrom: dto.eventTimeFrom,
      eventTimeTo:   dto.eventTimeTo,
      city:          clientProfile?.city || profile.city,
      location:      dto.location,
      guestsCount:   dto.guestsCount,
      budget:        dto.budget ? String(dto.budget) : undefined,
      description:   dto.notes,
    }).returning()

    await this.ensureConversation(event.id, clientId)

    const primaryCategory = profile.profileCategories?.[0]?.category
    let eventRoleId: string | undefined
    if (primaryCategory) {
      const [role] = await db.insert(eventRoles).values({
        eventId: event.id, categoryId: primaryCategory.id,
      }).returning()
      eventRoleId = role.id
    }

    return { eventId: event.id, eventRoleId }
  }

  // Вызывается из BookingService.confirm — заполняет роль, отменяет
  // конкурирующие заявки на неё и добавляет исполнителя в общий чат.
  async onBookingConfirmed(booking: { id: string; eventId: string | null; eventRoleId: string | null; profileId: string }) {
    if (!booking.eventId) return

    if (booking.eventRoleId) {
      await db.update(eventRoles).set({ status: 'filled' }).where(eq(eventRoles.id, booking.eventRoleId))
      // Отменяем конкурирующие заявки на ту же роль (сама бронь уже 'confirmed', под фильтр не попадёт)
      await db.update(bookings).set({ status: 'cancelled', updatedAt: new Date() }).where(
        and(
          eq(bookings.eventRoleId, booking.eventRoleId),
          eq(bookings.status, 'pending'),
        )
      )
    }

    const profile = await db.query.profiles.findFirst({ where: eq(profiles.id, booking.profileId) })
    if (!profile) return

    const conversation = await db.query.eventConversations.findFirst({ where: eq(eventConversations.eventId, booking.eventId) })
    if (!conversation) return

    await db.insert(eventConversationMembers)
      .values({ conversationId: conversation.id, userId: profile.userId })
      .onConflictDoNothing()
  }

  async checkout(id: string, userId: string) {
    const event = await db.query.events.findFirst({ where: eq(events.id, id) })
    if (!event) throw new Error('Мероприятие не найдено')
    if (event.clientId !== userId) throw new Error('Нет доступа')
    if (event.status === 'paid') throw new Error('Уже оплачено')

    const confirmed = await db.query.bookings.findMany({
      where: and(eq(bookings.eventId, id), eq(bookings.status, 'confirmed')),
    })
    if (confirmed.length === 0) throw new Error('Нет подтверждённых броней для оплаты')

    await db.transaction(async (tx) => {
      await tx.update(bookings).set({ status: 'paid', updatedAt: new Date() }).where(
        and(eq(bookings.eventId, id), eq(bookings.status, 'confirmed'))
      )
      await tx.update(events).set({ status: 'paid', paidAt: new Date(), updatedAt: new Date() }).where(eq(events.id, id))
    })

    return this.getById(id, userId)
  }

  async getChatMessages(id: string, userId: string) {
    if (!(await this.isMember(id, userId))) throw new Error('Нет доступа к этому чату')
    const conversation = await db.query.eventConversations.findFirst({ where: eq(eventConversations.eventId, id) })
    if (!conversation) return []
    return db.query.eventMessages.findMany({
      where: eq(eventMessages.conversationId, conversation.id),
      orderBy: (m) => [m.createdAt],
      with: { sender: { columns: { id: true, email: true } } },
    })
  }

  async sendChatMessage(id: string, userId: string, text: string) {
    if (!(await this.isMember(id, userId))) throw new Error('Нет доступа к этому чату')
    const conversation = await db.query.eventConversations.findFirst({ where: eq(eventConversations.eventId, id) })
    if (!conversation) throw new Error('Чат не найден')

    const [message] = await db.insert(eventMessages).values({
      conversationId: conversation.id,
      senderId:       userId,
      text,
    }).returning()

    return db.query.eventMessages.findFirst({
      where: eq(eventMessages.id, message.id),
      with: { sender: { columns: { id: true, email: true } } },
    })
  }

  private async ensureConversation(eventId: string, clientId: string) {
    let conversation = await db.query.eventConversations.findFirst({ where: eq(eventConversations.eventId, eventId) })
    if (!conversation) {
      const [created] = await db.insert(eventConversations).values({ eventId }).returning()
      conversation = created
    }
    await db.insert(eventConversationMembers)
      .values({ conversationId: conversation.id, userId: clientId })
      .onConflictDoNothing()
    return conversation
  }

  private async isMember(eventId: string, userId: string) {
    const event = await db.query.events.findFirst({ where: eq(events.id, eventId) })
    if (!event) return false
    if (event.clientId === userId) return true

    const conversation = await db.query.eventConversations.findFirst({ where: eq(eventConversations.eventId, eventId) })
    if (!conversation) return false

    const member = await db.query.eventConversationMembers.findFirst({
      where: and(eq(eventConversationMembers.conversationId, conversation.id), eq(eventConversationMembers.userId, userId)),
    })
    return !!member
  }
}
