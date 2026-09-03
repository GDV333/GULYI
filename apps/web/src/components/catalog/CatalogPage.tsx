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
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 10, background: active ? 'rgba(124,58,237,0.1)' : 'transparent', border: 'none', cursor: 'pointer', color: active ? ACCENT : MUTED, fontWeight: active ? 600 : 400, fontSize: 13, textAlign: 'left' }}>
                <span style={{ width: 16, height: 16, borderRadius: 4, border: `1px solid ${active ? ACCENT : BORDER}`, background: active ? ACCENT : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#FFFFFF', flexShrink: 0 }}>
                  {active ? '✓' : ''}
                </span>
                <span>{c.emoji}</span>
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
    setSelectedCats(prev => prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug])
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
                <p style={{ color: MUTED, marginTop: 4, fontSize: 15 }}>Выберите одну или несколько категорий</p>
              </div>
              <Link href={eventsNewHref} style={{ display: 'flex', alignItems: 'center', gap: 8, background: ACCENT, color: '#FFFFFF', fontWeight: 700, padding: '11px 20px', borderRadius: 50, fontSize: 14, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
                🎪 Собрать команду на мероприятие
              </Link>
            </div>

            {selectedCats.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
                {selectedCats.map(s => (
                  <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, background: ACCENT, color: '#FFFFFF', fontSize: 13, fontWeight: 700, padding: '6px 14px', borderRadius: 50 }}>
                    {CAT_MAP[s]?.emoji} {CAT_MAP[s]?.label}
                    <button onClick={() => setSelectedCats(prev => prev.filter(x => x !== s))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#FFFFFF', fontSize: 13, padding: 0, marginLeft: 2 }}>✕</button>
                  </span>
                ))}
                <button onClick={() => setShowList(true)}
                  style={{ background: '#150F2E', color: '#FFFFFF', fontWeight: 700, padding: '6px 18px', borderRadius: 50, border: 'none', cursor: 'pointer', fontSize: 13 }}>
                  Показать результаты →
                </button>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px,1fr))', gap: 12 }}>
              {CATEGORIES.map(cat => {
                const sel = selectedCats.includes(cat.value)
                return (
                  <button key={cat.value} onClick={() => toggleCat(cat.value)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      gap: 10, padding: 'clamp(16px,3vw,24px)', borderRadius: 18,
                      border: `1px solid ${sel ? ACCENT : BORDER}`,
                      background: sel ? `rgba(124,58,237,0.1)` : CARD,
                      boxShadow: '0 2px 12px rgba(21,15,46,0.05)',
                      cursor: 'pointer', position: 'relative', transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { if (!sel) (e.currentTarget as HTMLElement).style.borderColor = 'rgba(21,15,46,0.2)' }}
                    onMouseLeave={e => { if (!sel) (e.currentTarget as HTMLElement).style.borderColor = BORDER }}>
                    {sel && (
                      <div style={{ position: 'absolute', top: 10, right: 10, width: 20, height: 20, borderRadius: '50%', background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: '#FFFFFF', fontSize: 10, fontWeight: 700 }}>✓</span>
                      </div>
                    )}
                    <span style={{ fontSize: 40 }}>{cat.emoji}</span>
                    <span style={{ fontWeight: 600, fontSize: 14, color: sel ? ACCENT : TEXT, textAlign: 'center' }}>{cat.label}</span>
                  </button>
                )
              })}
            </div>
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
                  ? `${CAT_MAP[selectedCats[0]]?.emoji} ${CAT_MAP[selectedCats[0]]?.label}`
                  : selectedCats.length > 1 ? `${selectedCats.length} категории` : 'Все исполнители'}
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
                    <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(124,58,237,0.1)', border: `1px solid ${ACCENT}44`, color: ACCENT, fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 50 }}>
                      {CAT_MAP[s]?.emoji} {CAT_MAP[s]?.label}
                      <button onClick={() => toggleCat(s)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: ACCENT, fontSize: 12 }}>✕</button>
                    </span>
                  ))}
                  {selectedCats.length > 1 && (
                    <button onClick={() => setSelectedCats([])}
                      style={{ fontSize: 12, color: MUTED, background: 'transparent', border: `1px solid ${BORDER}`, padding: '5px 12px', borderRadius: 50, cursor: 'pointer' }}>
                      Сбросить все
                    </button>
                  )}
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
                      const catInfo = CAT_MAP[catSlug] || CAT_MAP[selectedCats[0]]
                      return (
                        <Link key={item.id} href={`/catalog/${item.id}${profileLinkSuffix}`}
                          style={{ textDecoration: 'none', display: 'block', background: CARD, borderRadius: 16, border: `1px solid ${BORDER}`, overflow: 'hidden', transition: 'all 0.2s', boxShadow: '0 2px 12px rgba(21,15,46,0.05)' }}
                          onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor=`${ACCENT}44`; el.style.transform='translateY(-2px)'; el.style.boxShadow='0 8px 24px rgba(21,15,46,0.1)' }}
                          onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor=BORDER; el.style.transform='none'; el.style.boxShadow='0 2px 12px rgba(21,15,46,0.05)' }}>
                          <div style={{ height: 160, background: 'rgba(21,15,46,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                            {item.avatarUrl ? <img src={item.avatarUrl} alt={item.displayName} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                              : item.portfolio?.[0] ? <img src={item.portfolio[0].mediaUrl} alt={item.displayName} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                              : <span style={{ fontSize: 48, opacity: 0.3 }}>{catInfo?.emoji}</span>}
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
                            <p style={{ color: MUTED, fontSize: 12, marginBottom: 8 }}>{item.city}{primaryCat && ` · ${catInfo?.emoji} ${primaryCat.name}`}</p>
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