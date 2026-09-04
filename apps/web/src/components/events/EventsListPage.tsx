'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { apiFetch } from '@/lib/apiFetch'
import { VendorBookings } from './VendorBookings'

const BG     = 'linear-gradient(135deg, #F3E9FC 0%, #FCEAF1 45%, #FFF4EA 100%)'
const CARD   = '#FFFFFF'
const ACCENT = '#7C3AED'
const BORDER = 'rgba(21,15,46,0.08)'
const TEXT   = '#150F2E'
const MUTED  = 'rgba(21,15,46,0.5)'

const EVENT_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  active:    { label:'Собираем команду', color:'#7C3AED', bg:'rgba(124,58,237,0.1)' },
  paid:      { label:'Оплачено',         color:'#34D399', bg:'rgba(52,211,153,0.12)' },
  completed: { label:'Завершено',        color:MUTED,     bg:'rgba(21,15,46,0.06)' },
  cancelled: { label:'Отменено',         color:'#F87171', bg:'rgba(248,113,113,0.12)' },
}

interface EventListItem {
  id: string; eventType: string | null; eventDate: string; city: string | null
  status: 'active' | 'paid' | 'completed' | 'cancelled'
}

export function EventsListPage() {
  const [role, setRole] = useState<'client' | 'vendor' | 'admin' | null | undefined>(undefined)

  useEffect(() => {
    const raw = localStorage.getItem('user')
    setRole(raw ? (JSON.parse(raw).role ?? null) : null)
  }, [])

  if (role === undefined) return null
  // У исполнителя «Мероприятия» — это его заявки: календарь + список в одном месте
  if (role === 'vendor') return <VendorBookings />
  return <ClientEvents />
}

function ClientEvents() {
  const router = useRouter()
  const [events, setEvents] = useState<EventListItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const tok = localStorage.getItem('accessToken')
    if (!tok) { router.push('/auth/login?redirect=/events'); return }
    apiFetch('/api/events')
      .then(r => r.json()).then(d => setEvents(Array.isArray(d) ? d : []))
      .catch(console.error).finally(() => setLoading(false))
  }, [])

  return (
    <>
      <Header />
      <main style={{ background: BG, minHeight: '100vh' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: 'clamp(16px,4vw,32px) clamp(16px,4vw,40px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
            <h1 style={{ fontSize: 'clamp(22px,3vw,30px)', fontWeight: 800, color: TEXT, letterSpacing: '-0.02em' }}>Мои мероприятия</h1>
            <Link href="/events/new" style={{ background: ACCENT, color: '#FFFFFF', fontWeight: 700, padding: '10px 20px', borderRadius: 50, textDecoration: 'none', fontSize: 14 }}>+ Новое мероприятие</Link>
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1, 2].map(i => <div key={i} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, height: 80 }} />)}
            </div>
          ) : events.length === 0 ? (
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, textAlign: 'center', padding: '48px 20px' }}>
              <p style={{ fontSize: 40, marginBottom: 12 }}>🎪</p>
              <p style={{ fontWeight: 700, fontSize: 17, color: TEXT, marginBottom: 6 }}>Мероприятий пока нет</p>
              <p style={{ color: MUTED, fontSize: 14, marginBottom: 20 }}>Опишите событие один раз — соберём под него всю команду</p>
              <Link href="/events/new" style={{ display: 'inline-block', background: ACCENT, color: '#FFFFFF', fontWeight: 700, padding: '12px 28px', borderRadius: 50, textDecoration: 'none', fontSize: 14 }}>Создать мероприятие</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {events.map(ev => {
                const s = EVENT_STATUS[ev.status] || EVENT_STATUS.active
                return (
                  <Link key={ev.id} href={`/events/${ev.id}`}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '16px 20px', textDecoration: 'none', boxShadow: '0 2px 12px rgba(21,15,46,0.05)' }}>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: 15, color: TEXT, marginBottom: 4 }}>{ev.eventType || 'Мероприятие'}</p>
                      <p style={{ color: MUTED, fontSize: 13 }}>
                        📅 {new Date(ev.eventDate).toLocaleDateString('ru-RU', { day:'numeric', month:'long', year:'numeric' })}
                        {ev.city && ` · 📍 ${ev.city}`}
                      </p>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 50, background: s.bg, color: s.color }}>{s.label}</span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
