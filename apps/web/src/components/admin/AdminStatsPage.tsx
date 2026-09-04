'use client'
import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { apiFetch } from '@/lib/apiFetch'
import { AdminTabs } from './AdminTabs'

const BG = 'linear-gradient(135deg, #F3E9FC 0%, #FCEAF1 45%, #FFF4EA 100%)'
const TEXT = '#150F2E'
const MUTED = 'rgba(21,15,46,0.55)'
const BORDER = 'rgba(21,15,46,0.08)'
const ACCENT = '#7C3AED'
const ROSE = '#E93D8A'

interface DayPoint { date: string; count: number; unique?: number }
interface Overview {
  generatedAt: string
  users: { total: number; client: number; vendor: number; admin: number; newToday: number; new7d: number; new30d: number; series: DayPoint[] }
  visits: { total: number; today: number; week: number; uniqueWeek: number; series: DayPoint[]; topReferrers: { name: string; count: number }[]; topPaths: { name: string; count: number }[] }
  events: { total: number; active: number; paid: number; completed: number; cancelled: number; passed: number; upcoming: number; new30d: number; topCities: { name: string; count: number }[] }
  bookings: { total: number; pending: number; confirmed: number; paid: number; completed: number; cancelled: number; acceptRate: number; revenue: number; avgCheck: number }
  reviews: { total: number; pending: number; published: number; avgRating: number }
}

const money = (n: number) => `${n.toLocaleString('ru-RU')} ₽`
const nf = (n: number) => n.toLocaleString('ru-RU')

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: '#FFFFFF', border: `1px solid ${BORDER}`, borderRadius: 18, padding: 20, boxShadow: '0 3px 16px rgba(21,15,46,0.05)', ...style }}>{children}</div>
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card style={{ padding: '16px 18px' }}>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTED }}>{label}</p>
      <p style={{ fontSize: 26, fontWeight: 800, color: TEXT, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{value}</p>
      {sub && <p style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{sub}</p>}
    </Card>
  )
}

/** Плавная area-линия по дням */
function AreaChart({ data, height = 96 }: { data: DayPoint[]; height?: number }) {
  const w = 640
  const max = Math.max(1, ...data.map(d => d.count))
  const step = w / Math.max(1, data.length - 1)
  const pt = (d: DayPoint, i: number) => [i * step, height - (d.count / max) * (height - 8) - 4] as const
  const line = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${pt(d, i)[0].toFixed(1)} ${pt(d, i)[1].toFixed(1)}`).join(' ')
  const area = `${line} L ${w} ${height} L 0 ${height} Z`
  const last = data[data.length - 1]
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" style={{ width: '100%', height, display: 'block' }}>
      <defs>
        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={ACCENT} stopOpacity="0.22" />
          <stop offset="1" stopColor={ACCENT} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#areaFill)" />
      <path d={line} fill="none" stroke={ACCENT} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      {last && <circle cx={(data.length - 1) * step} cy={pt(last, data.length - 1)[1]} r="3.5" fill={ACCENT} />}
    </svg>
  )
}

/** Столбики по дням: всего + уникальные */
function BarChart({ data, height = 110 }: { data: DayPoint[]; height?: number }) {
  const max = Math.max(1, ...data.map(d => d.count))
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height }}>
      {data.map((d, i) => {
        const h = (d.count / max) * (height - 4)
        const u = d.unique != null ? (d.unique / max) * (height - 4) : 0
        return (
          <div key={i} title={`${d.date}: ${d.count}${d.unique != null ? ` · ${d.unique} уник.` : ''}`}
            style={{ flex: 1, position: 'relative', height: '100%', display: 'flex', alignItems: 'flex-end' }}>
            <div style={{ width: '100%', height: Math.max(2, h), background: 'rgba(124,58,237,0.18)', borderRadius: 4 }} />
            {d.unique != null && <div style={{ position: 'absolute', bottom: 0, width: '100%', height: Math.max(2, u), background: ACCENT, borderRadius: 4 }} />}
          </div>
        )
      })}
    </div>
  )
}

/** Горизонтальная разбивка по статусам */
function StatusBars({ items }: { items: { label: string; value: number; color: string }[] }) {
  const total = Math.max(1, items.reduce((a, b) => a + b.value, 0))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map(it => (
        <div key={it.label}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
            <span style={{ color: TEXT }}>{it.label}</span>
            <span style={{ color: MUTED, fontVariantNumeric: 'tabular-nums' }}>{it.value}</span>
          </div>
          <div style={{ height: 7, borderRadius: 4, background: 'rgba(21,15,46,0.05)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(it.value / total) * 100}%`, background: it.color, borderRadius: 4 }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function TopList({ rows }: { rows: { name: string; count: number }[] }) {
  const max = Math.max(1, ...rows.map(r => r.count))
  if (rows.length === 0) return <p style={{ fontSize: 13, color: MUTED }}>Пока нет данных</p>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {rows.map(r => (
        <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, color: TEXT, flex: '0 0 42%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name || '—'}</span>
          <span style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(21,15,46,0.05)', overflow: 'hidden' }}>
            <span style={{ display: 'block', height: '100%', width: `${(r.count / max) * 100}%`, background: `linear-gradient(90deg, ${ACCENT}, ${ROSE})`, borderRadius: 3 }} />
          </span>
          <span style={{ fontSize: 12.5, color: MUTED, flex: '0 0 34px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{r.count}</span>
        </div>
      ))}
    </div>
  )
}

const H3: React.CSSProperties = { fontWeight: 700, fontSize: 14, color: TEXT, marginBottom: 14 }

export function AdminStatsPage() {
  const [checked, setChecked] = useState(false)
  const [allowed, setAllowed] = useState(false)
  const [data, setData] = useState<Overview | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const raw = localStorage.getItem('user')
    const u = raw ? JSON.parse(raw) : null
    setAllowed(u?.role === 'admin')
    setChecked(true)
    if (u?.role !== 'admin') return
    apiFetch('/api/admin/overview')
      .then(r => r.json())
      .then(d => { if (d && d.users) setData(d); else setError('Не удалось загрузить статистику') })
      .catch(() => setError('Не удалось загрузить статистику'))
  }, [])

  if (!checked) return null
  if (!allowed) {
    return (
      <>
        <Header />
        <main style={{ background: BG, minHeight: '100vh' }}>
          <div style={{ maxWidth: 600, margin: '0 auto', padding: '96px 24px', textAlign: 'center' }}>
            <p style={{ fontSize: 40, marginBottom: 16 }}>🔒</p>
            <h1 style={{ fontWeight: 800, fontSize: 20, marginBottom: 8, color: TEXT }}>Доступ запрещён</h1>
            <p style={{ color: MUTED, fontSize: 14 }}>Эта страница доступна только администраторам.</p>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Header />
      <main style={{ background: BG, minHeight: '100vh' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(16px,4vw,40px) clamp(16px,4vw,32px)' }}>
          <h1 style={{ fontWeight: 800, fontSize: 26, marginBottom: 4, color: TEXT, letterSpacing: '-0.02em' }}>Статистика</h1>
          <p style={{ color: MUTED, fontSize: 14, marginBottom: 20 }}>Что происходит на площадке</p>

          <AdminTabs />

          {error && <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#B91C1C', borderRadius: 12, padding: '12px 16px', fontSize: 14, marginBottom: 16 }}>{error}</div>}

          {!data ? (
            <p style={{ color: MUTED, fontSize: 14 }}>Загрузка…</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Ключевые цифры */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                <Tile label="Пользователей" value={nf(data.users.total)} sub={`+${data.users.new7d} за 7 дней`} />
                <Tile label="Посещений · 7 дней" value={nf(data.visits.week)} sub={`${nf(data.visits.uniqueWeek)} уникальных`} />
                <Tile label="Мероприятий" value={nf(data.events.total)} sub={`${data.events.passed} прошло · ${data.events.upcoming} впереди`} />
                <Tile label="Выручка" value={money(data.bookings.revenue)} sub={`средний чек ${money(data.bookings.avgCheck)}`} />
              </div>

              {/* Регистрации */}
              <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                  <h3 style={{ ...H3, marginBottom: 0 }}>Регистрации · 30 дней</h3>
                  <span style={{ fontSize: 12.5, color: MUTED }}>сегодня +{data.users.newToday} · за месяц +{data.users.new30d}</span>
                </div>
                <AreaChart data={data.users.series} />
              </Card>

              {/* Посещения */}
              <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                  <h3 style={{ ...H3, marginBottom: 0 }}>Посещения · 14 дней</h3>
                  <span style={{ fontSize: 12.5, color: MUTED }}>
                    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: ACCENT, marginRight: 4 }} />уникальные
                    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: 'rgba(124,58,237,0.18)', margin: '0 4px 0 12px' }} />всего
                  </span>
                </div>
                <BarChart data={data.visits.series} />
                {data.visits.total === 0 && <p style={{ fontSize: 12.5, color: MUTED, marginTop: 10 }}>Счётчик только запущен — данные появятся по мере посещений.</p>}
              </Card>

              {/* Разбивки */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
                <Card>
                  <h3 style={H3}>Пользователи по ролям</h3>
                  <StatusBars items={[
                    { label: 'Заказчики', value: data.users.client, color: '#2563EB' },
                    { label: 'Исполнители', value: data.users.vendor, color: ACCENT },
                    { label: 'Администраторы', value: data.users.admin, color: '#DC2626' },
                  ]} />
                </Card>
                <Card>
                  <h3 style={H3}>Мероприятия</h3>
                  <StatusBars items={[
                    { label: 'Собирают команду', value: data.events.active, color: ACCENT },
                    { label: 'Оплачены', value: data.events.paid, color: '#34D399' },
                    { label: 'Завершены', value: data.events.completed, color: '#94A3B8' },
                    { label: 'Отменены', value: data.events.cancelled, color: '#F87171' },
                  ]} />
                </Card>
                <Card>
                  <h3 style={H3}>Заявки · принято {data.bookings.acceptRate}%</h3>
                  <StatusBars items={[
                    { label: 'Ожидают', value: data.bookings.pending, color: '#FBBF24' },
                    { label: 'Подтверждены', value: data.bookings.confirmed, color: '#34D399' },
                    { label: 'Оплачены', value: data.bookings.paid, color: '#60A5FA' },
                    { label: 'Завершены', value: data.bookings.completed, color: '#94A3B8' },
                    { label: 'Отменены', value: data.bookings.cancelled, color: '#F87171' },
                  ]} />
                </Card>
                <Card>
                  <h3 style={H3}>Отзывы</h3>
                  <div style={{ display: 'flex', gap: 20, alignItems: 'baseline', marginBottom: 12 }}>
                    <div><p style={{ fontSize: 24, fontWeight: 800, color: TEXT }}>{data.reviews.avgRating || '—'}</p><p style={{ fontSize: 11, color: MUTED }}>средняя оценка</p></div>
                    <div><p style={{ fontSize: 24, fontWeight: 800, color: TEXT }}>{data.reviews.published}</p><p style={{ fontSize: 11, color: MUTED }}>опубликовано</p></div>
                  </div>
                  {data.reviews.pending > 0
                    ? <p style={{ fontSize: 13, color: '#B45309', background: 'rgba(251,191,36,0.14)', borderRadius: 8, padding: '6px 10px' }}>На модерации: {data.reviews.pending}</p>
                    : <p style={{ fontSize: 13, color: MUTED }}>Очередь модерации пуста</p>}
                </Card>
              </div>

              {/* Топы */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
                <Card>
                  <h3 style={H3}>Откуда приходят</h3>
                  <TopList rows={data.visits.topReferrers} />
                </Card>
                <Card>
                  <h3 style={H3}>Популярные страницы</h3>
                  <TopList rows={data.visits.topPaths} />
                </Card>
                <Card>
                  <h3 style={H3}>Города мероприятий</h3>
                  <TopList rows={data.events.topCities} />
                </Card>
              </div>

              <p style={{ fontSize: 11, color: MUTED, textAlign: 'right' }}>
                обновлено {new Date(data.generatedAt).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
