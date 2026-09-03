import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { db } from './index'
import { users, profiles, profileCategories, categories, services } from './schema'
import { eq } from 'drizzle-orm'

const PASSWORD = 'test1234'
const CITIES = ['Москва', 'Санкт-Петербург', 'Новосибирск', 'Екатеринбург', 'Казань']
const PACKAGES = ['Стандарт', 'Стандарт+', 'Премиум']

const NAMES = [
  { first: 'Александр', last: 'Смирнов' }, { first: 'Мария', last: 'Иванова' },
  { first: 'Дмитрий', last: 'Кузнецов' }, { first: 'Анна', last: 'Соколова' },
  { first: 'Иван', last: 'Попов' }, { first: 'Елена', last: 'Лебедева' },
  { first: 'Сергей', last: 'Новиков' }, { first: 'Ольга', last: 'Морозова' },
  { first: 'Никита', last: 'Волков' }, { first: 'Виктория', last: 'Соловьёва' },
  { first: 'Артём', last: 'Васильев' }, { first: 'Дарья', last: 'Зайцева' },
  { first: 'Максим', last: 'Павлов' }, { first: 'Полина', last: 'Семёнова' },
  { first: 'Кирилл', last: 'Голубев' }, { first: 'Юлия', last: 'Виноградова' },
  { first: 'Роман', last: 'Богданов' }, { first: 'Ксения', last: 'Воробьёва' },
  { first: 'Владимир', last: 'Фёдоров' }, { first: 'Алина', last: 'Никитина' },
]

interface Template { service: { title: string; description: string; price: number; priceUnit: string }; bio: string }

const TEMPLATES: Record<string, Template> = {
  host: { service: { title: 'Ведущий 5 часов', description: 'Провожу свадьбы, дни рождения и корпоративы в живом формате: конкурсы, интерактив с гостями, работа с диджеем и площадкой. Опыт 6+ лет, своя команда техники по запросу.', price: 35000, priceUnit: 'за мероприятие' }, bio: 'Ведущий с опытом 6+ лет. Провёл более 200 мероприятий — от камерных дней рождения до корпоративов на 300 человек.' },
  dj: { service: { title: 'DJ-сет 4 часа', description: 'Танцевальный сет под настроение аудитории: от лаунжа на банкете до драйвовой танцевальной части. Своя аппаратура, световое оформление по запросу.', price: 20000, priceUnit: 'за вечер' }, bio: 'Диджей, играю на свадьбах и корпоративах последние 5 лет. Подбираю плейлист под вашу аудиторию заранее.' },
  organizer: { service: { title: 'Организация мероприятия под ключ', description: 'Беру на себя весь процесс: бюджет, подрядчики, тайминг, площадка, координация в день Х. Работаю с командой проверенных исполнителей.', price: 60000, priceUnit: 'за мероприятие' }, bio: 'Организатор мероприятий, за плечами 80+ реализованных проектов: свадьбы, корпоративы, дни рождения.' },
  video: { service: { title: 'Видеосъёмка мероприятия', description: 'Полный день съёмки на 2 камеры, монтаж клипа 3–5 минут и полной версии. Дрон по запросу.', price: 45000, priceUnit: 'за мероприятие' }, bio: 'Видеограф, снимаю свадьбы и мероприятия 4 года. Кинематографичный монтаж, доставка в течение 2 недель.' },
  photo: { service: { title: 'Фотосъёмка мероприятия', description: 'Полный день фотосъёмки, обработка 100+ кадров в цвете, галерея в течение недели.', price: 30000, priceUnit: 'за мероприятие' }, bio: 'Фотограф, специализируюсь на репортажной и постановочной съёмке мероприятий.' },
  reels: { service: { title: 'Reels-репортаж с мероприятия', description: 'Съёмка и монтаж коротких вертикальных роликов прямо в день мероприятия — готовые Reels уже вечером.', price: 15000, priceUnit: 'за мероприятие' }, bio: 'Снимаю и монтирую Reels/шортсы с мероприятий в реальном времени — гости получают контент уже к вечеру.' },
  coordinator: { service: { title: 'Координация дня мероприятия', description: 'Слежу за таймингом, встречаю подрядчиков, решаю форс-мажоры — вы наслаждаетесь праздником, а не бегаете с рацией.', price: 25000, priceUnit: 'за мероприятие' }, bio: 'Координатор, помогаю провести день мероприятия без стресса — беру операционку на себя.' },
  light_sound: { service: { title: 'Аренда света и звука', description: 'Профессиональный звук и световое оформление зала под любой формат — от банкета до танцевальной вечеринки. Монтаж и техник включены.', price: 40000, priceUnit: 'за мероприятие' }, bio: 'Занимаюсь техническим оснащением мероприятий: звук, свет, сцена. Своё оборудование.' },
  outfit: { service: { title: 'Прокат нарядов на мероприятие', description: 'Большой выбор вечерних и тематических нарядов напрокат, подбор по фигуре и стилю мероприятия.', price: 8000, priceUnit: 'за мероприятие' }, bio: 'Шоурум вечерних нарядов и костюмов напрокат — подберём образ под любое мероприятие.' },
  venue: { service: { title: 'Аренда площадки', description: 'Зал на 100 гостей в центре города, своя кухня, парковка, возможность украсить пространство под ваш стиль.', price: 80000, priceUnit: 'за вечер' }, bio: 'Площадка для мероприятий любого формата — от камерных ужинов до больших банкетов.' },
  transfer: { service: { title: 'Трансфер гостей мероприятия', description: 'Комфортные автомобили и микроавтобусы для гостей, встреча по расписанию, декор авто по запросу.', price: 12000, priceUnit: 'за мероприятие' }, bio: 'Организую трансфер для мероприятий: от легкового авто до микроавтобуса на группу гостей.' },
  photo_studio: { service: { title: 'Аренда фотостудии', description: 'Циклорама, профессиональный свет, реквизит — студия для предметной и портретной съёмки в центре города.', price: 2500, priceUnit: 'за час' }, bio: 'Фотостудия с профессиональным светом и реквизитом для съёмок любого формата.' },
  catering: { service: { title: 'Кейтеринг на мероприятие', description: 'Фуршетное и банкетное меню, выездная кухня, сервировка и обслуживающий персонал под ключ.', price: 1800, priceUnit: 'за гостя' }, bio: 'Кейтеринговая служба: готовим и обслуживаем мероприятия любого масштаба.' },
  jewelry: { service: { title: 'Аренда украшений на мероприятие', description: 'Комплекты украшений напрокат для невесты и гостей — от классики до статусных изделий.', price: 5000, priceUnit: 'за мероприятие' }, bio: 'Салон украшений — прокат и подбор комплектов под образ на мероприятие.' },
  barbershop: { service: { title: 'Выездной барбер на мероприятие', description: 'Стрижка и укладка жениха и гостей-мужчин прямо на месте проведения мероприятия.', price: 3000, priceUnit: 'за гостя' }, bio: 'Барбер с выездом на мероприятия — приведу в порядок жениха и гостей перед торжеством.' },
  makeup: { service: { title: 'Makeup на мероприятие', description: 'Дневной и вечерний макияж, укладка, выезд к клиенту. Пробный образ заранее.', price: 6000, priceUnit: 'за гостя' }, bio: 'Визажист-стилист, выезжаю на мероприятия — свадьбы, выпускные, фотосессии.' },
  bachelor: { service: { title: 'Организация мальчишника', description: 'Сценарий, локация, активности под компанию друзей — от квеста до выезда на природу.', price: 25000, priceUnit: 'за мероприятие' }, bio: 'Организую мальчишники под ключ — от идеи до реализации.' },
  bachelorette: { service: { title: 'Организация девичника', description: 'Тематическое оформление, конкурсы, фотозона и весь сценарий дня под ключ.', price: 22000, priceUnit: 'за мероприятие' }, bio: 'Организую девичники — стильно, весело, без забот для невесты.' },
  decor: { service: { title: 'Оформление зала', description: 'Тематический декор зала: текстиль, цветы, арка, фотозона — под цветовую гамму вашего мероприятия.', price: 35000, priceUnit: 'за мероприятие' }, bio: 'Декоратор, оформляю залы и площадки под концепцию мероприятия.' },
  confectionery: { service: { title: 'Торт и десертный стол', description: 'Авторский торт под тему мероприятия плюс капкейки и candy bar на выбор.', price: 9000, priceUnit: 'за мероприятие' }, bio: 'Кондитер, готовлю торты и десертные столы для мероприятий на заказ.' },
}

const VENDORS_PER_CATEGORY = 3
const CLIENTS = 2

async function seedDemo() {
  const passwordHash = await bcrypt.hash(PASSWORD, 12)
  const allCategories = await db.query.categories.findMany()
  const report: { email: string; role: string; name: string; category?: string; city?: string }[] = []

  let i = 0
  for (const cat of allCategories) {
    const tpl = TEMPLATES[cat.slug]
    if (!tpl) continue

    for (let n = 0; n < VENDORS_PER_CATEGORY; n++) {
      const email = `${cat.slug}${n + 1}@gulyay.test`
      const existing = await db.query.users.findFirst({ where: eq(users.email, email) })
      if (existing) { i++; continue }

      const name = NAMES[i % NAMES.length]
      const city = CITIES[i % CITIES.length]
      const displayName = `${name.first} ${name.last}`
      const price = tpl.service.price + n * 3000

      const [user] = await db.insert(users).values({
        email, passwordHash, role: 'vendor', isVerified: true,
      }).returning()

      const [profile] = await db.insert(profiles).values({
        userId: user.id, displayName, bio: tpl.bio, city,
        priceFrom: String(price), priceUnit: tpl.service.priceUnit,
        experienceYears: 2 + (n % 5),
      }).returning()

      await db.insert(profileCategories).values({ profileId: profile.id, categoryId: cat.id, isPrimary: true })

      await db.insert(services).values({
        profileId: profile.id, category: cat.name,
        title: `${tpl.service.title} — ${PACKAGES[n % PACKAGES.length]}`,
        description: tpl.service.description,
        price: String(price), priceUnit: tpl.service.priceUnit,
      })

      report.push({ email, role: 'vendor', name: displayName, category: cat.name, city })
      i++
    }
  }

  const clientNames = ['Алексей Заказчиков', 'Мария Праздникова']
  for (let c = 0; c < CLIENTS; c++) {
    const email = `client${c + 1}@gulyay.test`
    const existing = await db.query.users.findFirst({ where: eq(users.email, email) })
    if (existing) continue

    const [user] = await db.insert(users).values({ email, passwordHash, role: 'client', isVerified: true }).returning()
    const city = CITIES[c % CITIES.length]
    await db.insert(profiles).values({ userId: user.id, displayName: clientNames[c], city })
    report.push({ email, role: 'client', name: clientNames[c], city })
  }

  console.log(`\nПароль для всех аккаунтов: ${PASSWORD}\n`)
  console.log('email\trole\tname\tcategory\tcity')
  for (const r of report) console.log(`${r.email}\t${r.role}\t${r.name}\t${r.category || ''}\t${r.city}`)
  console.log(`\nСоздано: ${report.filter(r => r.role === 'vendor').length} исполнителей, ${report.filter(r => r.role === 'client').length} заказчиков`)
}

seedDemo().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
