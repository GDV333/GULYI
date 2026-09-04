'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { apiFetch } from '@/lib/apiFetch'

const BG     = 'linear-gradient(135deg, #F3E9FC 0%, #FCEAF1 45%, #FFF4EA 100%)'
const CARD   = '#FFFFFF'
const ACCENT = '#7C3AED'
const BORDER = 'rgba(21,15,46,0.08)'
const TEXT   = '#150F2E'
const MUTED  = 'rgba(21,15,46,0.5)'
const AVATAR_BG = 'linear-gradient(135deg, #8B3DFF 0%, #E93D8A 100%)'

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: 'Ожидает',     color: '#FBBF24', bg: 'rgba(251,191,36,0.12)' },
  confirmed: { label: 'Подтверждён', color: '#34D399', bg: 'rgba(52,211,153,0.12)' },
  paid:      { label: 'Оплачен',     color: '#60A5FA', bg: 'rgba(96,165,250,0.12)' },
  completed: { label: 'Завершён',    color: MUTED,     bg: 'rgba(21,15,46,0.06)' },
  cancelled: { label: 'Отменён',     color: '#F87171', bg: 'rgba(248,113,113,0.12)' },
  refunded:  { label: 'Возврат',     color: '#C084FC', bg: 'rgba(192,132,252,0.12)' },
}

interface Booking {
  id: string; eventDate: string; status: string; total: number; notes: string | null
  eventTimeFrom?: string | null; eventTimeTo?: string | null; eventType?: string | null
  guestsCount?: number | null; ageCategory?: string | null; duration?: number | null
  location?: string | null; budget?: string | null; eventId?: string | null
  client?: { email: string; profile?: { displayName: string } }
}
interface AvailabilityDate { date: string; isAvailable: boolean }

const initialOf = (name?: string | null) => (name?.trim()?.[0] || '?').toUpperCase()
const clientName = (b: Booking) => b.client?.profile?.displayName || b.client?.email || 'Клиент'

function BookingsCalendar({ bookings, unavailableDates, onSelect }: {
  bookings: Booking[]; unavailableDates: Set<string>; onSelect: (b: Booking) => void
}) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const [viewDate, setViewDate] = useState({ year: today.getFullYear(), month: today.getMonth() })
  const prevMonth = () => setViewDate(v => { const d = new Date(v.year, v.month - 1); return { year: d.getFullYear(), month: d.getMonth() } })
  const nextMonth = () => setViewDate(v => { const d = new Date(v.year, v.month + 1); return { year: d.getFullYear(), month: d.getMonth() } })
  const monthName = new Date(viewDate.year, viewDate.month).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
  const daysInMonth = new Date(viewDate.year, viewDate.month + 1, 0).getDate()
  const startOffset = (new Date(viewDate.year, viewDate.month, 1).getDay() + 6) % 7
  const cells: (number | null)[] = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const byDate: Record<string, Booking[]> = {}
  for (const b of bookings) {
    const d = new Date(b.eventDate)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    ;(byDate[key] ||= []).push(b)
  }
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, overflow: 'hidden', boxShadow: '0 4px 24px rgba(21,15,46,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: `1px solid ${BORDER}` }}>
        <button onClick={prevMonth} style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(21,15,46,0.04)', border: `1px solid ${BORDER}`, color: MUTED, cursor: 'pointer', fontSize: 18 }}>‹</button>
        <span style={{ fontSize: 13, fontWeight: 700, color: TEXT, textTransform: 'capitalize' }}>{monthName}</span>
        <button onClick={nextMonth} style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(21,15,46,0.04)', border: `1px solid ${BORDER}`, color: MUTED, cursor: 'pointer', fontSize: 18 }}>›</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', textAlign: 'center', background: 'rgba(21,15,46,0.02)', borderBottom: `1px solid ${BORDER}` }}>
        {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(d => (
          <div key={d} style={{ fontSize: 10, fontWeight: 700, color: MUTED, padding: '8px 0' }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', padding: 8, gap: 2 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const dateStr = `${viewDate.year}-${String(viewDate.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const isPast = new Date(viewDate.year, viewDate.month, day) < today
          const dayBks = byDate[dateStr] || []
          const isToday = dateStr === todayStr
          const confirmed = dayBks.filter(b => b.status === 'confirmed' || b.status === 'paid')
          const pending = dayBks.filter(b => b.status === 'pending')
          const hasBks = dayBks.length > 0
          const selfUnavailable = !hasBks && unavailableDates.has(dateStr)
          const bg = confirmed.length > 0 ? 'rgba(52,211,153,0.15)' : pending.length > 0 ? 'rgba(251,191,36,0.15)' : hasBks ? 'rgba(248,113,113,0.15)' : selfUnavailable ? 'rgba(21,15,46,0.08)' : 'transparent'
          const dayColor = confirmed.length > 0 ? '#34D399' : pending.length > 0 ? '#FBBF24' : hasBks ? '#F87171' : selfUnavailable ? '#6B7280' : isToday ? ACCENT : isPast ? 'rgba(21,15,46,0.2)' : TEXT
          return (
            <button key={i} disabled={!hasBks && isPast} onClick={() => hasBks && onSelect(dayBks[0])}
              style={{ borderRadius: 10, padding: '6px 2px', textAlign: 'center', background: bg, border: `1px solid ${isToday ? ACCENT : 'transparent'}`, cursor: hasBks ? 'pointer' : 'default', opacity: (!hasBks && isPast) ? 0.35 : 1 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: dayColor }}>{day}</span>
              {hasBks && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 2, marginTop: 2 }}>
                  {dayBks.slice(0, 3).map((b, idx) => (
                    <div key={idx} style={{ width: 4, height: 4, borderRadius: '50%', background: STATUS[b.status]?.color || MUTED }} />
                  ))}
                </div>
              )}
              {selfUnavailable && <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#6B7280', margin: '2px auto 0' }} />}
            </button>
          )
        })}
      </div>
      <div style={{ padding: '10px 16px', borderTop: `1px solid ${BORDER}`, background: 'rgba(21,15,46,0.02)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {[['#34D399', 'Подтверждён'], ['#FBBF24', 'Ожидает'], ['#F87171', 'Отменён'], ['#6B7280', 'Вы недоступны']].map(([c, l]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: c + '22', border: `1px solid ${c}66` }} />
              <span style={{ fontSize: 11, color: MUTED }}>{l}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding: '12px 16px', borderTop: `1px solid ${BORDER}` }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: MUTED, marginBottom: 10 }}>Ближайшие</p>
        {bookings.filter(b => new Date(b.eventDate) >= today && b.status !== 'cancelled').sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()).slice(0, 3).map(b => {
          const s = STATUS[b.status] || STATUS.pending
          return (
            <button key={b.id} onClick={() => onSelect(b)}
              style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 12, background: 'transparent', border: 'none', cursor: 'pointer', marginBottom: 2 }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(21,15,46,0.04)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
              <div style={{ width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0, background: s.bg, color: s.color }}>
                {new Date(b.eventDate).getDate()}
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: TEXT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{clientName(b)}</p>
                <p style={{ fontSize: 11, color: MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.eventType || new Date(b.eventDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function VendorBookings() {
  const router = useRouter()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [availability, setAvailability] = useState<AvailabilityDate[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Booking | null>(null)

  useEffect(() => {
    const tok = localStorage.getItem('accessToken')
    if (!tok) { router.push('/auth/login?redirect=/events'); return }
    apiFetch('/api/bookings').then(r => r.json()).then(d => setBookings(Array.isArray(d) ? d : [])).catch(console.error).finally(() => setLoading(false))
    apiFetch('/api/profile/availability').then(r => r.json()).then(d => { if (Array.isArray(d)) setAvailability(d) }).catch(() => {})
  }, [])

  const unavailableDates = new Set(availability.filter(a => !a.isAvailable).map(a => a.date))

  const updateStatus = async (bookingId: string, status: string) => {
    try {
      await apiFetch(`/api/bookings/${bookingId}/${status === 'confirmed' ? 'confirm' : 'cancel'}`, { method: 'PATCH' })
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status } : b))
    } catch (e) { console.error(e) }
  }

  const deleteBooking = async (bookingId: string) => {
    if (!window.confirm('Удалить эту заявку навсегда?')) return
    try {
      const res = await apiFetch(`/api/bookings/${bookingId}`, { method: 'DELETE' })
      if (!res.ok) return
      setBookings(prev => prev.filter(b => b.id !== bookingId))
      setSelected(b => b?.id === bookingId ? null : b)
    } catch (e) { console.error(e) }
  }

  return (
    <>
      <Header />

      {selected && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.75)', padding: 16 }} onClick={() => setSelected(null)}>
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 24, padding: 24, width: '100%', maxWidth: 440, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(21,15,46,0.25)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontWeight: 800, fontSize: 18, color: TEXT }}>Детали заявки</h2>
              <button onClick={() => setSelected(null)} style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(21,15,46,0.06)', border: `1px solid ${BORDER}`, color: MUTED, cursor: 'pointer', fontSize: 16 }}>✕</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              {(() => { const s = STATUS[selected.status] || STATUS.pending; return <span style={{ fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 50, background: s.bg, color: s.color }}>{s.label}</span> })()}
              <span style={{ color: MUTED, fontSize: 14 }}>📅 {new Date(selected.eventDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                ['Заказчик', clientName(selected)],
                (selected.eventTimeFrom || selected.eventTimeTo) ? ['Время', selected.eventTimeFrom && selected.eventTimeTo ? `${selected.eventTimeFrom} — ${selected.eventTimeTo}` : (selected.eventTimeFrom || selected.eventTimeTo)] : null,
                selected.eventType ? ['Тип мероприятия', selected.eventType] : null,
                selected.guestsCount ? ['Количество гостей', `${selected.guestsCount} человек`] : null,
                selected.ageCategory ? ['Аудитория', selected.ageCategory] : null,
                selected.duration ? ['Продолжительность', `${selected.duration} ч.`] : null,
                selected.location ? ['Место проведения', selected.location] : null,
                selected.budget ? ['Бюджет', `${Number(selected.budget).toLocaleString('ru-RU')} ₽`] : null,
                selected.notes ? ['Комментарий', selected.notes] : null,
              ].filter((row): row is [string, string] => Boolean(row)).map(([label, val]) => (
                <div key={label} style={{ background: 'rgba(21,15,46,0.03)', border: `1px solid ${BORDER}`, borderRadius: 12, padding: '10px 14px' }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: MUTED, marginBottom: 4 }}>{label}</p>
                  <p style={{ fontWeight: 600, color: TEXT, fontSize: 14 }}>{val}</p>
                </div>
              ))}
              <div style={{ background: `${ACCENT}12`, border: `1px solid ${ACCENT}30`, borderRadius: 12, padding: '10px 14px' }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: ACCENT, marginBottom: 4 }}>Сумма</p>
                <p style={{ fontWeight: 800, fontSize: 20, color: TEXT }}>{Number(selected.total).toLocaleString('ru-RU')} ₽</p>
              </div>
            </div>
            {(selected.status === 'pending' || selected.status === 'confirmed') && (
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                {selected.status === 'pending' && (
                  <button onClick={() => { updateStatus(selected.id, 'confirmed'); setSelected(b => b ? { ...b, status: 'confirmed' } : null) }}
                    style={{ flex: 1, padding: 12, borderRadius: 14, fontSize: 14, fontWeight: 700, background: ACCENT, color: '#FFFFFF', border: 'none', cursor: 'pointer' }}>Принять</button>
                )}
                <button onClick={() => { updateStatus(selected.id, 'cancelled'); setSelected(b => b ? { ...b, status: 'cancelled' } : null) }}
                  style={{ flex: 1, padding: 12, borderRadius: 14, fontSize: 14, fontWeight: 600, background: 'transparent', border: `1px solid ${BORDER}`, color: MUTED, cursor: 'pointer' }}>
                  {selected.status === 'pending' ? 'Отклонить' : 'Отменить'}
                </button>
              </div>
            )}
            {selected.status !== 'cancelled' && selected.status !== 'refunded' && (
              <Link href={`/messages?booking=${selected.id}`}
                style={{ display: 'block', width: '100%', marginTop: 12, padding: 12, borderRadius: 14, fontSize: 14, fontWeight: 700, background: ACCENT, color: '#FFFFFF', textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box' }}>
                💬 Написать заказчику
              </Link>
            )}
            {selected.eventId && (
              <Link href={`/events/${selected.eventId}`}
                style={{ display: 'block', width: '100%', marginTop: 10, padding: 11, borderRadius: 14, fontSize: 13, fontWeight: 600, background: 'transparent', border: `1px solid ${BORDER}`, color: MUTED, textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box' }}>
                🎪 Общий чат мероприятия
              </Link>
            )}
            {['cancelled', 'completed', 'refunded'].includes(selected.status) && (
              <button onClick={() => deleteBooking(selected.id)}
                style={{ width: '100%', marginTop: 10, padding: 11, borderRadius: 14, fontSize: 13, fontWeight: 600, background: 'transparent', border: '1px solid rgba(248,113,113,0.3)', color: '#F87171', cursor: 'pointer' }}>
                🗑 Удалить заявку
              </button>
            )}
          </div>
        </div>
      )}

      <main style={{ background: BG, minHeight: '100vh' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(16px,4vw,32px) clamp(16px,4vw,40px)' }}>
          <h1 style={{ fontSize: 'clamp(22px,3vw,30px)', fontWeight: 800, color: TEXT, letterSpacing: '-0.02em', marginBottom: 24 }}>Мои мероприятия</h1>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1, 2, 3].map(i => <div key={i} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, height: 80 }} />)}
            </div>
          ) : bookings.length === 0 ? (
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, textAlign: 'center', padding: '48px 20px' }}>
              <p style={{ fontSize: 40, marginBottom: 12 }}>📋</p>
              <p style={{ fontWeight: 700, fontSize: 17, color: TEXT, marginBottom: 6 }}>Заявок пока нет</p>
              <p style={{ color: MUTED, fontSize: 14 }}>Когда клиенты начнут бронировать — заявки появятся здесь</p>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ width: 280, flexShrink: 0 }} className="vb-calendar-col">
                <BookingsCalendar bookings={bookings} unavailableDates={unavailableDates} onSelect={setSelected} />
              </div>
              <div style={{ flex: 1, minWidth: 280, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {bookings.map(booking => {
                  const s = STATUS[booking.status] || STATUS.pending
                  const date = new Date(booking.eventDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
                  return (
                    <div key={booking.id} className="vb-card" onClick={() => setSelected(booking)}
                      style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 'clamp(14px,3vw,20px)', cursor: 'pointer', transition: 'border-color .2s, box-shadow .2s', boxShadow: '0 2px 12px rgba(21,15,46,0.05)' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1, minWidth: 0 }}>
                          <span style={{ width: 36, height: 36, borderRadius: '50%', background: AVATAR_BG, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#FFFFFF', flexShrink: 0 }}>
                            {initialOf(clientName(booking))}
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 50, background: s.bg, color: s.color }}>{s.label}</span>
                              <span style={{ color: MUTED, fontSize: 13 }}>📅 {date}</span>
                              {booking.eventId && (
                                <Link href={`/events/${booking.eventId}`} onClick={e => e.stopPropagation()}
                                  style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 50, background: 'rgba(124,58,237,0.1)', color: ACCENT, textDecoration: 'none' }}>
                                  🎪 Мероприятие
                                </Link>
                              )}
                            </div>
                            <p style={{ fontWeight: 700, fontSize: 15, color: TEXT }}>{clientName(booking)}</p>
                            {booking.eventType && <p style={{ color: MUTED, fontSize: 13, marginTop: 2 }}>🎉 {booking.eventType}</p>}
                            {(booking.eventTimeFrom || booking.eventTimeTo) && (
                              <p style={{ color: MUTED, fontSize: 13, marginTop: 2 }}>🕐 {booking.eventTimeFrom && booking.eventTimeTo ? `${booking.eventTimeFrom}–${booking.eventTimeTo}` : (booking.eventTimeFrom || booking.eventTimeTo)}</p>
                            )}
                            <p style={{ color: ACCENT, fontSize: 12, marginTop: 6, fontWeight: 500 }}>Нажмите для деталей →</p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                          <p style={{ fontWeight: 800, fontSize: 16, color: TEXT }}>{Number(booking.total).toLocaleString('ru-RU')} ₽</p>
                          {['cancelled', 'completed', 'refunded'].includes(booking.status) && (
                            <button onClick={e => { e.stopPropagation(); deleteBooking(booking.id) }} title="Удалить заявку"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: MUTED, fontSize: 15, padding: 2 }}>🗑</button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />

      <style>{`
        .vb-card:hover { border-color: ${ACCENT}44 !important; box-shadow: 0 6px 20px rgba(21,15,46,0.1) !important; }
        @media (max-width: 640px) { .vb-calendar-col { width: 100% !important; } }
      `}</style>
    </>
  )
}
