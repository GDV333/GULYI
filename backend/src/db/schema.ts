import {
  pgTable, uuid, varchar, text, integer, decimal,
  boolean, timestamp, pgEnum, index, uniqueIndex,
  smallint, date,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ─── Enums ───────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum('user_role', ['client', 'vendor', 'admin'])

export const bookingStatusEnum = pgEnum('booking_status', [
  'pending', 'confirmed', 'paid', 'completed', 'cancelled', 'refunded',
])

export const eventStatusEnum = pgEnum('event_status', ['active', 'paid', 'completed', 'cancelled'])

export const eventRoleStatusEnum = pgEnum('event_role_status', ['searching', 'filled', 'cancelled'])

// ─── Users ───────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id:           uuid('id').primaryKey().defaultRandom(),
  email:        varchar('email', { length: 255 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role:         userRoleEnum('role').notNull().default('client'),
  isVerified:   boolean('is_verified').notNull().default(false),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  emailIdx: uniqueIndex('users_email_idx').on(t.email),
}))

// ─── Categories ──────────────────────────────────────────────────────────────

export const categories = pgTable('categories', {
  id:        uuid('id').primaryKey().defaultRandom(),
  slug:      varchar('slug', { length: 80 }).notNull(),
  name:      varchar('name', { length: 100 }).notNull(),
  icon:      varchar('icon', { length: 10 }),
  sortOrder: integer('sort_order').notNull().default(0),
}, (t) => ({
  slugIdx: uniqueIndex('categories_slug_idx').on(t.slug),
}))

// ─── Profiles ────────────────────────────────────────────────────────────────

export const profiles = pgTable('profiles', {
  id:              uuid('id').primaryKey().defaultRandom(),
  userId:          uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  displayName:     varchar('display_name', { length: 120 }).notNull(),
  bio:             text('bio'),
  city:            varchar('city', { length: 80 }).notNull(),
  avatarUrl:       text('avatar_url'),
  experienceYears: integer('experience_years'),
  priceFrom:       decimal('price_from', { precision: 10, scale: 2 }),
  priceUnit:       varchar('price_unit', { length: 40 }),
  avgRating:       decimal('avg_rating', { precision: 3, scale: 2 }).default('0'),
  reviewsCount:    integer('reviews_count').notNull().default(0),
  isActive:        boolean('is_active').notNull().default(true),
  updatedAt:       timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  userIdx: uniqueIndex('profiles_user_idx').on(t.userId),
  cityIdx: index('profiles_city_idx').on(t.city),
}))

// ─── Profile Categories ───────────────────────────────────────────────────────

export const profileCategories = pgTable('profile_categories', {
  id:         uuid('id').primaryKey().defaultRandom(),
  profileId:  uuid('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id').notNull().references(() => categories.id, { onDelete: 'cascade' }),
  isPrimary:  boolean('is_primary').notNull().default(false),
}, (t) => ({
  profileCatIdx: uniqueIndex('profile_categories_idx').on(t.profileId, t.categoryId),
}))

// ─── Profile Contacts ────────────────────────────────────────────────────────

export const profileContacts = pgTable('profile_contacts', {
  id:        uuid('id').primaryKey().defaultRandom(),
  profileId: uuid('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  platform:  varchar('platform', { length: 40 }).notNull(),
  value:     varchar('value', { length: 255 }).notNull(),
  isVisible: boolean('is_visible').notNull().default(true),
})

// ─── Portfolio Items ──────────────────────────────────────────────────────────

export const portfolioItems = pgTable('portfolio_items', {
  id:        uuid('id').primaryKey().defaultRandom(),
  profileId: uuid('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  title:     varchar('title', { length: 120 }),
  mediaUrl:  text('media_url').notNull(),
  mediaType: varchar('media_type', { length: 10 }).notNull().default('image'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  profileIdx: index('portfolio_profile_idx').on(t.profileId),
}))

// ─── Albums ──────────────────────────────────────────────────────────────────

export const albums = pgTable('albums', {
  id:          uuid('id').primaryKey().defaultRandom(),
  profileId:   uuid('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  title:       varchar('title', { length: 120 }).notNull(),
  description: text('description'),
  coverUrl:    text('cover_url'),
  sortOrder:   integer('sort_order').notNull().default(0),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  profileIdx: index('albums_profile_idx').on(t.profileId),
}))

// ─── Album Photos ─────────────────────────────────────────────────────────────

export const albumPhotos = pgTable('album_photos', {
  id:        uuid('id').primaryKey().defaultRandom(),
  albumId:   uuid('album_id').notNull().references(() => albums.id, { onDelete: 'cascade' }),
  mediaUrl:  text('media_url').notNull(),
  mediaType: varchar('media_type', { length: 10 }).notNull().default('image'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  albumIdx: index('album_photos_album_idx').on(t.albumId),
}))

// ─── Services ─────────────────────────────────────────────────────────────────

export const services = pgTable('services', {
  id:          uuid('id').primaryKey().defaultRandom(),
  profileId:   uuid('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  category:    varchar('category', { length: 80 }).notNull(), // 'Свадьбы', 'Выпускные', 'Корпоративы'
  title:       varchar('title', { length: 120 }).notNull(),   // 'Ведущий 6 часов', 'Пакет Силвер'
  description: text('description'),                           // Что входит в пакет
  price:       decimal('price', { precision: 10, scale: 2 }).notNull(),
  priceUnit:   varchar('price_unit', { length: 40 }).default('за мероприятие'),
  isActive:    boolean('is_active').notNull().default(true),
  sortOrder:   integer('sort_order').notNull().default(0),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  profileIdx: index('services_profile_idx').on(t.profileId),
}))

// ─── Availability (календарь доступности исполнителя по конкретным датам) ─────

export const availabilityDates = pgTable('availability_dates', {
  id:          uuid('id').primaryKey().defaultRandom(),
  profileId:   uuid('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  date:        date('date').notNull(), // 'YYYY-MM-DD'
  isAvailable: boolean('is_available').notNull().default(true),
  timeFrom:    varchar('time_from', { length: 5 }), // '10:00'
  timeTo:      varchar('time_to',   { length: 5 }), // '21:00'
  note:        text('note'),
}, (t) => ({
  profileDateIdx: uniqueIndex('availability_profile_date_idx').on(t.profileId, t.date),
}))

// ─── Favorites ────────────────────────────────────────────────────────────────

export const favorites = pgTable('favorites', {
  id:        uuid('id').primaryKey().defaultRandom(),
  userId:    uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  profileId: uuid('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  savedAt:   timestamp('saved_at').notNull().defaultNow(),
}, (t) => ({
  userProfileIdx: uniqueIndex('favorites_user_profile_idx').on(t.userId, t.profileId),
}))

// ─── Reviews ─────────────────────────────────────────────────────────────────

export const reviews = pgTable('reviews', {
  id:          uuid('id').primaryKey().defaultRandom(),
  authorId:    uuid('author_id').notNull().references(() => users.id),
  profileId:   uuid('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  rating:      smallint('rating').notNull(),
  comment:     text('comment'),
  isModerated: boolean('is_moderated').notNull().default(false),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  profileIdx: index('reviews_profile_idx').on(t.profileId),
}))

// ─── Events (мероприятия) ───────────────────────────────────────────────────

export const events = pgTable('events', {
  id:            uuid('id').primaryKey().defaultRandom(),
  clientId:      uuid('client_id').notNull().references(() => users.id),
  eventType:     varchar('event_type', { length: 80 }),
  eventDate:     timestamp('event_date').notNull(),
  eventTimeFrom: varchar('event_time_from', { length: 5 }),
  eventTimeTo:   varchar('event_time_to', { length: 5 }),
  city:          varchar('city', { length: 80 }),
  location:      varchar('location', { length: 255 }),
  guestsCount:   integer('guests_count'),
  budget:        decimal('budget', { precision: 10, scale: 2 }),
  description:   text('description'),
  status:        eventStatusEnum('status').notNull().default('active'),
  paidAt:        timestamp('paid_at'),
  createdAt:     timestamp('created_at').notNull().defaultNow(),
  updatedAt:     timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  clientIdx: index('events_client_idx').on(t.clientId),
}))

export const eventRoles = pgTable('event_roles', {
  id:         uuid('id').primaryKey().defaultRandom(),
  eventId:    uuid('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id').notNull().references(() => categories.id),
  notes:      text('notes'),
  status:     eventRoleStatusEnum('status').notNull().default('searching'),
  createdAt:  timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  eventIdx: index('event_roles_event_idx').on(t.eventId),
}))

export const eventConversations = pgTable('event_conversations', {
  id:        uuid('id').primaryKey().defaultRandom(),
  eventId:   uuid('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  eventIdx: uniqueIndex('event_conversations_event_idx').on(t.eventId),
}))

export const eventConversationMembers = pgTable('event_conversation_members', {
  id:             uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').notNull().references(() => eventConversations.id, { onDelete: 'cascade' }),
  userId:         uuid('user_id').notNull().references(() => users.id),
  joinedAt:       timestamp('joined_at').notNull().defaultNow(),
}, (t) => ({
  convUserIdx: uniqueIndex('event_conv_members_idx').on(t.conversationId, t.userId),
}))

export const eventMessages = pgTable('event_messages', {
  id:             uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').notNull().references(() => eventConversations.id, { onDelete: 'cascade' }),
  senderId:       uuid('sender_id').notNull().references(() => users.id),
  text:           text('text').notNull(),
  createdAt:      timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  convIdx: index('event_messages_conversation_idx').on(t.conversationId),
}))

// ─── Bookings ─────────────────────────────────────────────────────────────────

export const bookings = pgTable('bookings', {
  id:        uuid('id').primaryKey().defaultRandom(),
  clientId:  uuid('client_id').notNull().references(() => users.id),
  profileId: uuid('profile_id').notNull().references(() => profiles.id),
  eventId:     uuid('event_id').references(() => events.id, { onDelete: 'cascade' }),
  eventRoleId: uuid('event_role_id').references(() => eventRoles.id),
  eventDate: timestamp('event_date').notNull(),
  eventTimeFrom: varchar('event_time_from', { length: 5 }),  // '14:00'
  eventTimeTo:   varchar('event_time_to',   { length: 5 }),  // '20:00'
  eventType:     varchar('event_type',      { length: 80 }),   // свадьба, др, корпоратив
  guestsCount:   integer('guests_count'),                       // кол-во гостей
  ageCategory:   varchar('age_category',    { length: 40 }),   // 18+, семейное, детское
  duration:      integer('duration'),                           // часов
  location:      varchar('location',        { length: 255 }),  // адрес
  total:     decimal('total', { precision: 10, scale: 2 }).notNull(),
  status:    bookingStatusEnum('status').notNull().default('pending'),
  notes:     text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  clientIdx:  index('bookings_client_idx').on(t.clientId),
  profileIdx: index('bookings_profile_idx').on(t.profileId),
  statusIdx:  index('bookings_status_idx').on(t.status),
  eventIdx:   index('bookings_event_idx').on(t.eventId),
}))

// ─── Conversations (чат по подтверждённой брони) ──────────────────────────────

export const conversations = pgTable('conversations', {
  id:        uuid('id').primaryKey().defaultRandom(),
  bookingId: uuid('booking_id').notNull().references(() => bookings.id, { onDelete: 'cascade' }),
  clientId:  uuid('client_id').notNull().references(() => users.id),
  vendorId:  uuid('vendor_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  bookingIdx: uniqueIndex('conversations_booking_idx').on(t.bookingId),
}))

// ─── Messages ──────────────────────────────────────────────────────────────────

export const messages = pgTable('messages', {
  id:             uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  senderId:       uuid('sender_id').notNull().references(() => users.id),
  text:           text('text').notNull(),
  readAt:         timestamp('read_at'), // когда собеседник прочитал сообщение (null — непрочитано)
  createdAt:      timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  conversationIdx: index('messages_conversation_idx').on(t.conversationId),
}))

// ─── Relations ───────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ one, many }) => ({
  profile:   one(profiles, { fields: [users.id], references: [profiles.userId] }),
  favorites: many(favorites),
  reviews:   many(reviews),
  bookings:  many(bookings, { relationName: 'clientBookings' }),
  events:    many(events),
  clientConversations: many(conversations, { relationName: 'clientConversations' }),
  vendorConversations: many(conversations, { relationName: 'vendorConversations' }),
}))

export const profilesRelations = relations(profiles, ({ one, many }) => ({
  user:              one(users, { fields: [profiles.userId], references: [users.id] }),
  profileCategories: many(profileCategories),
  contacts:          many(profileContacts),
  portfolio:         many(portfolioItems),
  albums:            many(albums),
  services:          many(services),
  availabilityDates: many(availabilityDates),
  favorites:         many(favorites),
  reviews:           many(reviews),
  bookings:          many(bookings),
}))

export const availabilityDatesRelations = relations(availabilityDates, ({ one }) => ({
  profile: one(profiles, { fields: [availabilityDates.profileId], references: [profiles.id] }),
}))

export const categoriesRelations = relations(categories, ({ many }) => ({
  profileCategories: many(profileCategories),
}))

export const profileCategoriesRelations = relations(profileCategories, ({ one }) => ({
  profile:  one(profiles,   { fields: [profileCategories.profileId],  references: [profiles.id] }),
  category: one(categories, { fields: [profileCategories.categoryId], references: [categories.id] }),
}))

export const profileContactsRelations = relations(profileContacts, ({ one }) => ({
  profile: one(profiles, { fields: [profileContacts.profileId], references: [profiles.id] }),
}))

export const portfolioItemsRelations = relations(portfolioItems, ({ one }) => ({
  profile: one(profiles, { fields: [portfolioItems.profileId], references: [profiles.id] }),
}))

export const albumsRelations = relations(albums, ({ one, many }) => ({
  profile: one(profiles, { fields: [albums.profileId], references: [profiles.id] }),
  photos:  many(albumPhotos),
}))

export const albumPhotosRelations = relations(albumPhotos, ({ one }) => ({
  album: one(albums, { fields: [albumPhotos.albumId], references: [albums.id] }),
}))

export const servicesRelations = relations(services, ({ one }) => ({
  profile: one(profiles, { fields: [services.profileId], references: [profiles.id] }),
}))

export const favoritesRelations = relations(favorites, ({ one }) => ({
  user:    one(users,    { fields: [favorites.userId],    references: [users.id] }),
  profile: one(profiles, { fields: [favorites.profileId], references: [profiles.id] }),
}))

export const reviewsRelations = relations(reviews, ({ one }) => ({
  author:  one(users,    { fields: [reviews.authorId],  references: [users.id] }),
  profile: one(profiles, { fields: [reviews.profileId], references: [profiles.id] }),
}))

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  client:       one(users,    { fields: [bookings.clientId],  references: [users.id], relationName: 'clientBookings' }),
  profile:      one(profiles, { fields: [bookings.profileId], references: [profiles.id] }),
  event:        one(events,     { fields: [bookings.eventId],     references: [events.id] }),
  eventRole:    one(eventRoles, { fields: [bookings.eventRoleId], references: [eventRoles.id] }),
  conversation: many(conversations),
}))

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  booking:  one(bookings, { fields: [conversations.bookingId], references: [bookings.id] }),
  client:   one(users,    { fields: [conversations.clientId], references: [users.id], relationName: 'clientConversations' }),
  vendor:   one(users,    { fields: [conversations.vendorId], references: [users.id], relationName: 'vendorConversations' }),
  messages: many(messages),
}))

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, { fields: [messages.conversationId], references: [conversations.id] }),
  sender:       one(users, { fields: [messages.senderId], references: [users.id] }),
}))

// ─── Events relations ──────────────────────────────────────────────────────

export const eventsRelations = relations(events, ({ one, many }) => ({
  client:       one(users, { fields: [events.clientId], references: [users.id] }),
  roles:        many(eventRoles),
  bookings:     many(bookings),
  conversation: one(eventConversations, { fields: [events.id], references: [eventConversations.eventId] }),
}))

export const eventRolesRelations = relations(eventRoles, ({ one, many }) => ({
  event:    one(events,     { fields: [eventRoles.eventId],    references: [events.id] }),
  category: one(categories, { fields: [eventRoles.categoryId], references: [categories.id] }),
  bookings: many(bookings),
}))

export const eventConversationsRelations = relations(eventConversations, ({ one, many }) => ({
  event:    one(events, { fields: [eventConversations.eventId], references: [events.id] }),
  members:  many(eventConversationMembers),
  messages: many(eventMessages),
}))

export const eventConversationMembersRelations = relations(eventConversationMembers, ({ one }) => ({
  conversation: one(eventConversations, { fields: [eventConversationMembers.conversationId], references: [eventConversations.id] }),
  user:         one(users, { fields: [eventConversationMembers.userId], references: [users.id] }),
}))

export const eventMessagesRelations = relations(eventMessages, ({ one }) => ({
  conversation: one(eventConversations, { fields: [eventMessages.conversationId], references: [eventConversations.id] }),
  sender:       one(users, { fields: [eventMessages.senderId], references: [users.id] }),
}))