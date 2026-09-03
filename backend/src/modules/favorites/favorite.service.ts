import { eq, and, desc } from 'drizzle-orm'
import { db } from '../../db'
import { favorites } from '../../db/schema'

export class FavoriteService {
  // Полный список избранного пользователя — с данными профиля для карточек
  async list(userId: string) {
    return db.query.favorites.findMany({
      where: eq(favorites.userId, userId),
      orderBy: [desc(favorites.savedAt)],
      with: {
        profile: {
          columns: {
            id: true, displayName: true, city: true, avatarUrl: true,
            priceFrom: true, priceUnit: true, avgRating: true, reviewsCount: true,
          },
          with: {
            profileCategories: {
              where: (pc, { eq }) => eq(pc.isPrimary, true),
              with: { category: { columns: { slug: true, name: true, icon: true } } },
            },
          },
        },
      },
    })
  }

  // Лёгкий список id-шников — чтобы помечать сердечком карточки в каталоге/профиле
  async ids(userId: string) {
    const rows = await db.select({ profileId: favorites.profileId })
      .from(favorites)
      .where(eq(favorites.userId, userId))
    return rows.map(r => r.profileId)
  }

  async add(userId: string, profileId: string) {
    try {
      const [row] = await db.insert(favorites).values({ userId, profileId }).returning()
      return row
    } catch (err: any) {
      // уже в избранном (уникальный индекс user_id+profile_id) — считаем успехом, не ошибкой
      if (err.code === '23505') return { userId, profileId }
      throw err
    }
  }

  async remove(userId: string, profileId: string) {
    await db.delete(favorites).where(and(eq(favorites.userId, userId), eq(favorites.profileId, profileId)))
  }
}
