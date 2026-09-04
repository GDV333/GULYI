'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const ACCENT = '#7C3AED'
const ACCENT_GRADIENT = 'linear-gradient(90deg, #8B3DFF 0%, #E93D8A 60%, #FF7A45 100%)'
const BORDER = 'rgba(21,15,46,0.1)'
const BORDER_STRONG = 'rgba(21,15,46,0.14)'
const TEXT = '#150F2E'
const MUTED = 'rgba(21,15,46,0.55)'
const LABEL = 'rgba(21,15,46,0.4)'

const WORDS = ['ведущего', 'диджея', 'фотографа', 'декоратора', 'видеографа']

export const CATEGORIES = [
  { slug: 'host', name: 'Ведущие' }, { slug: 'dj', name: 'Диджеи' },
  { slug: 'organizer', name: 'Организаторы' }, { slug: 'video', name: 'Видеографы' },
  { slug: 'photo', name: 'Фотографы' }, { slug: 'reels', name: 'Reels-мастера' },
  { slug: 'coordinator', name: 'Координаторы' }, { slug: 'light_sound', name: 'Свет и звук' },
  { slug: 'outfit', name: 'Наряды' }, { slug: 'venue', name: 'Площадки' },
  { slug: 'transfer', name: 'Трансфер' }, { slug: 'photo_studio', name: 'Фотостудии' },
  { slug: 'catering', name: 'Кейтеринг' }, { slug: 'jewelry', name: 'Украшения' },
  { slug: 'barbershop', name: 'Барбершоп' }, { slug: 'makeup', name: 'Макияж' },
  { slug: 'bachelor', name: 'Мальчишники' }, { slug: 'bachelorette', name: 'Девичники' },
  { slug: 'decor', name: 'Декор' }, { slug: 'confectionery', name: 'Кондитеры' },
]

const CITIES = ['Москва','Санкт-Петербург','Новосибирск','Екатеринбург','Казань','Нижний Новгород','Челябинск','Самара','Омск','Ростов-на-Дону','Уфа','Красноярск','Пермь','Воронеж','Краснодар','Тюмень','Иркутск','Хабаровск','Владивосток','Томск','Сочи','Ставрополь','Белгород','Волгоград']

function RotatingWord() {
  const [idx, setIdx] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setIdx(i => (i + 1) % WORDS.length)
        setVisible(true)
      }, 220)
    }, 2800)
    return () => clearInterval(t)
  }, [])

  return (
    <span style={{
      display: 'inline-block',
      minWidth: '5.4ch',
      color: ACCENT,
      transition: 'opacity 0.22s ease, transform 0.22s ease',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(-14px)',
    }}>
      {WORDS[idx]}
    </span>
  )
}

export function HeroSection() {
  const router = useRouter()
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [categoryOpen, setCategoryOpen] = useState(false)
  const [city, setCity] = useState('')
  const [cityInput, setCityInput] = useState('')
  const [cityOpen, setCityOpen] = useState(false)
  const [date, setDate] = useState('')

  const filteredCities = cityInput.length > 0
    ? CITIES.filter(c => c.toLowerCase().startsWith(cityInput.toLowerCase())).slice(0, 6)
    : []

  const handleSearch = () => {
    const params = new URLSearchParams()
    if (selectedCategories.length > 0) params.set('categorySlugs', selectedCategories.join(','))
    if (city) params.set('city', city)
    if (date) params.set('date', date)

    // Если выбраны роли — заводим мероприятие, чтобы собрать под него всю команду.
    // Без выбранных категорий вести в редактор мероприятия не с чего — идём сразу в каталог.
    if (selectedCategories.length > 0) {
      router.push(`/events/new?${params.toString()}`)
    } else {
      router.push(`/catalog?${params.toString()}`)
    }
  }

  return (
    <section className="gulyay-stagger" style={{ position: 'relative', maxWidth: 1280, margin: '0 auto', padding: 'clamp(22px,3.5vw,44px) clamp(16px,4vw,40px) clamp(20px,3vw,32px)' }}>

      {/* Badge */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        background: '#FFFFFF',
        border: '1px solid rgba(124,58,237,0.15)',
        boxShadow: '0 4px 20px rgba(124,58,237,0.12)',
        borderRadius: 50, padding: '7px 16px', marginBottom: 18,
        position: 'relative', zIndex: 1,
      }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: ACCENT, display: 'inline-block', boxShadow: `0 0 10px ${ACCENT}` }} />
        <span style={{ color: ACCENT, fontSize: 13, fontWeight: 600 }}>Более 4 200 проверенных исполнителей в 38 городах</span>
      </div>

      {/* Headline */}
      <h1 style={{
        fontFamily: 'var(--font-bricolage), "Bricolage Grotesque", system-ui',
        fontSize: 'clamp(34px,5.4vw,60px)',
        fontWeight: 900,
        color: TEXT,
        lineHeight: 1.04,
        letterSpacing: '-0.03em',
        marginBottom: 14,
        position: 'relative', zIndex: 1,
      }}>
        Соберите <RotatingWord /><br />
        <span style={{ fontWeight: 300, color: 'rgba(21,15,46,0.6)' }}>на одно событие</span>
      </h1>

      {/* Subtitle */}
      <p style={{
        fontSize: 'clamp(15px,1.4vw,17px)',
        color: MUTED,
        lineHeight: 1.65,
        maxWidth: '46ch',
        marginBottom: 24,
        position: 'relative', zIndex: 1,
      }}>
        Площадки, диджеи, ведущие, фотографы, кейтеринг и декор — выбрать, сравнить и забронировать всю команду разом.
      </p>

      {/* Search box */}
      <div style={{
        display: 'flex',
        background: '#FFFFFF',
        border: `1px solid ${BORDER_STRONG}`,
        borderRadius: 20,
        maxWidth: 880,
        position: 'relative',
        zIndex: 20,
        flexWrap: 'wrap',
        marginBottom: 20,
        boxShadow: '0 18px 50px -12px rgba(124,58,237,0.22)',
      }}>

        {/* Category */}
        <div
          className="hero-search-field"
          style={{ flex: '1 1 200px', padding: '16px 20px', borderRight: `1px solid ${BORDER}`, cursor: 'pointer', position: 'relative', minWidth: 0 }}
          onClick={() => { setCategoryOpen(o => !o); setCityOpen(false) }}
        >
          <div style={{ fontSize: 10, color: LABEL, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>Что нужно</div>
          <div style={{
            fontSize: 14, fontWeight: 500,
            color: selectedCategories.length ? TEXT : 'rgba(21,15,46,0.35)',
            minHeight: 22, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {selectedCategories.length === 0
              ? 'Выберите категории'
              : selectedCategories.map(s => CATEGORIES.find(c => c.slug === s)?.name).filter(Boolean).join(', ')}
          </div>
          {categoryOpen && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, marginTop: 6,
              background: '#FFFFFF',
              border: `1px solid ${BORDER_STRONG}`,
              borderRadius: 16, width: 260, maxHeight: 280, overflowY: 'auto', zIndex: 50,
              boxShadow: '0 12px 40px rgba(21,15,46,0.14)',
            }}>
              {CATEGORIES.map(cat => {
                const sel = selectedCategories.includes(cat.slug)
                return (
                  <button key={cat.slug}
                    onClick={e => { e.stopPropagation(); setSelectedCategories(p => p.includes(cat.slug) ? p.filter(s => s !== cat.slug) : [...p, cat.slug]) }}
                    style={{
                      width: '100%', textAlign: 'left', padding: '11px 16px', fontSize: 14,
                      color: sel ? ACCENT : 'rgba(21,15,46,0.75)',
                      background: sel ? 'rgba(124,58,237,0.08)' : 'none',
                      border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => { if (!sel) e.currentTarget.style.background = 'rgba(21,15,46,0.04)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = sel ? 'rgba(124,58,237,0.08)' : 'none' }}
                  >
                    <span style={{
                      width: 16, height: 16, borderRadius: 4,
                      border: `1.5px solid ${sel ? ACCENT : 'rgba(21,15,46,0.2)'}`,
                      background: sel ? ACCENT : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, color: '#FFFFFF', flexShrink: 0, transition: 'all 0.15s',
                    }}>
                      {sel ? '✓' : ''}
                    </span>
                    {cat.name}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* City */}
        <div className="hero-search-field" style={{ flex: '1 1 160px', padding: '16px 20px', borderRight: `1px solid ${BORDER}`, position: 'relative', minWidth: 0 }}>
          <div style={{ fontSize: 10, color: LABEL, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>Город</div>
          <input
            type="text"
            placeholder="Начните вводить..."
            value={cityInput}
            onChange={e => { setCityInput(e.target.value); setCityOpen(true); if (!e.target.value) setCity('') }}
            onFocus={() => setCityOpen(true)}
            onBlur={() => setTimeout(() => setCityOpen(false), 150)}
            style={{
              fontSize: 14, fontWeight: 500, background: 'none', border: 'none', outline: 'none',
              color: TEXT, width: '100%', padding: 0,
            }}
          />
          {cityOpen && filteredCities.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, marginTop: 6,
              background: '#FFFFFF', border: `1px solid ${BORDER_STRONG}`,
              borderRadius: 14, width: 220, zIndex: 50,
              boxShadow: '0 12px 40px rgba(21,15,46,0.14)',
            }}>
              {filteredCities.map(c => (
                <button key={c}
                  onMouseDown={() => { setCity(c); setCityInput(c); setCityOpen(false) }}
                  style={{
                    width: '100%', textAlign: 'left', padding: '11px 16px', fontSize: 14,
                    color: 'rgba(21,15,46,0.75)', background: 'none', border: 'none', cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(21,15,46,0.04)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Date */}
        <div className="hero-search-field hero-search-field-last" style={{ flex: '1 1 140px', padding: '16px 20px', borderRight: `1px solid ${BORDER}`, minWidth: 0 }}>
          <div style={{ fontSize: 10, color: LABEL, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>Дата</div>
          <input
            type="date"
            value={date}
            min={new Date().toISOString().split('T')[0]}
            onChange={e => setDate(e.target.value)}
            style={{
              fontSize: 14, fontWeight: 500, background: 'none', border: 'none', outline: 'none',
              color: date ? TEXT : 'rgba(21,15,46,0.35)',
              width: '100%', padding: 0, colorScheme: 'light',
            }}
          />
        </div>

        {/* Button */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '10px 12px', width: '100%' }} className="search-btn-wrap">
          <button
            onClick={handleSearch}
            style={{
              background: ACCENT_GRADIENT, color: '#FFFFFF',
              padding: '13px 20px', borderRadius: 13,
              fontWeight: 700, fontSize: 15,
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              width: '100%', justifyContent: 'center',
              transition: 'opacity 0.18s, transform 0.18s',
              boxShadow: `0 4px 20px rgba(139,61,255,0.3)`,
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/>
            </svg>
            Найти
          </button>
        </div>
      </div>

      {/* Social proof */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex' }}>
          {['#8B3DFF', '#C13DE9', '#E93D8A', '#FF7A45'].map((c, idx) => (
            <div key={c} className="gulyay-pop-in" style={{
              width: 34, height: 34, borderRadius: '50%',
              background: c,
              border: '2px solid #FFFFFF',
              marginLeft: idx === 0 ? 0 : -10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: '#FFFFFF',
              animationDelay: `${0.5 + idx * 0.09}s`,
            }}>
              {['А', 'М', 'Е', 'Д'][idx]}
            </div>
          ))}
        </div>
        <span style={{ color: 'rgba(21,15,46,0.55)', fontSize: 14 }}>
          <b style={{ color: TEXT }}>12 000+</b> мероприятий собрано
        </span>
        <span style={{ color: '#FBBF24', fontSize: 14 }}>★★★★★</span>
        <span style={{ color: 'rgba(21,15,46,0.55)', fontSize: 14 }}>
          <b style={{ color: TEXT }}>4.9</b> средняя оценка
        </span>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .hero-search-field {
            flex: 1 1 100% !important;
            border-right: none !important;
            border-bottom: 1px solid ${BORDER};
          }
          .hero-search-field-last { border-bottom: none; }
        }
      `}</style>
    </section>
  )
}