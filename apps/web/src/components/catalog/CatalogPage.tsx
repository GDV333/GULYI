'use client'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { API_URL } from '@/lib/config'
import { apiFetch } from '@/lib/apiFetch'
import { FavoriteButton } from '@/components/shared/FavoriteButton'

const BG     = 'linear-gradient(135deg, #F3E9FC 0%, #FCEAF1 45%, #FFF4EA 100%)'
const CARD   = '#FFFFFF'
const ACCENT = '#7C3AED'
const BORDER = 'rgba(21,15,46,0.08)'
const TEXT   = '#150F2E'
const MUTED  = 'rgba(21,15,46,0.5)'

const CATEGORIES = [
  { value: 'host',         label: 'Ведущие',          emoji: '🎤' },
  { value: 'dj',           label: 'Диджеи',           emoji: '🎧' },
  { value: 'organizer',    label: 'Организаторы',     emoji: '📋' },
  { value: 'video',        label: 'Видеографы',       emoji: '🎬' },
  { value: 'photo',        label: 'Фотографы',        emoji: '📸' },
  { value: 'reels',        label: 'Рилсмейкеры',      emoji: '🎥' },
  { value: 'coordinator',  label: 'Координаторы',     emoji: '🗂' },
  { value: 'light_sound',  label: 'Свет и звук',      emoji: '💡' },
  { value: 'outfit',       label: 'Платья и костюмы', emoji: '👗' },
  { value: 'venue',        label: 'Площадки',         emoji: '🏛'  },
  { value: 'transfer',     label: 'Трансфер',         emoji: '🚗' },
  { value: 'photo_studio', label: 'Фотостудии',       emoji: '🎞' },
  { value: 'catering',     label: 'Кейтеринг',        emoji: '🍽' },
  { value: 'jewelry',      label: 'Ювелирка',         emoji: '💍' },
  { value: 'barbershop',   label: 'Барбер шоп',       emoji: '💈' },
  { value: 'makeup',       label: 'Макияж',           emoji: '💄' },
  { value: 'bachelor',     label: 'Мальчишник',       emoji: '🥃' },
  { value: 'bachelorette', label: 'Девичник',         emoji: '🌸' },
  { value: 'decor',        label: 'Декораторы',       emoji: '🎈' },
]

const CAT_MAP = Object.fromEntries(CATEGORIES.map(c => [c.value, c]))

// ── Тонкие линейные иконки категорий (без эмодзи) ──
const ICONS: Record<string, React.ReactNode> = {
  host: <><rect x="9" y="2.5" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0" /><path d="M12 17.5V21" /><path d="M8.5 21h7" /></>,
  dj: <><path d="M4 13v-1a8 8 0 0 1 16 0v1" /><path d="M4 13h3v7H5.5A1.5 1.5 0 0 1 4 18.5z" /><path d="M20 13h-3v7h1.5A1.5 1.5 0 0 0 20 18.5z" /></>,
  organizer: <><rect x="8" y="3" width="8" height="4" rx="1" /><path d="M9 5H6.5A1.5 1.5 0 0 0 5 6.5v13A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-13A1.5 1.5 0 0 0 17.5 5H15" /><path d="M8.5 11h7M8.5 15h5" /></>,
  video: <><rect x="2.5" y="7" width="13" height="10" rx="2" /><path d="m15.5 10.5 6-3.5v10l-6-3.5z" /></>,
  photo: <><path d="M4 8.5h2.5L8 6h8l1.5 2.5H20a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 20 19.5H4A1.5 1.5 0 0 1 2.5 18v-8A1.5 1.5 0 0 1 4 8.5z" /><circle cx="12" cy="13.5" r="3.5" /></>,
  reels: <><rect x="4" y="3" width="16" height="18" rx="4" /><path d="m10.5 8.5 5 3.5-5 3.5z" /></>,
  coordinator: <><path d="M5.5 3v18" /><path d="M5.5 4h11.5l-2.2 3.8 2.2 3.7H5.5" /></>,
  light_sound: <><path d="M9.5 18.5h5M10.5 21.5h3" /><path d="M12 2.5a6 6 0 0 0-3.7 10.7c.5.4.9 1 1 1.8v.5h5.4v-.5c.1-.8.5-1.4 1-1.8A6 6 0 0 0 12 2.5z" /></>,
  outfit: <><path d="M12 7.5a2 2 0 1 1 2-2" /><path d="M12 7.5v1.8L3.8 15a1.2 1.2 0 0 0 .7 2.2h15a1.2 1.2 0 0 0 .7-2.2L12 9.3" /></>,
  venue: <><path d="M4 21h16" /><path d="M6 21V9l6-4 6 4v12" /><path d="M10 21v-5h4v5" /><path d="M9.5 11.5h.01M14.5 11.5h.01" /></>,
  transfer: <><path d="M5 12.5 6.4 8.2A2 2 0 0 1 8.3 6.8h7.4a2 2 0 0 1 1.9 1.4L19 12.5" /><path d="M4 12.5h16v5.6a.9.9 0 0 1-.9.9h-1.7a.9.9 0 0 1-.9-.9V17H7.5v1.6a.9.9 0 0 1-.9.9H4.9a.9.9 0 0 1-.9-.9z" /><path d="M7 15h.01M17 15h.01" /></>,
  photo_studio: <><rect x="4" y="4" width="16" height="16" rx="2.5" /><path d="M8.5 4v16M15.5 4v16" /><path d="M4 8.5h4.5M4 15.5h4.5M15.5 8.5H20M15.5 15.5H20" /></>,
  catering: <><path d="M3 18.5h18" /><path d="M4 18.5a8 8 0 0 1 16 0" /><path d="M12 10.5V7.5" /><circle cx="12" cy="6" r="1.1" /></>,
  jewelry: <><path d="M5.5 4h13l3 5-9.5 11L2.5 9z" /><path d="M2.5 9h19M9 4 6 9l6 11 6-11-3-5" /></>,
  barbershop: <><circle cx="6" cy="7" r="2.4" /><circle cx="6" cy="17" r="2.4" /><path d="M8.2 8.3 19 19M8.2 15.7 19 5M9.6 12l1.6-1.4" /></>,
  makeup: <><path d="M9 9h6v9.5a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z" /><path d="M9 9V6l3.5-2.5L15 6.5V9" /></>,
  bachelor: <><path d="M6.5 5h11l-1 13a1.5 1.5 0 0 1-1.5 1.4H9a1.5 1.5 0 0 1-1.5-1.4z" /><path d="M6.8 9.5h10.4" /></>,
  bachelorette: <><circle cx="12" cy="12" r="2.4" /><circle cx="12" cy="6.6" r="2.5" /><circle cx="17.3" cy="12" r="2.5" /><circle cx="12" cy="17.4" r="2.5" /><circle cx="6.7" cy="12" r="2.5" /></>,
  decor: <><path d="M12 2.5c.6 4.4 2.6 6.4 7 7-4.4.6-6.4 2.6-7 7-.6-4.4-2.6-6.4-7-7 4.4-.6 6.4-2.6 7-7z" /></>,
}

function CatIcon({ slug, size = 22 }: { slug: string; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[slug] ?? <circle cx="12" cy="12" r="8" />}
    </svg>
  )
}

interface Profile {
  id: string; displayName: string; city: string; bio: string | null
  priceFrom: string | null; priceUnit: string | null; avgRating: string | null
  reviewsCount: number; isActive: boolean; avatarUrl: string | null
  profileCategories: { isPrimary: boolean; category: { slug: string; name: string; icon: string | null } }[]
  portfolio: { id: string; mediaUrl: string; mediaType: string }[]
}

const inp: React.CSSProperties = {
  width: '100%', background: '#F8F6FC', border: `1px solid ${BORDER}`,
  borderRadius: 12, padding: '10px 14px', fontSize: 14, color: TEXT, outline: 'none',
  boxSizing: 'border-box', colorScheme: 'light',
}

const PAGE_SIZE = 12

interface CatalogFiltersProps {
  city: string; setCity: (v: string) => void
  search: string; setSearch: (v: string) => void
  filterDate: string; setFilterDate: (v: string) => void
  priceMin: string; setPriceMin: (v: string) => void
  priceMax: string; setPriceMax: (v: string) => void
  sortBy: string; setSortBy: (v: string) => void
  setPage: (v: number) => void
  selectedCats: string[]; toggleCat: (slug: string) => void
}

// Вынесен за пределы CatalogPage: если объявить его внутри — при каждом
// изменении стейта (в т.ч. при вводе текста) React будет создавать новый
// компонент и перемонтировать <input>, сбрасывая фокус на каждой букве.
function CatalogFilters({
  city, setCity, search, setSearch, filterDate, setFilterDate,
  priceMin, setPriceMin, priceMax, setPriceMax, sortBy, setSortBy,
  setPage, selectedCats, toggleCat,
}: CatalogFiltersProps) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, padding: 20, boxShadow: '0 4px 24px rgba(21,15,46,0.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontWeight: 700, fontSize: 15, color: TEXT }}>Фильтры</h3>
        <button onClick={() => { setCity(''); setSearch(''); setPriceMin(''); setPriceMax(''); setSortBy('rating'); setPage(1) }}
          style={{ fontSize: 12, color: MUTED, background: 'none', border: 'none', cursor: 'pointer' }}>Сбросить</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={{ display: 'block', color: MUTED, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>Поиск</label>
          <input type="text" placeholder="Имя..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} style={inp} />
        </div>
        <div>
          <label style={{ display: 'block', color: MUTED, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>Город</label>
          <input type="text" placeholder="Москва" value={city} onChange={e => { setCity(e.target.value); setPage(1) }} style={inp} />
        </div>
        <div>
          <label style={{ display: 'block', color: MUTED, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>Дата</label>
          <input type="date" value={filterDate} min={new Date().toISOString().split('T')[0]} onChange={e => { setFilterDate(e.target.value); setPage(1) }} style={inp} />
        </div>
        <div>
          <label style={{ display: 'block', color: MUTED, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>Цена, ₽</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="number" placeholder="от" value={priceMin} onChange={e => { setPriceMin(e.target.value); setPage(1) }} style={inp} />
            <input type="number" placeholder="до" value={priceMax} onChange={e => { setPriceMax(e.target.value); setPage(1) }} style={inp} />
          </div>
        </div>
        <div>
          <label style={{ display: 'block', color: MUTED, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>Сортировка</label>
          <select value={sortBy} onChange={e => { setSortBy(e.target.value); setPage(1) }} style={{ ...inp, colorScheme: 'light' }}>
            <option value="rating">По рейтингу</option>
            <option value="price_asc">Сначала дешевле</option>
            <option value="price_desc">Сначала дороже</option>
            <option value="reviews">По отзывам</option>
          </select>
        </div>
      </div>

      <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${BORDER}` }}>
        <p style={{ color: MUTED, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>Категории</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 260, overflowY: 'auto' }}>
          {CATEGORIES.map(c => {
            const active = selectedCats.includes(c.value)
            return (
              <button key={c.value} onClick={() => toggleCat(c.value)}
                style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 10, background: active ? 'rgba(124,58,237,0.1)' : 'transparent', border: 'none', cursor: 'pointer', color: active ? ACCENT : MUTED, fontWeight: active ? 600 : 400, fontSize: 13, textAlign: 'left' }}>
                <span style={{ display: 'flex', flexShrink: 0, color: active ? ACCENT : 'rgba(21,15,46,0.4)' }}>
                  <CatIcon slug={c.value} size={17} />
                </span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function CatalogPage() {
  const searchParams = useSearchParams()
  const initCats = searchParams.get('categorySlugs')?.split(',') ||
    (searchParams.get('categorySlug') ? [searchParams.get('categorySlug')!] : [])
  const eventId = searchParams.get('eventId') || undefined
  const roleId = searchParams.get('roleId') || undefined
  const profileLinkSuffix = eventId ? `?eventId=${eventId}${roleId ? `&roleId=${roleId}` : ''}` : ''
  const [selectedCats, setSelectedCats] = useState<string[]>(initCats)
  const [showList, setShowList] = useState(initCats.length > 0)
  const [items, setItems] = useState<Profile[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [city, setCity] = useState(searchParams.get('city') || '')
  const [search, setSearch] = useState('')
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [sortBy, setSortBy] = useState('rating')
  const [page, setPage] = useState(1)
  const [filterDate, setFilterDate] = useState(searchParams.get('date') || '')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) return
    apiFetch('/api/favorites/ids')
      .then(r => r.json()).then(ids => Array.isArray(ids) && setFavoriteIds(new Set(ids)))
      .catch(() => {})
  }, [])

  const toggleFavorite = (profileId: string, next: boolean) => {
    setFavoriteIds(prev => {
      const copy = new Set(prev)
      next ? copy.add(profileId) : copy.delete(profileId)
      return copy
    })
  }

  const toggleCat = (slug: string) => {
    setSelectedCats(prev => prev[0] === slug ? [] : [slug])
    setPage(1); setShowList(true)
  }

  // Переносим уже выбранные фильтры (категории/город/дата) в редактор мероприятия
  const eventsNewParams = new URLSearchParams()
  if (selectedCats.length > 0) eventsNewParams.set('categorySlugs', selectedCats.join(','))
  if (city) eventsNewParams.set('city', city)
  if (filterDate) eventsNewParams.set('date', filterDate)
  const eventsNewHref = `/events/new${eventsNewParams.toString() ? '?' + eventsNewParams.toString() : ''}`

  const fetchCatalog = async () => {
    setLoading(true)
    try {
      const baseParams = new URLSearchParams()
      if (filterDate) baseParams.set('date', filterDate)
      if (city)       baseParams.set('city', city)
      if (search)     baseParams.set('search', search)
      if (priceMin)   baseParams.set('priceMin', priceMin)
      if (priceMax)   baseParams.set('priceMax', priceMax)
      baseParams.set('sortBy', sortBy)

      if (selectedCats.length <= 1) {
        // Один или ноль категорий — используем настоящую серверную пагинацию
        const p = new URLSearchParams(baseParams)
        if (selectedCats[0]) p.set('categorySlug', selectedCats[0])
        p.set('page', String(page)); p.set('limit', String(PAGE_SIZE))
        const res = await fetch(`${API_URL}/api/catalog?${p}`)
        const data = await res.json()
        setItems(data.data ?? [])
        setTotal(data.total ?? 0)
      } else {
        // Бэкенд не умеет фильтровать сразу по нескольким категориям —
        // запрашиваем каждую по отдельности, объединяем и пагинируем на клиенте
        const p = new URLSearchParams(baseParams); p.set('limit', '50') // бэкенд отклоняет limit > 50
        const results = await Promise.all(selectedCats.map(cat => {
          const catParams = new URLSearchParams(p); catParams.set('categorySlug', cat)
          return fetch(`${API_URL}/api/catalog?${catParams}`).then(r => r.json())
        }))
        const seen = new Set<string>()
        const merged: Profile[] = []
        for (const data of results)
          for (const item of (data.data ?? []))
            if (!seen.has(item.id)) { seen.add(item.id); merged.push(item) }
        setTotal(merged.length)
        setItems(merged.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE))
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { if (showList) fetchCatalog() }, [selectedCats, city, search, priceMin, priceMax, sortBy, page, showList, filterDate])

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const selectedLabels = selectedCats.map(s => CAT_MAP[s]?.label).filter(Boolean)

  // ── Сетка категорий ──
  if (!showList) {
    return (
      <>
        <Header />
        <main style={{ background: BG, minHeight: '100vh' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto', padding: 'clamp(28px,5vw,48px) clamp(16px,4vw,40px)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 28 }}>
              <div>
                <h1 style={{ fontSize: 'clamp(26px,3.5vw,38px)', fontWeight: 800, color: TEXT, letterSpacing: '-0.025em' }}>Каталог</h1>
                <p style={{ color: MUTED, marginTop: 4, fontSize: 15 }}>Выберите категорию исполнителей</p>
              </div>
              <Link href={eventsNewHref} style={{ display: 'flex', alignItems: 'center', gap: 8, background: ACCENT, color: '#FFFFFF', fontWeight: 700, padding: '11px 20px', borderRadius: 50, fontSize: 14, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
                🎪 Собрать команду на мероприятие
              </Link>
            </div>

            <div className="cat-grid">
              {CATEGORIES.map((cat, i) => (
                <button key={cat.value} onClick={() => toggleCat(cat.value)}
                  className={`cat-card gulyay-pop${selectedCats.includes(cat.value) ? ' is-sel' : ''}`}
                  style={{ animationDelay: `${0.035 * i}s` }}>
                  <span className="cat-card__ico"><CatIcon slug={cat.value} /></span>
                  <span className="cat-card__label">{cat.label}</span>
                  <svg className="cat-card__arrow" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </button>
              ))}
            </div>
            <style>{`
              .cat-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(184px, 1fr));
                gap: 12px;
              }
              .cat-card {
                position: relative;
                display: flex;
                flex-direction: column;
                align-items: flex-start;
                gap: 16px;
                padding: 18px;
                border-radius: 16px;
                background: #FFFFFF;
                border: 1px solid rgba(21,15,46,0.08);
                box-shadow: 0 2px 10px rgba(21,15,46,0.04);
                cursor: pointer;
                text-align: left;
                transition: transform .2s cubic-bezier(.2,.7,.2,1), box-shadow .2s, border-color .2s;
              }
              .cat-card__ico {
                width: 42px; height: 42px;
                display: grid; place-items: center;
                border-radius: 12px;
                background: #F3EDFB;
                color: #7C3AED;
                transition: background .2s, color .2s, transform .2s;
              }
              .cat-card__label {
                font-weight: 600;
                font-size: 14.5px;
                line-height: 1.25;
                letter-spacing: -0.01em;
                color: #150F2E;
              }
              .cat-card__arrow {
                position: absolute;
                right: 15px; bottom: 15px;
                color: #7C3AED;
                opacity: 0;
                transform: translateX(-5px);
                transition: opacity .2s, transform .2s;
              }
              .cat-card:hover {
                transform: translateY(-3px);
                box-shadow: 0 14px 30px -12px rgba(124,58,237,0.22);
                border-color: rgba(124,58,237,0.35);
              }
              .cat-card:hover .cat-card__ico { background: #7C3AED; color: #FFFFFF; transform: scale(1.05); }
              .cat-card:hover .cat-card__arrow { opacity: 1; transform: none; }
              .cat-card:active { transform: translateY(-1px); }
              .cat-card.is-sel {
                border-color: #7C3AED;
                box-shadow: 0 10px 26px -12px rgba(124,58,237,0.5);
              }
              .cat-card.is-sel .cat-card__ico { background: #7C3AED; color: #FFFFFF; }
              .cat-card.is-sel .cat-card__label { color: #7C3AED; }
            `}</style>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  // ── Список исполнителей ──

  return (
    <>
      <Header />
      <main style={{ background: BG, minHeight: '100vh' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: 'clamp(20px,4vw,36px) clamp(16px,4vw,40px)' }}>

          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: MUTED, marginBottom: 20, flexWrap: 'wrap' }}>
            <button onClick={() => setShowList(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: ACCENT, fontSize: 14 }}>Каталог</button>
            <span>→</span>
            <span style={{ color: TEXT, fontWeight: 500 }}>{selectedLabels.length > 0 ? selectedLabels.join(', ') : 'Все категории'}</span>
          </div>

          {eventId && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: `${ACCENT}10`, border: `1px solid ${ACCENT}30`, borderRadius: 14, padding: '10px 16px', marginBottom: 16, flexWrap: 'wrap' }}>
              <span style={{ color: ACCENT, fontSize: 13, fontWeight: 600 }}>🎪 Вы подбираете исполнителя для мероприятия — заявка отправится сразу в него</span>
              <Link href={`/events/${eventId}`} style={{ color: ACCENT, fontSize: 13, fontWeight: 700, textDecoration: 'none', flexShrink: 0 }}>← К мероприятию</Link>
            </div>
          )}

          {/* Top bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 style={{ fontSize: 'clamp(22px,3vw,32px)', fontWeight: 800, color: TEXT, letterSpacing: '-0.025em' }}>
                {selectedCats.length === 1
                  ? CAT_MAP[selectedCats[0]]?.label
                  : 'Все исполнители'}
              </h1>
              <p style={{ color: MUTED, marginTop: 4, fontSize: 14 }}>{loading ? 'Загружаем...' : `${total} исполнителей`}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {!eventId && (
                <Link href={eventsNewHref} style={{ display: 'flex', alignItems: 'center', gap: 8, background: ACCENT, color: '#FFFFFF', fontWeight: 700, padding: '10px 18px', borderRadius: 50, fontSize: 13, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                  🎪 Собрать мероприятие
                </Link>
              )}
              {/* Mobile filter button */}
              <button onClick={() => setSidebarOpen(o => !o)} className="mobile-filter-btn"
                style={{ display: 'none', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '10px 16px', color: TEXT, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                ⚙ Фильтры
              </button>
            </div>
          </div>

          {/* Mobile sidebar overlay */}
          {sidebarOpen && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.75)' }} onClick={() => setSidebarOpen(false)}>
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 300, background: BG, padding: 20, overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', color: TEXT, fontSize: 20, cursor: 'pointer', marginBottom: 16 }}>✕</button>
                <CatalogFilters city={city} setCity={setCity} search={search} setSearch={setSearch}
                  filterDate={filterDate} setFilterDate={setFilterDate} priceMin={priceMin} setPriceMin={setPriceMin}
                  priceMax={priceMax} setPriceMax={setPriceMax} sortBy={sortBy} setSortBy={setSortBy}
                  setPage={setPage} selectedCats={selectedCats} toggleCat={toggleCat} />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
            {/* Desktop sidebar */}
            <aside className="desktop-sidebar" style={{ width: 240, flexShrink: 0, position: 'sticky', top: 76 }}>
              <CatalogFilters city={city} setCity={setCity} search={search} setSearch={setSearch}
                filterDate={filterDate} setFilterDate={setFilterDate} priceMin={priceMin} setPriceMin={setPriceMin}
                priceMax={priceMax} setPriceMax={setPriceMax} sortBy={sortBy} setSortBy={setSortBy}
                setPage={setPage} selectedCats={selectedCats} toggleCat={toggleCat} />
            </aside>

            {/* Cards */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {selectedCats.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                  {selectedCats.map(s => (
                    <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(124,58,237,0.1)', border: `1px solid ${ACCENT}44`, color: ACCENT, fontSize: 12, fontWeight: 600, padding: '5px 8px 5px 12px', borderRadius: 50 }}>
                      {CAT_MAP[s]?.label}
                      <button onClick={() => toggleCat(s)} aria-label="Сбросить категорию" style={{ background: 'none', border: 'none', cursor: 'pointer', color: ACCENT, fontSize: 12, lineHeight: 1 }}>✕</button>
                    </span>
                  ))}
                </div>
              )}

              {loading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: 14 }}>
                  {[...Array(6)].map((_,i) => (
                    <div key={i} style={{ background: CARD, borderRadius: 16, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
                      <div style={{ height: 160, background: 'rgba(21,15,46,0.05)' }} />
                      <div style={{ padding: 14 }}>
                        <div style={{ height: 13, background: 'rgba(21,15,46,0.07)', borderRadius: 6, width: '70%', marginBottom: 8 }} />
                        <div style={{ height: 10, background: 'rgba(21,15,46,0.05)', borderRadius: 6, width: '50%' }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : items.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 0', color: MUTED }}>
                  <p style={{ fontSize: 40, marginBottom: 12 }}>🔍</p>
                  <p style={{ fontSize: 17, fontWeight: 600, color: TEXT, marginBottom: 6 }}>Никого не найдено</p>
                  <p style={{ fontSize: 14 }}>Попробуйте изменить фильтры или выбрать другие категории</p>
                </div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: 14 }}>
                    {items.map(item => {
                      const primaryCat = item.profileCategories?.find(pc => pc.isPrimary)?.category || item.profileCategories?.[0]?.category
                      const catSlug = primaryCat?.slug || selectedCats[0]
                      return (
                        <Link key={item.id} href={`/catalog/${item.id}${profileLinkSuffix}`}
                          style={{ textDecoration: 'none', display: 'block', background: CARD, borderRadius: 16, border: `1px solid ${BORDER}`, overflow: 'hidden', transition: 'all 0.2s', boxShadow: '0 2px 12px rgba(21,15,46,0.05)' }}
                          onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor=`${ACCENT}44`; el.style.transform='translateY(-2px)'; el.style.boxShadow='0 8px 24px rgba(21,15,46,0.1)' }}
                          onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor=BORDER; el.style.transform='none'; el.style.boxShadow='0 2px 12px rgba(21,15,46,0.05)' }}>
                          <div style={{ height: 160, background: 'rgba(21,15,46,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                            {item.avatarUrl ? <img src={item.avatarUrl} alt={item.displayName} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                              : item.portfolio?.[0] ? <img src={item.portfolio[0].mediaUrl} alt={item.displayName} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                              : <span style={{ color: 'rgba(21,15,46,0.22)' }}>{catSlug ? <CatIcon slug={catSlug} size={40} /> : null}</span>}
                            <div style={{ position: 'absolute', top: 8, right: 8 }}>
                              <FavoriteButton profileId={item.id} active={favoriteIds.has(item.id)}
                                onToggle={next => toggleFavorite(item.id, next)} size={28} />
                            </div>
                          </div>
                          <div style={{ padding: 14 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                              <p style={{ fontWeight: 700, fontSize: 15, color: TEXT, lineHeight: 1.3 }}>{item.displayName}</p>
                              {item.avgRating && Number(item.avgRating) > 0 && (
                                <span style={{ fontSize: 12, fontWeight: 600, color: TEXT, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 2 }}>
                                  <span style={{ color: '#FBBF24' }}>★</span>{Number(item.avgRating).toFixed(1)}
                                </span>
                              )}
                            </div>
                            <p style={{ color: MUTED, fontSize: 12, marginBottom: 8 }}>{item.city}{primaryCat && ` · ${primaryCat.name}`}</p>
                            {item.bio && (
                              <p style={{ color: 'rgba(21,15,46,0.45)', fontSize: 12, lineHeight: 1.6, marginBottom: 10, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as any}>
                                {item.bio}
                              </p>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: `1px solid ${BORDER}`, paddingTop: 10 }}>
                              {item.priceFrom
                                ? <span style={{ fontWeight: 700, fontSize: 13, color: TEXT }}>от {Number(item.priceFrom).toLocaleString('ru-RU')} ₽{item.priceUnit && <span style={{ color: MUTED, fontWeight: 400, fontSize: 11 }}> / {item.priceUnit}</span>}</span>
                                : <span style={{ color: MUTED, fontSize: 12 }}>По запросу</span>}
                              <span style={{ color: ACCENT, fontSize: 13, fontWeight: 600 }}>→</span>
                            </div>
                          </div>
                        </Link>
                      )
                    })}
                  </div>

                  {totalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 32 }}>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                        <button key={p} onClick={() => setPage(p)}
                          style={{ width: 36, height: 36, borderRadius: 10, fontSize: 13, fontWeight: 600, border: `1px solid ${page===p ? ACCENT : BORDER}`, background: page===p ? ACCENT : 'transparent', color: page===p ? '#FFFFFF' : MUTED, cursor: 'pointer' }}>
                          {p}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />

      <style>{`
        @media (max-width: 768px) {
          .desktop-sidebar { display: none !important; }
          .mobile-filter-btn { display: flex !important; }
        }
      `}</style>
    </>
  )
}