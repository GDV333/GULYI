'use client'
import { useEffect, useMemo, useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { apiFetch } from '@/lib/apiFetch'
import { AdminTabs } from './AdminTabs'

interface AdminUser {
  id: string
  email: string
  role: 'client' | 'vendor' | 'admin'
  isVerified: boolean
  createdAt: string
  name: string | null
  city: string | null
  avatarUrl: string | null
  hasProfile: boolean
  profileActive: boolean | null
  priceFrom: string | null
  priceUnit: string | null
  reviewsCount: number
  avgRating: string | null
  bookingsAsClient: number
  eventsCreated: number
  bookingsAsVendor: number
}

interface Stats { total: number; client: number; vendor: number; admin: number }

const BG = 'linear-gradient(135deg, #F3E9FC 0%, #FCEAF1 45%, #FFF4EA 100%)'
const TEXT = '#150F2E'
const MUTED = 'rgba(21,15,46,0.55)'
const BORDER = 'rgba(21,15,46,0.08)'

const ROLE_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  client: { label: 'Заказчик',      color: '#2563EB', bg: 'rgba(37,99,235,0.1)' },
  vendor: { label: 'Исполнитель',   color: '#7C3AED', bg: 'rgba(124,58,237,0.1)' },
  admin:  { label: 'Администратор', color: '#DC2626', bg: 'rgba(220,38,38,0.1)' },
}

const th: React.CSSProperties = { textAlign: 'left', padding: '10px 12px', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: MUTED, whiteSpace: 'nowrap', borderBottom: `1px solid ${BORDER}` }
const td: React.CSSProperties = { padding: '10px 12px', fontSize: 13, color: TEXT, borderBottom: `1px solid ${BORDER}`, whiteSpace: 'nowrap' }

export function AdminUsersPage() {
  const [checked, setChecked] = useState(false)
  const [allowed, setAllowed] = useState(false)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'client' | 'vendor' | 'admin'>('all')

  useEffect(() => {
    const raw = localStorage.getItem('user')
    const u = raw ? JSON.parse(raw) : null
    setAllowed(u?.role === 'admin')
    setChecked(true)
    if (u?.role !== 'admin') return

    Promise.all([
      apiFetch('/api/admin/users').then(r => r.json()),
      apiFetch('/api/admin/stats').then(r => r.json()),
    ])
      .then(([list, s]) => {
        setUsers(Array.isArray(list) ? list : [])
        if (s && typeof s.total === 'number') setStats(s)
      })
      .catch(() => setError('Не удалось загрузить список пользователей'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return users.filter(u => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false
      if (!needle) return true
      return u.email.toLowerCase().includes(needle) || (u.name || '').toLowerCase().includes(needle) || (u.city || '').toLowerCase().includes(needle)
    })
  }, [users, q, roleFilter])

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
          <h1 style={{ fontWeight: 800, fontSize: 26, marginBottom: 4, color: TEXT, letterSpacing: '-0.02em' }}>Пользователи</h1>
          <p style={{ color: MUTED, fontSize: 14, marginBottom: 20 }}>Все зарегистрированные аккаунты в системе</p>

          <AdminTabs />

          {stats && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
              {[
                ['Всего', stats.total],
                ['Заказчиков', stats.client],
                ['Исполнителей', stats.vendor],
                ['Админов', stats.admin],
              ].map(([label, value]) => (
                <div key={label as string} style={{ background: '#FFFFFF', border: `1px solid ${BORDER}`, borderRadius: 14, padding: '10px 18px', minWidth: 110 }}>
                  <p style={{ fontSize: 22, fontWeight: 800, color: TEXT }}>{value as number}</p>
                  <p style={{ fontSize: 12, color: MUTED }}>{label as string}</p>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Поиск по email, имени, городу"
              style={{ flex: '1 1 260px', background: '#FFFFFF', border: `1px solid ${BORDER}`, borderRadius: 12, padding: '10px 14px', fontSize: 14, color: TEXT, outline: 'none' }}
            />
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value as typeof roleFilter)}
              style={{ background: '#FFFFFF', border: `1px solid ${BORDER}`, borderRadius: 12, padding: '10px 14px', fontSize: 14, color: TEXT, outline: 'none' }}
            >
              <option value="all">Все роли</option>
              <option value="client">Заказчики</option>
              <option value="vendor">Исполнители</option>
              <option value="admin">Администраторы</option>
            </select>
          </div>

          {error && <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#B91C1C', borderRadius: 12, padding: '12px 16px', fontSize: 14, marginBottom: 16 }}>{error}</div>}

          {loading ? (
            <p style={{ color: MUTED, fontSize: 14 }}>Загрузка...</p>
          ) : (
            <>
              <p style={{ color: MUTED, fontSize: 13, marginBottom: 8 }}>Показано: {filtered.length} из {users.length}</p>
              <div style={{ overflowX: 'auto', background: '#FFFFFF', border: `1px solid ${BORDER}`, borderRadius: 16 }}>
                <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 900 }}>
                  <thead>
                    <tr>
                      <th style={th}>Пользователь</th>
                      <th style={th}>Роль</th>
                      <th style={th}>Город</th>
                      <th style={th}>Регистрация</th>
                      <th style={th}>Подтв.</th>
                      <th style={th}>Профиль</th>
                      <th style={th}>Цена от</th>
                      <th style={th}>Отзывы</th>
                      <th style={th}>Брони (заказ)</th>
                      <th style={th}>Мероприятия</th>
                      <th style={th}>Брони (испол.)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(u => {
                      const badge = ROLE_BADGE[u.role]
                      return (
                        <tr key={u.id}>
                          <td style={td}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#8B3DFF,#E93D8A)', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0, overflow: 'hidden' }}>
                                {u.avatarUrl ? <img src={u.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (u.name?.[0]?.toUpperCase() || u.email[0].toUpperCase())}
                              </span>
                              <div>
                                <p style={{ fontWeight: 600 }}>{u.name || '— без имени —'}</p>
                                <p style={{ fontSize: 12, color: MUTED }}>{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td style={td}><span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 50, background: badge.bg, color: badge.color }}>{badge.label}</span></td>
                          <td style={td}>{u.city || '—'}</td>
                          <td style={td}>{new Date(u.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                          <td style={td}>{u.isVerified ? '✅' : '—'}</td>
                          <td style={td}>{u.role === 'vendor' ? (u.hasProfile ? (u.profileActive ? 'активен' : 'скрыт') : 'нет') : (u.hasProfile ? 'да' : '—')}</td>
                          <td style={td}>{u.priceFrom ? `${Math.round(Number(u.priceFrom)).toLocaleString('ru-RU')} ₽${u.priceUnit ? ` / ${u.priceUnit}` : ''}` : '—'}</td>
                          <td style={td}>{u.role === 'vendor' ? `${u.reviewsCount}${u.avgRating && Number(u.avgRating) > 0 ? ` (${Number(u.avgRating).toFixed(1)}★)` : ''}` : '—'}</td>
                          <td style={td}>{u.bookingsAsClient || '—'}</td>
                          <td style={td}>{u.eventsCreated || '—'}</td>
                          <td style={td}>{u.role === 'vendor' ? (u.bookingsAsVendor || '—') : '—'}</td>
                        </tr>
                      )
                    })}
                    {filtered.length === 0 && (
                      <tr><td style={{ ...td, textAlign: 'center', color: MUTED }} colSpan={11}>Ничего не найдено</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
