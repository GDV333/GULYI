import { eq, or, and, ne, isNull, inArray, asc, desc, count } from 'drizzle-orm'
import { db } from '../../db'
import { conversations, messages } from '../../db/schema'

export class ChatService {
  // Список диалогов пользователя — и как клиента, и как исполнителя, с числом непрочитанных
  async listConversations(userId: string) {
    const rows = await db.query.conversations.findMany({
      where: or(eq(conversations.clientId, userId), eq(conversations.vendorId, userId)),
      orderBy: [desc(conversations.createdAt)],
      with: {
        booking: { columns: { id: true, eventDate: true, eventType: true, status: true } },
        client:  { columns: { id: true, email: true }, with: { profile: { columns: { displayName: true, avatarUrl: true } } } },
        vendor:  { columns: { id: true, email: true }, with: { profile: { columns: { displayName: true, avatarUrl: true } } } },
        messages: { orderBy: [desc(messages.createdAt)], limit: 1 },
      },
    })

    if (rows.length === 0) return []

    const unread = await db.select({ conversationId: messages.conversationId, count: count() })
      .from(messages)
      .where(and(
        inArray(messages.conversationId, rows.map(r => r.id)),
        ne(messages.senderId, userId),
        isNull(messages.readAt),
      ))
      .groupBy(messages.conversationId)

    const unreadMap = new Map(unread.map(u => [u.conversationId, Number(u.count)]))

    return rows.map(r => ({ ...r, unreadCount: unreadMap.get(r.id) || 0 }))
  }

  // Найти диалог по id брони — чтобы со страницы брони сразу открыть переписку
  async findByBookingId(userId: string, bookingId: string) {
    const conv = await db.query.conversations.findFirst({
      where: eq(conversations.bookingId, bookingId),
    })
    if (!conv || (conv.clientId !== userId && conv.vendorId !== userId)) return null
    return conv
  }

  private async assertParticipant(conversationId: string, userId: string) {
    const conv = await db.query.conversations.findFirst({ where: eq(conversations.id, conversationId) })
    if (!conv || (conv.clientId !== userId && conv.vendorId !== userId)) return null
    return conv
  }

  async getMessages(conversationId: string, userId: string) {
    const conv = await this.assertParticipant(conversationId, userId)
    if (!conv) throw new Error('Диалог не найден')

    // Открыли диалог — отмечаем сообщения собеседника прочитанными
    await db.update(messages)
      .set({ readAt: new Date() })
      .where(and(
        eq(messages.conversationId, conversationId),
        ne(messages.senderId, userId),
        isNull(messages.readAt),
      ))

    return db.query.messages.findMany({
      where: eq(messages.conversationId, conversationId),
      orderBy: [asc(messages.createdAt)],
      with: { sender: { columns: { id: true, email: true } } },
    })
  }

  async sendMessage(conversationId: string, userId: string, text: string) {
    const conv = await this.assertParticipant(conversationId, userId)
    if (!conv) throw new Error('Диалог не найден')

    const [message] = await db.insert(messages).values({
      conversationId,
      senderId: userId,
      text,
    }).returning()

    return message
  }
}
