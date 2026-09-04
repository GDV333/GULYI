import { eq, asc, and } from 'drizzle-orm'
import { db } from '../../db'
import { profiles, profileContacts, portfolioItems, albums, albumPhotos, services, availabilityDates } from '../../db/schema'
import {
  S3Client, DeleteObjectCommand,
  HeadBucketCommand, CreateBucketCommand, PutBucketPolicyCommand,
} from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { randomUUID } from 'crypto'
import { config } from '../../config'

const s3 = new S3Client({
  endpoint:        config.s3.endpoint,
  region:          config.s3.region,
  credentials: {
    accessKeyId:     config.s3.accessKey,
    secretAccessKey: config.s3.secretKey,
  },
  forcePathStyle: true,
})

const BUCKET = config.s3.bucket
const MINIO_PUBLIC_URL = config.s3.publicUrl

// Белый список типов: и расширение, и Content-Type в хранилище берём отсюда,
// а не из того, что прислал клиент. SVG сознательно НЕ пускаем — это XML,
// который браузер исполняет как документ со скриптами, и залитый в публичный
// бакет .svg превращается в хранимую XSS. По той же причине нет html/xml.
const ALLOWED_MEDIA: Record<string, { ext: string; kind: 'image' | 'video' }> = {
  'image/jpeg': { ext: '.jpg',  kind: 'image' },
  'image/pjpeg':{ ext: '.jpg',  kind: 'image' },
  'image/png':  { ext: '.png',  kind: 'image' },
  'image/webp': { ext: '.webp', kind: 'image' },
  'image/gif':  { ext: '.gif',  kind: 'image' },
  'image/avif': { ext: '.avif', kind: 'image' },
  'image/heic': { ext: '.heic', kind: 'image' },
  'video/mp4':  { ext: '.mp4',  kind: 'video' },
  'video/webm': { ext: '.webm', kind: 'video' },
  'video/quicktime': { ext: '.mov', kind: 'video' },
}

export function mediaKindOf(mimetype?: string): 'image' | 'video' {
  return ALLOWED_MEDIA[(mimetype || '').toLowerCase()]?.kind ?? 'image'
}

// На свежем окружении (другой ноутбук, чистый MinIO) бакета ещё нет — создаём его
// один раз за процесс и открываем на публичное чтение, чтобы <img src> работал.
let bucketEnsured = false
async function ensureBucket() {
  if (bucketEnsured) return
  try {
    await s3.send(new HeadBucketCommand({ Bucket: BUCKET }))
  } catch {
    try {
      await s3.send(new CreateBucketCommand({ Bucket: BUCKET }))
      await s3.send(new PutBucketPolicyCommand({
        Bucket: BUCKET,
        Policy: JSON.stringify({
          Version: '2012-10-17',
          Statement: [{
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${BUCKET}/*`],
          }],
        }),
      }))
    } catch (e) {
      console.error('MinIO ensureBucket:', e)
    }
  }
  bucketEnsured = true
}

async function uploadToMinio(file: any, folder: string): Promise<string> {
  const allowed = ALLOWED_MEDIA[(file.mimetype || '').toLowerCase()]
  if (!allowed) {
    throw new Error('Можно загружать только фото (jpg, png, webp, gif, avif, heic) и видео (mp4, webm, mov)')
  }

  await ensureBucket()

  // Расширение и Content-Type — только из белого списка: имя файла и заголовок
  // от клиента до хранилища не доходят, поэтому подменить тип отдачи нельзя.
  const key = `${folder}/${randomUUID()}${allowed.ext}`

  const upload = new Upload({
    client: s3,
    params: {
      Bucket:             BUCKET,
      Key:                key,
      Body:               file.file,
      ContentType:        file.mimetype.toLowerCase(),
      ContentDisposition: 'inline',
    },
  })

  await upload.done()
  return `${MINIO_PUBLIC_URL}/${BUCKET}/${key}`
}

async function deleteFromMinio(url: string) {
  try {
    const key = url.replace(`${MINIO_PUBLIC_URL}/${BUCKET}/`, '')
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
  } catch (e) { console.error('MinIO delete error:', e) }
}

export class ProfileService {
  async getMyProfile(userId: string) {
    return db.query.profiles.findFirst({
      where: eq(profiles.userId, userId),
      with: {
        profileCategories: { with: { category: true } },
        contacts:          true,
        portfolio:         { orderBy: (p) => [asc(p.sortOrder)] },
        albums:            {
          orderBy: (a) => [asc(a.sortOrder)],
          with: { photos: { orderBy: (p) => [asc(p.sortOrder)] } },
        },
        services:  { where: (s) => eq(s.isActive, true), orderBy: (s) => [asc(s.sortOrder)] },
        reviews:   { limit: 5, orderBy: (r) => [r.createdAt] },
      },
    })
  }

  async updateProfile(userId: string, dto: {
    displayName?: string
    bio?:         string
    city?:        string
    priceFrom?:   string
    priceUnit?:   string
    contacts?:    { platform: string; value: string; isVisible: boolean }[]
  }) {
    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.userId, userId),
    })
    if (!profile) throw new Error('Профиль не найден')

    await db.update(profiles)
      .set({
        displayName: dto.displayName,
        bio:         dto.bio,
        city:        dto.city,
        priceFrom:   dto.priceFrom,
        priceUnit:   dto.priceUnit,
        updatedAt:   new Date(),
      })
      .where(eq(profiles.id, profile.id))

    if (dto.contacts !== undefined) {
      await db.delete(profileContacts).where(eq(profileContacts.profileId, profile.id))
      if (dto.contacts.length > 0) {
        await db.insert(profileContacts).values(
          dto.contacts.map(c => ({
            profileId: profile.id,
            platform:  c.platform,
            value:     c.value,
            isVisible: c.isVisible,
          }))
        )
      }
    }

    return this.getMyProfile(userId)
  }

  async uploadAvatar(userId: string, file: any) {
    const profile = await db.query.profiles.findFirst({ where: eq(profiles.userId, userId) })
    if (!profile) throw new Error('Профиль не найден')
    const url = await uploadToMinio(file, 'avatars')
    await db.update(profiles).set({ avatarUrl: url, updatedAt: new Date() }).where(eq(profiles.id, profile.id))
    return url
  }

  async uploadPortfolioItem(userId: string, file: any) {
    const profile = await db.query.profiles.findFirst({ where: eq(profiles.userId, userId) })
    if (!profile) throw new Error('Профиль не найден')
    const url = await uploadToMinio(file, 'portfolio')
    const mediaType = mediaKindOf(file.mimetype)
    const [item] = await db.insert(portfolioItems).values({
      profileId: profile.id, mediaUrl: url, mediaType, sortOrder: 0,
    }).returning()
    return item
  }

  // Все операции ниже работают только со своим профилем — иначе можно было бы
  // править и удалять чужие услуги, альбомы и фото, зная их id
  private async requireOwnProfile(userId: string) {
    const profile = await db.query.profiles.findFirst({ where: eq(profiles.userId, userId) })
    if (!profile) throw new Error('Профиль не найден')
    return profile
  }

  async deletePortfolioItem(userId: string, itemId: string) {
    const profile = await this.requireOwnProfile(userId)
    const item = await db.query.portfolioItems.findFirst({ where: eq(portfolioItems.id, itemId) })
    if (!item || item.profileId !== profile.id) throw new Error('Нет доступа к этому фото')

    await deleteFromMinio(item.mediaUrl)
    await db.delete(portfolioItems).where(eq(portfolioItems.id, itemId))
  }

  // ── Альбомы ──────────────────────────────────────────────────────────────

  async getAlbums(userId: string) {
    const profile = await db.query.profiles.findFirst({ where: eq(profiles.userId, userId) })
    if (!profile) return []
    return db.query.albums.findMany({
      where: eq(albums.profileId, profile.id),
      orderBy: (a) => [asc(a.sortOrder)],
      with: { photos: { orderBy: (p) => [asc(p.sortOrder)] } },
    })
  }

  async createAlbum(userId: string, dto: { title: string; description?: string }) {
    const profile = await db.query.profiles.findFirst({ where: eq(profiles.userId, userId) })
    if (!profile) throw new Error('Профиль не найден')
    const [album] = await db.insert(albums).values({
      profileId:   profile.id,
      title:       dto.title,
      description: dto.description,
    }).returning()
    return album
  }

  private async requireOwnAlbum(userId: string, albumId: string) {
    const profile = await this.requireOwnProfile(userId)
    const album = await db.query.albums.findFirst({
      where: eq(albums.id, albumId),
      with: { photos: true },
    })
    if (!album || album.profileId !== profile.id) throw new Error('Нет доступа к этому альбому')
    return album
  }

  async deleteAlbum(userId: string, albumId: string) {
    const album = await this.requireOwnAlbum(userId, albumId)
    for (const photo of album.photos) await deleteFromMinio(photo.mediaUrl)
    await db.delete(albums).where(eq(albums.id, albumId))
  }

  async uploadAlbumPhoto(userId: string, albumId: string, file: any) {
    const album = await this.requireOwnAlbum(userId, albumId)

    const url = await uploadToMinio(file, 'albums')
    const mediaType = mediaKindOf(file.mimetype)
    const [photo] = await db.insert(albumPhotos).values({
      albumId, mediaUrl: url, mediaType, sortOrder: 0,
    }).returning()

    // Если у альбома нет обложки — ставим первое фото
    if (!album.coverUrl) {
      await db.update(albums).set({ coverUrl: url }).where(eq(albums.id, albumId))
    }

    return photo
  }

  async deleteAlbumPhoto(userId: string, photoId: string) {
    const photo = await db.query.albumPhotos.findFirst({ where: eq(albumPhotos.id, photoId) })
    if (!photo) throw new Error('Фото не найдено')
    await this.requireOwnAlbum(userId, photo.albumId)

    await deleteFromMinio(photo.mediaUrl)
    await db.delete(albumPhotos).where(eq(albumPhotos.id, photoId))
  }

  // ── Услуги ───────────────────────────────────────────────────────────────

  async getServices(userId: string) {
    const profile = await db.query.profiles.findFirst({ where: eq(profiles.userId, userId) })
    if (!profile) return []
    return db.query.services.findMany({
      where: eq(services.profileId, profile.id),
      orderBy: (s) => [asc(s.sortOrder)],
    })
  }

  async createService(userId: string, dto: {
    category: string; title: string; description?: string
    price: number; priceUnit?: string
  }) {
    const profile = await db.query.profiles.findFirst({ where: eq(profiles.userId, userId) })
    if (!profile) throw new Error('Профиль не найден')
    const [service] = await db.insert(services).values({
      profileId:   profile.id,
      category:    dto.category,
      title:       dto.title,
      description: dto.description,
      price:       String(dto.price),
      priceUnit:   dto.priceUnit || 'за мероприятие',
    }).returning()
    return service
  }

  private async requireOwnService(userId: string, serviceId: string) {
    const profile = await this.requireOwnProfile(userId)
    const service = await db.query.services.findFirst({ where: eq(services.id, serviceId) })
    if (!service || service.profileId !== profile.id) throw new Error('Нет доступа к этой услуге')
    return service
  }

  async updateService(userId: string, serviceId: string, dto: Partial<{
    category: string; title: string; description: string
    price: number; priceUnit: string
  }>) {
    await this.requireOwnService(userId, serviceId)

    const [service] = await db.update(services)
      .set({
        ...dto,
        price: dto.price ? String(dto.price) : undefined,
      })
      .where(eq(services.id, serviceId))
      .returning()
    return service
  }

  async deleteService(userId: string, serviceId: string) {
    await this.requireOwnService(userId, serviceId)
    await db.delete(services).where(eq(services.id, serviceId))
  }

  // ── Доступность (календарь по датам) ────────────────────────────────────

  async getAvailability(userId: string) {
    const profile = await db.query.profiles.findFirst({ where: eq(profiles.userId, userId) })
    if (!profile) return []
    return db.query.availabilityDates.findMany({
      where: eq(availabilityDates.profileId, profile.id),
      orderBy: (a) => [asc(a.date)],
    })
  }

  async setAvailabilityDate(userId: string, date: string, dto: {
    isAvailable: boolean; timeFrom?: string; timeTo?: string; note?: string
  }) {
    const profile = await db.query.profiles.findFirst({ where: eq(profiles.userId, userId) })
    if (!profile) throw new Error('Профиль не найден')

    const values = {
      isAvailable: dto.isAvailable,
      timeFrom:    dto.isAvailable ? (dto.timeFrom || null) : null,
      timeTo:      dto.isAvailable ? (dto.timeTo || null) : null,
      note:        dto.note || null,
    }

    const existing = await db.query.availabilityDates.findFirst({
      where: and(eq(availabilityDates.profileId, profile.id), eq(availabilityDates.date, date)),
    })

    if (existing) {
      const [updated] = await db.update(availabilityDates).set(values).where(eq(availabilityDates.id, existing.id)).returning()
      return updated
    }

    const [created] = await db.insert(availabilityDates).values({ profileId: profile.id, date, ...values }).returning()
    return created
  }

  async deleteAvailabilityDate(userId: string, date: string) {
    const profile = await db.query.profiles.findFirst({ where: eq(profiles.userId, userId) })
    if (!profile) throw new Error('Профиль не найден')
    await db.delete(availabilityDates).where(and(eq(availabilityDates.profileId, profile.id), eq(availabilityDates.date, date)))
  }
}