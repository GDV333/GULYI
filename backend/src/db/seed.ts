import 'dotenv/config'
import { db } from './index'
import { categories } from './schema'

const CATEGORIES = [
  { slug: 'host',         name: 'Ведущие',          icon: '🎤', sortOrder: 1 },
  { slug: 'dj',           name: 'Диджеи',           icon: '🎧', sortOrder: 2 },
  { slug: 'organizer',    name: 'Организаторы',     icon: '📋', sortOrder: 3 },
  { slug: 'video',        name: 'Видеографы',       icon: '🎬', sortOrder: 4 },
  { slug: 'photo',        name: 'Фотографы',        icon: '📸', sortOrder: 5 },
  { slug: 'reels',        name: 'Рилсмейкеры',      icon: '🎥', sortOrder: 6 },
  { slug: 'coordinator',  name: 'Координаторы',     icon: '🗂', sortOrder: 7 },
  { slug: 'light_sound',  name: 'Свет и звук',      icon: '💡', sortOrder: 8 },
  { slug: 'outfit',       name: 'Платья и костюмы', icon: '👗', sortOrder: 9 },
  { slug: 'venue',        name: 'Площадки',         icon: '🏛', sortOrder: 10 },
  { slug: 'transfer',     name: 'Трансфер',         icon: '🚗', sortOrder: 11 },
  { slug: 'photo_studio', name: 'Фотостудии',       icon: '🎞', sortOrder: 12 },
  { slug: 'catering',     name: 'Кейтеринг',        icon: '🍽', sortOrder: 13 },
  { slug: 'jewelry',      name: 'Ювелирка',         icon: '💍', sortOrder: 14 },
  { slug: 'barbershop',   name: 'Барбер шоп',       icon: '💈', sortOrder: 15 },
  { slug: 'makeup',       name: 'Макияж',           icon: '💄', sortOrder: 16 },
  { slug: 'bachelor',     name: 'Мальчишник',       icon: '🥃', sortOrder: 17 },
  { slug: 'bachelorette', name: 'Девичник',         icon: '🌸', sortOrder: 18 },
  { slug: 'decor',        name: 'Декораторы',       icon: '🎈', sortOrder: 19 },
  { slug: 'confectionery',name: 'Кондитеры',        icon: '🎂', sortOrder: 20 },
]

async function seed() {
  console.log('Seeding categories...')
  await db.insert(categories).values(CATEGORIES).onConflictDoNothing()
  console.log('Done!')
  process.exit(0)
}

seed().catch(e => { console.error(e); process.exit(1) })