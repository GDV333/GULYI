'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { apiFetch } from '@/lib/apiFetch'
import { CATEGORIES } from '@/components/catalog/HeroSection'
import { EVENT_TYPES } from '@/components/catalog/ProfilePage'

const BG     = 'linear-gradient(135deg, #F3E9FC 0%, #FCEAF1 45%, #FFF4EA 100%)'
const CARD   = '#FFFFFF'
const ACCENT = '#7C3AED'
const BORDER = 'rgba(21,15,46,0.08)'
const TEXT   = '#150F2E'
const MUTED  = 'rgba(21,15,46,0.5)'
const inp: React.CSSProperties = { width:'100%', background:'#F8F6FC', border:`1px solid ${BORDER}`, borderRadius:12, padding:'11px 14px', fontSize:14, color:TEXT, outline:'none', boxSizing:'border-box', colorScheme:'light' }

function Label({ children }: { children: React.ReactNode }) {
  return <label style={{ display:'block', color:MUTED, fontSize:11, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase' as const, marginBottom:8 }}>{children}</label>
}

export function EventEditor() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    () => searchParams.get('categorySlugs')?.split(',').filter(Boolean) || []
  )
  const [eventType, setEventType] = useState('')
  const [eventDate, setEventDate] = useState(searchParams.get('date') || '')
  const [eventTimeFrom, setEventTimeFrom] = useState('')
  const [eventTimeTo, setEventTimeTo] = useState('')
  const [city, setCity] = useState(searchParams.get('city') || '')
  const [location, setLocation] = useState('')
  const [guestsCount, setGuestsCount] = useState('')
  const [budget, setBudget] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const tok = localStorage.getItem('accessToken')
    if (!tok) return
    try {
      const raw = sessionStorage.getItem('event_draft')
      if (raw) {
        const d = JSON.parse(raw)
        setSelectedCategories(d.selectedCategories || [])
        setEventType(d.eventType || '')
        setEventDate(d.eventDate || '')
        setEventTimeFrom(d.eventTimeFrom || '')
        setEventTimeTo(d.eventTimeTo || '')
        setCity(d.city || '')
        setLocation(d.location || '')
        setGuestsCount(d.guestsCount || '')
        setBudget(d.budget || '')
        setDescription(d.description || '')
        sessionStorage.removeItem('event_draft')
      }
    } catch {}
  }, [])

  // Если город не пришёл из поиска на главной и не восстановлен из черновика —
  // подставляем город из профиля пользователя (указан при регистрации)
  useEffect(() => {
    if (searchParams.get('city')) return
    const tok = localStorage.getItem('accessToken')
    if (!tok) return
    apiFetch('/api/auth/me')
      .then(r => r.json())
      .then(me => setCity(prev => prev || me.city || ''))
      .catch(() => {})
  }, [])

  const toggleCategory = (slug: string) =>
    setSelectedCategories(prev => prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug])

  const handleSubmit = async () => {
    if (selectedCategories.length === 0) { setError('Выберите хотя бы одну роль'); return }
    if (!eventDate) { setError('Укажите дату мероприятия'); return }

    const token = localStorage.getItem('accessToken')
    if (!token) {
      try {
        sessionStorage.setItem('event_draft', JSON.stringify({
          selectedCategories, eventType, eventDate, eventTimeFrom, eventTimeTo, city, location, guestsCount, budget, description,
        }))
      } catch {}
      router.push(`/auth/login?redirect=${encodeURIComponent('/events/new')}`)
      return
    }

    setLoading(true)
    setError('')
    try {
      const res = await apiFetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType:     eventType || undefined,
          eventDate:     new Date(eventDate).toISOString(),
          eventTimeFrom: eventTimeFrom || undefined,
          eventTimeTo:   eventTimeTo || undefined,
          city:          city || undefined,
          location:      location || undefined,
          guestsCount:   guestsCount ? Number(guestsCount) : undefined,
          budget:        budget ? Number(budget) : undefined,
          description:   description || undefined,
          roleCategorySlugs: selectedCategories,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(typeof data.error === 'string' ? data.error : 'Не удалось создать мероприятие'); return }
      router.push(`/events/${data.id}`)
    } catch { setError('Не удалось подключиться к серверу') }
    finally { setLoading(false) }
  }

  return (
    <>
      <Header />
      <main style={{ background: BG, minHeight: '100vh' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: 'clamp(20px,4vw,40px) clamp(16px,4vw,40px)' }}>
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 'clamp(24px,3.5vw,32px)', fontWeight: 800, color: TEXT, letterSpacing: '-0.02em', marginBottom: 6 }}>Опишите мероприятие</h1>
            <p style={{ color: MUTED, fontSize: 15 }}>Заполните детали один раз — заявки уйдут нужным исполнителям, а те, кто подтвердит, попадут в общий чат и корзину мероприятия.</p>
          </div>

          {error && (
            <div style={{ background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.3)', color:'#F87171', borderRadius:12, padding:'12px 16px', fontSize:14, marginBottom:16 }}>
              {error}
            </div>
          )}

          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:20, padding:20 }}>
              <Label>Кто нужен</Label>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:8 }}>
                {CATEGORIES.map(cat => {
                  const sel = selectedCategories.includes(cat.slug)
                  return (
                    <button key={cat.slug} onClick={() => toggleCategory(cat.slug)}
                      style={{ padding:'8px 14px', borderRadius:50, fontSize:13, fontWeight:600, border:`1px solid ${sel ? ACCENT : BORDER}`, background: sel ? ACCENT : 'transparent', color: sel ? '#FFFFFF' : MUTED, cursor:'pointer' }}>
                      {cat.name}
                    </button>
                  )
                })}
              </div>
            </div>

            <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:20, padding:20, display:'flex', flexDirection:'column', gap:14 }}>
              <div>
                <Label>Тип мероприятия</Label>
                <select value={eventType} onChange={e => setEventType(e.target.value)} style={inp}>
                  <option value="">Выберите тип...</option>
                  {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                <div style={{ flex:'1 1 160px' }}>
                  <Label>Дата</Label>
                  <input type="date" value={eventDate} min={new Date().toISOString().split('T')[0]} onChange={e => setEventDate(e.target.value)} style={inp} />
                </div>
                <div style={{ flex:'1 1 120px' }}>
                  <Label>Время с</Label>
                  <input type="time" value={eventTimeFrom} onChange={e => setEventTimeFrom(e.target.value)} style={inp} />
                </div>
                <div style={{ flex:'1 1 120px' }}>
                  <Label>Время до</Label>
                  <input type="time" value={eventTimeTo} onChange={e => setEventTimeTo(e.target.value)} style={inp} />
                </div>
              </div>
              <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                <div style={{ flex:'1 1 160px' }}>
                  <Label>Город</Label>
                  <input type="text" placeholder="Москва" value={city} onChange={e => setCity(e.target.value)} style={inp} />
                </div>
                <div style={{ flex:'1 1 200px' }}>
                  <Label>Место проведения</Label>
                  <input type="text" placeholder="Адрес или название площадки" value={location} onChange={e => setLocation(e.target.value)} style={inp} />
                </div>
              </div>
              <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                <div style={{ flex:'1 1 120px' }}>
                  <Label>Гостей</Label>
                  <input type="number" min={1} placeholder="50" value={guestsCount} onChange={e => setGuestsCount(e.target.value)} style={inp} />
                </div>
                <div style={{ flex:'1 1 140px' }}>
                  <Label>Бюджет (₽)</Label>
                  <input type="number" min={0} placeholder="200 000" value={budget} onChange={e => setBudget(e.target.value)} style={inp} />
                </div>
              </div>
              <div>
                <Label>Доп. описание</Label>
                <textarea rows={4} placeholder="Пожелания, особенности мероприятия..." value={description} onChange={e => setDescription(e.target.value)} style={{ ...inp, resize:'none' }} />
              </div>
            </div>

            <button onClick={handleSubmit} disabled={loading}
              style={{ background:ACCENT, color:'#FFFFFF', fontWeight:700, padding:'14px', borderRadius:14, border:'none', cursor: loading ? 'not-allowed' : 'pointer', fontSize:15, opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Создаём...' : 'Создать мероприятие и найти исполнителей'}
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
