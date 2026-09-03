import { eq, and, desc } from 'drizzle-orm'
import { db } from '../../db'
import { reviews, profiles } from '../../db/schema'

interface CreateReviewDto {
  authorId:  string
  profileId: string
  rating:    number
  comment?:  string
}

export class ReviewService {
  // Клиент оставляет отзыв — уходит на модерацию (isModerated: false)
  async create(dto: CreateReviewDto) {
    // Отзыв можно оставить после прошедшего мероприятия с этим исполнителем: бронь либо уже
    // помечена завершённой, либо оплачена и её дата уже в прошлом (не дожидаемся отдельного
    // действия, которое перевело бы статус в 'completed' — иначе отзыв было бы не оставить)
    const eligibleBooking = await db.query.bookings.findFirst({
      where: (b, { eq, and, or, lt }) => and(
        eq(b.clientId, dto.authorId),
        eq(b.profileId, dto.profileId),
        or(
          eq(b.status, 'completed'),
          and(eq(b.status, 'paid'), lt(b.eventDate, new Date())),
        ),
      ),
    })
    if (!eligibleBooking) {
      throw new Error('Оставить отзыв можно только после завершённого мероприятия с этим исполнителем')
    }

    const existing = await db.query.reviews.findFirst({
      where: (r, { eq, and }) => and(eq(r.authorId, dto.authorId), eq(r.profileId, dto.profileId)),
    })
    if (existing) {
      throw new Error('Вы уже оставили отзыв этому исполнителю')
    }

    const [review] = await db.insert(reviews).values({
      authorId:    dto.authorId,
      profileId:   dto.profileId,
      rating:      dto.rating,
      comment:     dto.comment,
      isModerated: false,
    }).returning()

    return review
  }

  // Очередь модерации для админа
  async listPending() {
    return db.query.reviews.findMany({
      where: eq(reviews.isModerated, false),
      orderBy: [desc(reviews.createdAt)],
      with: {
        author:  { columns: { id: true, email: true } },
        profile: { columns: { id: true, displayName: true } },
      },
    })
  }

  async approve(id: string) {
    const [review] = await db.update(reviews)
      .set({ isModerated: true })
      .where(eq(reviews.id, id))
      .returning()
    if (!review) throw new Error('Отзыв не найден')

    await this.recalculateProfileRating(review.profileId)
    return review
  }

  // Отклонённый отзыв просто удаляется — отдельного статуса "rejected" в схеме нет
  async reject(id: string) {
    const [review] = await db.delete(reviews).where(eq(reviews.id, id)).returning()
    if (!review) throw new Error('Отзыв не найден')
    return review
  }

  private async recalculateProfileRating(profileId: string) {
    const approved = await db.query.reviews.findMany({
      where: (r, { eq, and }) => and(eq(r.profileId, profileId), eq(r.isModerated, true)),
      columns: { rating: true },
    })
    const reviewsCount = approved.length
    const avgRating = reviewsCount > 0
      ? (approved.reduce((sum, r) => sum + r.rating, 0) / reviewsCount).toFixed(2)
      : '0'

    await db.update(profiles)
      .set({ avgRating, reviewsCount })
      .where(eq(profiles.id, profileId))
  }
}
