'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { apiFetch } from '@/lib/apiFetch'
import { EVENT_TYPES } from '@/components/catalog/ProfilePage'
import { CATEGORIES } from '@/components/catalog/HeroSection'

const BG     = 'linear-gradient(135deg, #F3E9FC 0%, #FCEAF1 45%, #FFF4EA 100%)'
const CARD   = '#FFFFFF'
const ACCENT = '#7C3AED'
const BORDER = 'rgba(21,15,46,0.08)'
const TEXT   = '#150F2E'
const MUTED  = 'rgba(21,15,46,0.5)'
const inp: React.CSSProperties = { width:'100%', background:'#F8F6FC', border:`1px solid ${BORDER}`, borderRadius:12, padding:'11px 14px', fontSize:14, color:TEXT, outline:'none', boxSizing:'border-box', colorScheme:'light' }

const BOOKING_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label:'Ожидает',     color:'#FBBF24', bg:'rgba(251,191,36,0.12)' },
  confirmed: { label:'Подтверждён', color:'#34D399', bg:'rgba(52,211,153,0.12)' },
  paid:      { label:'Оплачен',     color:'#60A5FA', bg:'rgba(96,165,250,0.12)' },
  completed: { label:'Завершён',    color:MUTED,     bg:'rgba(21,15,46,0.06)' },
  cancelled: { label:'Отменён',     color:'#F87171', bg:'rgba(248,113,113,0.12)' },
  refunded:  { label:'Возврат',     color:'#C084FC', bg:'rgba(192,132,252,0.12)' },
}

const EVENT_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  active:    { label:'Собираем команду', color:'#7C3AED', bg:'rgba(124,58,237,0.1)' },
  paid:      { label:'Оплачено',         color:'#34D399', bg:'rgba(52,211,153,0.12)' },
  completed: { label:'Завершено',        color:MUTED,     bg:'rgba(21,15,46,0.06)' },
  cancelled: { label:'Отменено',         color:'#F87171', bg:'rgba(248,113,113,0.12)' },
}

interface Category { slug: string; name: string; icon: string | null }
interface EventRole { id: string; notes: string | null; status: 'searching' | 'filled' | 'cancelled'; category: Category }
interface BookingProfile { id: string; userId?: string; displayName: string; city: string; avatarUrl: string | null; priceFrom: string | null; priceUnit: string | null }
interface EventBooking { id: string; eventRoleId: string | null; status: string; total: string; createdAt: string; profile: BookingProfile }
interface ChatUser { id: string; email: string; profile?: { displayName: string; avatarUrl?: string | null } | null }
interface ConversationMember { user: ChatUser }
interface EventDetail {
  id: string; clientId: string; eventType: string | null; eventDate: string
  eventTimeFrom: string | null; eventTimeTo: string | null; city: string | null; location: string | null
  guestsCount: number | null; budget: string | null; description: string | null
  status: 'active' | 'paid' | 'completed' | 'cancelled'; paidAt: string | null
  roles: EventRole[]; bookings: EventBooking[]
  conversation: { id: string; members: ConversationMember[] } | null
}
interface ChatMessage { id: string; text: string; createdAt: string; sender: ChatUser }

const initialOf = (name?: string) => (name?.trim()?.[0] || '?').toUpperCase()
// Имя вместо почты; для заказчика — фиксированная подпись, как везде в приложении
const nameOf = (u: ChatUser, clientId: string) => u.id === clientId ? 'Заказчик' : (u.profile?.displayName || u.email)

function Label({ children }: { children: React.ReactNode }) {
  return <label style={{ display:'block', color:MUTED, fontSize:11, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase' as const, marginBottom:8 }}>{children}</label>
}

const Card = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:20, padding:'clamp(16px,3vw,24px)', boxShadow:'0 4px 24px rgba(21,15,46,0.06)', ...style }}>{children}</div>
)

export function EventPage({ id }: { id: string }) {
  const router = useRouter()
  const [myId, setMyId] = useState('')
  const [event, setEvent] = useState<EventDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ eventType:'', eventDate:'', eventTimeFrom:'', eventTimeTo:'', city:'', location:'', guestsCount:'', budget:'', description:'' })
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')

  const [addRoleOpen, setAddRoleOpen] = useState(false)
  const [addRoleLoading, setAddRoleLoading] = useState(false)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [chatText, setChatText] = useState('')
  const [chatSending, setChatSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const token = () => localStorage.getItem('accessToken')

  const loadEvent = () => {
    const tok = token()
    if (!tok) return
    apiFetch(`/api/events/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setNotFound(true); return }
        setEvent(data)
        setForm({
          eventType: data.eventType || '', eventDate: data.eventDate?.split('T')[0] || '',
          eventTimeFrom: data.eventTimeFrom || '', eventTimeTo: data.eventTimeTo || '',
          city: data.city || '', location: data.location || '',
          guestsCount: data.guestsCount != null ? String(data.guestsCount) : '',
          budget: data.budget || '', description: data.description || '',
        })
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    const tok = token()
    const ud = localStorage.getItem('user')
    if (!tok || !ud) { router.push(`/auth/login?redirect=${encodeURIComponent(`/events/${id}`)}`); return }
    setMyId(JSON.parse(ud).id)
    loadEvent()
  }, [id])

  const isOwner = event ? event.clientId === myId : false
  const isMember = event ? isOwner || !!event.conversation?.members.some(m => m.user.id === myId) : false

  useEffect(() => {
    if (!event || !isMember) return
    const fetchMessages = () => {
      apiFetch(`/api/events/${id}/chat/messages`)
        .then(r => r.json()).then(d => Array.isArray(d) && setMessages(d)).catch(() => {})
    }
    fetchMessages()
    const t = setInterval(fetchMessages, 4000)
    return () => clearInterval(t)
  }, [event?.id, isMember])

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages.length])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await apiFetch(`/api/events/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: form.eventType || undefined,
          eventDate: form.eventDate ? new Date(form.eventDate).toISOString() : undefined,
          eventTimeFrom: form.eventTimeFrom || undefined,
          eventTimeTo: form.eventTimeTo || undefined,
          city: form.city || undefined,
          location: form.location || undefined,
          guestsCount: form.guestsCount ? Number(form.guestsCount) : undefined,
          budget: form.budget ? Number(form.budget) : undefined,
          description: form.description || undefined,
        }),
      })
      if (res.ok) { const data = await res.json(); setEvent(data); setEditing(false); setSaveSuccess(true); setTimeout(() => setSaveSuccess(false), 3000) }
    } catch (e) { console.error(e) } finally { setSaving(false) }
  }

  const handleCheckout = async () => {
    setCheckoutLoading(true); setCheckoutError('')
    try {
      const res = await apiFetch(`/api/events/${id}/checkout`, { method: 'PATCH' })
      const data = await res.json()
      if (!res.ok) { setCheckoutError(typeof data.error === 'string' ? data.error : 'Не удалось оформить оплату'); return }
      setEvent(data)
    } catch { setCheckoutError('Не удалось подключиться к серверу') }
    finally { setCheckoutLoading(false) }
  }

  const handleAddRole = async (categorySlug: string) => {
    setAddRoleLoading(true)
    try {
      const res = await apiFetch(`/api/events/${id}/roles`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categorySlug }),
      })
      if (res.ok) { const data = await res.json(); setEvent(data); setAddRoleOpen(false) }
    } catch (e) { console.error(e) } finally { setAddRoleLoading(false) }
  }

  const handleSendMessage = async () => {
    if (!chatText.trim()) return
    const text = chatText
    setChatText('')
    setChatSending(true)
    setMessages(prev => [...prev, { id: `tmp-${Date.now()}`, text, createdAt: new Date().toISOString(), sender: { id: myId, email: '' } }])
    try {
      await apiFetch(`/api/events/${id}/chat/messages`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
    } catch (e) { console.error(e) } finally { setChatSending(false) }
  }

  if (loading) return (
    <><Header /><main style={{ background: BG, minHeight: '100vh' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: 40 }}>
        <div style={{ height: 200, background: 'rgba(21,15,46,0.05)', borderRadius: 20 }} />
      </div>
    </main><Footer /></>
  )

  if (notFound || !event) return (
    <><Header /><main style={{ background: BG, minHeight: '100vh' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '80px 20px', textAlign: 'center' }}>
        <p style={{ fontSize: 40, marginBottom: 12 }}>🔍</p>
        <p style={{ fontWeight: 700, fontSize: 18, color: TEXT, marginBottom: 8 }}>Мероприятие не найдено</p>
        <Link href="/events" style={{ color: ACCENT, fontWeight: 600, textDecoration: 'none' }}>← Мои мероприятия</Link>
      </div>
    </main><Footer /></>
  )

  const eStatus = EVENT_STATUS[event.status] || EVENT_STATUS.active
  const cartBookings = event.bookings.filter(b => b.status === 'confirmed' || b.status === 'paid')
  const cartTotal = cartBookings.reduce((sum, b) => sum + Number(b.total), 0)
  const canCheckout = isOwner && event.status === 'active' && cartBookings.some(b => b.status === 'confirmed')

  // Личный чат с конкретным участником — ищем бронь, которая их связывает.
  // Заказчик → бронь этого исполнителя; исполнитель → свою собственную бронь на это мероприятие.
  const bookingIdWith = (memberUserId: string): string | null => {
    if (!myId || memberUserId === myId) return null
    if (memberUserId === event.clientId) {
      const mine = event.bookings.find(b => b.profile?.userId === myId && b.status !== 'cancelled')
      return mine ? mine.id : null
    }
    if (isOwner) {
      const b = event.bookings.find(b => b.profile?.userId === memberUserId && b.status !== 'cancelled')
      return b ? b.id : null
    }
    return null
  }

  return (
    <>
      <Header />
      <main style={{ background: BG, minHeight: '100vh' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: 'clamp(16px,4vw,32px) clamp(16px,4vw,40px)' }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: MUTED, marginBottom: 20 }}>
            <Link href="/events" style={{ color: ACCENT, textDecoration: 'none' }}>Мои мероприятия</Link>
            <span>→</span>
            <span style={{ color: TEXT, fontWeight: 500 }}>{event.eventType || 'Мероприятие'}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
            <h1 style={{ fontSize: 'clamp(22px,3vw,30px)', fontWeight: 800, color: TEXT, letterSpacing: '-0.02em' }}>
              {event.eventType || 'Мероприятие'} · {new Date(event.eventDate).toLocaleDateString('ru-RU', { day:'numeric', month:'long', year:'numeric' })}
            </h1>
            <span style={{ fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 50, background: eStatus.bg, color: eStatus.color }}>{eStatus.label}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Summary */}
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h2 style={{ fontWeight: 700, fontSize: 16, color: TEXT }}>О мероприятии</h2>
                {isOwner && !editing && <button onClick={() => setEditing(true)} style={{ fontSize: 13, color: ACCENT, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>Редактировать</button>}
              </div>

              {editing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <Label>Тип мероприятия</Label>
                    <select value={form.eventType} onChange={e => setForm(f => ({ ...f, eventType: e.target.value }))} style={inp}>
                      <option value="">Выберите тип...</option>
                      {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 160px' }}><Label>Дата</Label><input type="date" value={form.eventDate} onChange={e => setForm(f => ({ ...f, eventDate: e.target.value }))} style={inp} /></div>
                    <div style={{ flex: '1 1 120px' }}><Label>Время с</Label><input type="time" value={form.eventTimeFrom} onChange={e => setForm(f => ({ ...f, eventTimeFrom: e.target.value }))} style={inp} /></div>
                    <div style={{ flex: '1 1 120px' }}><Label>Время до</Label><input type="time" value={form.eventTimeTo} onChange={e => setForm(f => ({ ...f, eventTimeTo: e.target.value }))} style={inp} /></div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 160px' }}><Label>Город</Label><input type="text" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} style={inp} /></div>
                    <div style={{ flex: '1 1 120px' }}><Label>Гостей</Label><input type="number" min={1} value={form.guestsCount} onChange={e => setForm(f => ({ ...f, guestsCount: e.target.value }))} style={inp} /></div>
                    <div style={{ flex: '1 1 140px' }}><Label>Бюджет (₽)</Label><input type="number" min={0} value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} style={inp} /></div>
                  </div>
                  <div><Label>Место проведения</Label><input type="text" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} style={inp} /></div>
                  <div><Label>Доп. описание</Label><textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ ...inp, resize: 'none' }} /></div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={handleSave} disabled={saving} style={{ background: ACCENT, color: '#FFFFFF', fontWeight: 700, padding: '11px 24px', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 14, opacity: saving ? 0.6 : 1 }}>{saving ? 'Сохраняем...' : 'Сохранить'}</button>
                    <button onClick={() => setEditing(false)} style={{ background: 'transparent', border: `1px solid ${BORDER}`, color: MUTED, padding: '11px 24px', borderRadius: 12, cursor: 'pointer', fontSize: 14 }}>Отмена</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {saveSuccess && <span style={{ color: '#34D399', fontWeight: 600, fontSize: 13, marginBottom: 4 }}>✓ Сохранено!</span>}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, fontSize: 14, color: TEXT }}>
                    {(event.eventTimeFrom || event.eventTimeTo) && <span>🕐 {event.eventTimeFrom && event.eventTimeTo ? `${event.eventTimeFrom}–${event.eventTimeTo}` : event.eventTimeFrom || event.eventTimeTo}</span>}
                    {event.city && <span>📍 {event.city}</span>}
                    {event.guestsCount && <span>👥 {event.guestsCount} гостей</span>}
                    {event.budget && <span>💰 {Number(event.budget).toLocaleString('ru-RU')} ₽</span>}
                  </div>
                  {event.location && <p style={{ color: MUTED, fontSize: 14 }}>Место: {event.location}</p>}
                  {event.description && <p style={{ color: TEXT, fontSize: 14, lineHeight: 1.6 }}>{event.description}</p>}
                </div>
              )}
            </Card>

            {/* Roles */}
            <Card>
              <h2 style={{ fontWeight: 700, fontSize: 16, color: TEXT, marginBottom: 16 }}>Кто нужен</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {event.roles.map(role => {
                  const roleBookings = event.bookings.filter(b => b.eventRoleId === role.id)
                  const filledBooking = roleBookings.find(b => b.status === 'confirmed' || b.status === 'paid')
                  const dateStr = event.eventDate.split('T')[0]
                  const findUrl = `/catalog?categorySlugs=${role.category.slug}${event.city ? `&city=${encodeURIComponent(event.city)}` : ''}&date=${dateStr}&eventId=${event.id}&roleId=${role.id}`
                  return (
                    <div key={role.id} style={{ border: `1px solid ${BORDER}`, borderRadius: 16, padding: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, fontSize: 14, color: TEXT }}>{role.category.icon} {role.category.name}</span>
                        {role.status === 'filled'
                          ? <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 50, background: 'rgba(52,211,153,0.12)', color: '#34D399' }}>✓ Найден</span>
                          : role.status === 'cancelled'
                          ? <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 50, background: 'rgba(21,15,46,0.06)', color: MUTED }}>Отменена</span>
                          : isOwner && <Link href={findUrl} style={{ fontSize: 13, color: ACCENT, fontWeight: 600, textDecoration: 'none' }}>Найти исполнителя →</Link>}
                      </div>

                      {filledBooking && (
                        <Link href={`/catalog/${filledBooking.profile.id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, textDecoration: 'none' }}>
                          <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #8B3DFF 0%, #E93D8A 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#FFFFFF', flexShrink: 0 }}>
                            {initialOf(filledBooking.profile.displayName)}
                          </span>
                          <span style={{ fontSize: 13, color: TEXT, fontWeight: 600 }}>{filledBooking.profile.displayName}</span>
                          <span style={{ fontSize: 12, color: MUTED }}>{Number(filledBooking.total).toLocaleString('ru-RU')} ₽</span>
                        </Link>
                      )}

                      {roleBookings.length > 0 && (
                        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {roleBookings.map(b => {
                            const s = BOOKING_STATUS[b.status] || BOOKING_STATUS.pending
                            return (
                              <div key={b.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: 12, color: MUTED }}>
                                <span>{b.profile.displayName}</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  {isOwner && b.status !== 'cancelled' && (
                                    <Link href={`/messages?booking=${b.id}`} style={{ color: ACCENT, fontWeight: 600, textDecoration: 'none' }}>написать</Link>
                                  )}
                                  <span style={{ fontWeight: 700, padding: '2px 8px', borderRadius: 50, background: s.bg, color: s.color }}>{s.label}</span>
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {isOwner && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${BORDER}` }}>
                  {!addRoleOpen ? (
                    <button onClick={() => setAddRoleOpen(true)}
                      style={{ fontSize: 13, color: ACCENT, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
                      + Добавить роль
                    </button>
                  ) : (
                    <div>
                      <p style={{ fontSize: 12, color: MUTED, marginBottom: 10 }}>Кого ещё нужно найти?</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {CATEGORIES.filter(c => !event.roles.some(r => r.category.slug === c.slug)).map(c => (
                          <button key={c.slug} onClick={() => handleAddRole(c.slug)} disabled={addRoleLoading}
                            style={{ padding: '7px 14px', borderRadius: 50, fontSize: 13, fontWeight: 600, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, cursor: addRoleLoading ? 'not-allowed' : 'pointer' }}>
                            {c.name}
                          </button>
                        ))}
                      </div>
                      <button onClick={() => setAddRoleOpen(false)} style={{ marginTop: 10, fontSize: 12, color: MUTED, background: 'none', border: 'none', cursor: 'pointer' }}>Отмена</button>
                    </div>
                  )}
                </div>
              )}
            </Card>

            {/* Cart / checkout */}
            {cartBookings.length > 0 && (
              <Card>
                <h2 style={{ fontWeight: 700, fontSize: 16, color: TEXT, marginBottom: 16 }}>Корзина</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                  {cartBookings.map(b => (
                    <div key={b.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 14 }}>
                      <span style={{ color: TEXT }}>{b.profile.displayName}</span>
                      <span style={{ fontWeight: 700, color: TEXT }}>{Number(b.total).toLocaleString('ru-RU')} ₽</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: `1px solid ${BORDER}`, paddingTop: 14 }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: TEXT }}>Итого</span>
                  <span style={{ fontWeight: 800, fontSize: 20, color: TEXT }}>{cartTotal.toLocaleString('ru-RU')} ₽</span>
                </div>
                {checkoutError && <p style={{ color: '#F87171', fontSize: 13, marginTop: 10 }}>{checkoutError}</p>}
                {isOwner && (
                  event.status === 'paid' ? (
                    <div style={{ marginTop: 14, textAlign: 'center', color: '#34D399', fontWeight: 700, fontSize: 14 }}>✓ Оплачено</div>
                  ) : (
                    <button onClick={handleCheckout} disabled={!canCheckout || checkoutLoading}
                      style={{ marginTop: 14, width: '100%', background: ACCENT, color: '#FFFFFF', fontWeight: 700, padding: '13px', borderRadius: 14, border: 'none', cursor: canCheckout ? 'pointer' : 'not-allowed', fontSize: 15, opacity: canCheckout ? 1 : 0.5 }}>
                      {checkoutLoading ? 'Оформляем...' : 'Оплатить'}
                    </button>
                  )
                )}
              </Card>
            )}

            {/* Group chat */}
            {isMember && (
              <Card>
                <h2 style={{ fontWeight: 700, fontSize: 16, color: TEXT, marginBottom: 12 }}>Общий чат</h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                  {event.conversation?.members.map(m => {
                    const name = nameOf(m.user, event.clientId)
                    const chatId = bookingIdWith(m.user.id)
                    const chipStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(21,15,46,0.04)', borderRadius: 50, padding: '4px 10px 4px 4px', fontSize: 12, color: MUTED, textDecoration: 'none', border: 'none', cursor: chatId ? 'pointer' : 'default', font: 'inherit' }
                    const avatar = (
                      <span style={{ width: 18, height: 18, borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg, #8B3DFF 0%, #E93D8A 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#FFFFFF', flexShrink: 0 }}>
                        {m.user.profile?.avatarUrl ? <img src={m.user.profile.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initialOf(name)}
                      </span>
                    )
                    return chatId ? (
                      <Link key={m.user.id} href={`/messages?booking=${chatId}`} title="Написать лично" style={chipStyle}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = ACCENT}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = MUTED}>
                        {avatar}{name}
                      </Link>
                    ) : (
                      <span key={m.user.id} style={chipStyle}>{avatar}{name}</span>
                    )
                  })}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto', marginBottom: 12, padding: '4px 2px' }}>
                  {messages.length === 0 && <p style={{ color: MUTED, fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Сообщений пока нет</p>}
                  {messages.map(m => {
                    const mine = m.sender.id === myId
                    return (
                      <div key={m.id} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '75%' }}>
                        {!mine && <p style={{ fontSize: 11, color: MUTED, marginBottom: 2, marginLeft: 4 }}>{nameOf(m.sender, event.clientId)}</p>}
                        <div style={{ background: mine ? ACCENT : 'rgba(21,15,46,0.05)', color: mine ? '#FFFFFF' : TEXT, borderRadius: 14, padding: '9px 13px', fontSize: 14, lineHeight: 1.5 }}>
                          {m.text}
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="text" placeholder="Сообщение..." value={chatText}
                    onChange={e => setChatText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSendMessage() }}
                    style={{ ...inp, flex: 1 }} />
                  <button onClick={handleSendMessage} disabled={chatSending || !chatText.trim()}
                    style={{ background: ACCENT, color: '#FFFFFF', fontWeight: 700, padding: '0 20px', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 14, opacity: chatText.trim() ? 1 : 0.5 }}>
                    →
                  </button>
                </div>
              </Card>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
