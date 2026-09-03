import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { eq, or, inArray } from 'drizzle-orm'
import { db } from '../../db'
import {
  users, profiles, profileCategories, categories,
  bookings, events, eventRoles, eventConversationMembers, eventMessages,
  conversations, reviews,
} from '../../db/schema'

interface RegisterDto {
  name: string
  email: string
  password: string
  role: 'client' | 'vendor'
  phone?: string
  city?: string
}

interface LoginDto {
  email: string
  password: string
}

interface SetupProfileDto {
  categorySlug: string
  city: string
  bio?: string
  priceFrom?: number
  priceUnit?: string
  displayName: string
}

export class AuthService {
  constructor(private app: FastifyInstance) {}

  async register(dto: RegisterDto) {
    const existing = await db.query.users.findFirst({
      where: eq(users.email, dto.email),
    })
    if (existing) throw new Error('Email уже используется')

    const passwordHash = await bcrypt.hash(dto.password, 12)

    const [user] = await db.insert(users).values({
      email:        dto.email,
      passwordHash,
      role:         dto.role,
    }).returning({
      id:    users.id,
      email: users.email,
      role:  users.role,
    })

    // Если клиент — создаём профиль сразу с именем и городом
    if (dto.role === 'client') {
      await db.insert(profiles).values({
        userId:      user.id,
        displayName: dto.name,
        city:        dto.city || '',
      })
    }

    const accessToken = this.app.jwt.sign({ id: user.id, role: user.role })

    return {
      user: {
        id:    user.id,
        name:  dto.name,
        email: user.email,
        role:  user.role,
      },
      accessToken,
    }
  }

  async login(dto: LoginDto) {
    const user = await db.query.users.findFirst({
      where: eq(users.email, dto.email),
      with: {
        profile: {
          columns: { displayName: true, avatarUrl: true },
        },
      },
    })

    if (!user) throw new Error('Неверный email или пароль')

    const valid = await bcrypt.compare(dto.password, user.passwordHash)
    if (!valid) throw new Error('Неверный email или пароль')

    const accessToken = this.app.jwt.sign({ id: user.id, role: user.role })

    return {
      user: {
        id:     user.id,
        name:   user.profile?.displayName ?? '',
        email:  user.email,
        role:   user.role,
        avatar: user.profile?.avatarUrl ?? null,
      },
      accessToken,
    }
  }

  async getUser(id: string) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, id),
      with: {
        profile: {
          columns: { displayName: true, avatarUrl: true, city: true },
        },
      },
    })
    if (!user) return null
    return {
      id:     user.id,
      email:  user.email,
      role:   user.role,
      name:   user.profile?.displayName ?? '',
      avatar: user.profile?.avatarUrl ?? null,
      city:   user.profile?.city ?? '',
    }
  }

  async setupProfile(userId: string, dto: SetupProfileDto) {
    // Находим категорию по slug
    const category = await db.query.categories.findFirst({
      where: eq(categories.slug, dto.categorySlug),
    })
    if (!category) throw new Error('Категория не найдена')

    // Создаём профиль
    const [profile] = await db.insert(profiles).values({
      userId:      userId,
      displayName: dto.displayName,
      bio:         dto.bio,
      city:        dto.city,
      priceFrom:   dto.priceFrom ? String(dto.priceFrom) : undefined,
      priceUnit:   dto.priceUnit,
    }).returning()

    // Привязываем категорию
    await db.insert(profileCategories).values({
      profileId:  profile.id,
      categoryId: category.id,
      isPrimary:  true,
    })
    return { profile }
  }
    async updateAccount(userId: string, dto: { name?: string; city?: string; currentPassword?: string; newPassword?: string }) {
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) })
    if (!user) throw new Error('Пользователь не найден')

    if (dto.newPassword) {
      if (!dto.currentPassword) throw new Error('Введите текущий пароль')
      const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash)
      if (!valid) throw new Error('Неверный текущий пароль')
      const passwordHash = await bcrypt.hash(dto.newPassword, 12)
      await db.update(users).set({ passwordHash }).where(eq(users.id, userId))
    }

    if (dto.name || dto.city !== undefined) {
      await db.update(profiles).set({
        displayName: dto.name || undefined,
        city:        dto.city !== undefined ? dto.city : undefined,
        updatedAt:   new Date(),
      }).where(eq(profiles.userId, userId))
    }

    return { ok: true }
  }

  async deleteAccount(userId: string, password: string) {
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) })
    if (!user) throw new Error('Пользователь не найден')

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) throw new Error('Неверный пароль')

    const profile = await db.query.profiles.findFirst({ where: eq(profiles.userId, userId) })

    await db.transaction(async (tx) => {
      // Заявки, которые исполнителю прислали другие заказчики — освобождаем роль в их мероприятии
      if (profile) {
        const vendorBookings = await tx.query.bookings.findMany({ where: eq(bookings.profileId, profile.id) })
        const roleIds = vendorBookings.map(b => b.eventRoleId).filter((id): id is string => !!id)
        await tx.delete(bookings).where(eq(bookings.profileId, profile.id))
        if (roleIds.length > 0) {
          await tx.update(eventRoles).set({ status: 'searching' }).where(inArray(eventRoles.id, roleIds))
        }
      }

      // Собственные брони как заказчика
      await tx.delete(bookings).where(eq(bookings.clientId, userId))

      // Участие в чужих групповых чатах мероприятий
      await tx.delete(eventMessages).where(eq(eventMessages.senderId, userId))
      await tx.delete(eventConversationMembers).where(eq(eventConversationMembers.userId, userId))

      // Собственные мероприятия (каскадом — роли, чат мероприятия и его сообщения)
      await tx.delete(events).where(eq(events.clientId, userId))

      // Отзывы, которые сам оставил другим
      await tx.delete(reviews).where(eq(reviews.authorId, userId))

      // Старые 1:1 диалоги (каскадом — их сообщения)
      await tx.delete(conversations).where(or(eq(conversations.clientId, userId), eq(conversations.vendorId, userId)))

      // Профиль (каскадом — портфолио, альбомы, услуги, контакты, категории, доступность, избранное и отзывы о профиле)
      if (profile) {
        await tx.delete(profiles).where(eq(profiles.id, profile.id))
      }

      await tx.delete(users).where(eq(users.id, userId))
    })

    return { ok: true }
  }
}