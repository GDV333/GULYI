'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { apiFetch } from '@/lib/apiFetch'

const BG = 'linear-gradient(135deg, #F3E9FC 0%, #FCEAF1 45%, #FFF4EA 100%)'
const CARD = '#FFFFFF'
const ACCENT = '#7C3AED'
const ACCENT_GRADIENT = 'linear-gradient(90deg, #8B3DFF 0%, #E93D8A 100%)'
const BORDER = 'rgba(21,15,46,0.1)'
const TEXT = '#150F2E'
const MUTED = 'rgba(21,15,46,0.5)'
const inp = { width: '100%', background: '#F8F6FC', border: `1px solid ${BORDER}`, borderRadius: 12, padding: '12px 16px', fontSize: 15, color: TEXT, outline: 'none', boxSizing: 'border-box' as const }

export function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/'
  const sessionExpired = searchParams.get('expired') === '1'
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const res = await apiFetch('/api/auth/login', { auth: false, method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Ошибка входа'); return }
      localStorage.setItem('accessToken', data.accessToken)
      localStorage.setItem('user', JSON.stringify(data.user))
      window.dispatchEvent(new Event('auth-changed'))
      router.push(redirectTo)
    } catch { setError('Не удалось подключиться к серверу') }
    finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 16px', background: BG }}>
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: 500, height: 500, borderRadius: '50%', background: `radial-gradient(circle, ${ACCENT}0A 0%, transparent 65%)` }} />
      </div>
      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <span style={{ fontWeight: 900, fontSize: 28, color: TEXT, letterSpacing: '-0.04em' }}>гуляй</span>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: ACCENT, display: 'inline-block', boxShadow: `0 0 14px ${ACCENT}` }} />
          </Link>
          <p style={{ color: MUTED, fontSize: 14, marginTop: 8 }}>Войдите в свой аккаунт</p>
        </div>

        <div style={{ background: CARD, borderRadius: 24, border: `1px solid ${BORDER}`, padding: 'clamp(24px,5vw,36px)', boxShadow: '0 10px 40px rgba(21,15,46,0.08)' }}>
          <h1 style={{ fontWeight: 800, fontSize: 24, color: TEXT, letterSpacing: '-0.02em', marginBottom: 24 }}>Вход</h1>

          {sessionExpired && !error && (
            <div style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.25)', color: '#6D28D9', borderRadius: 12, padding: '12px 16px', fontSize: 14, marginBottom: 20 }}>
              Сессия истекла. Пожалуйста, войдите снова.
            </div>
          )}

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#B91C1C', borderRadius: 12, padding: '12px 16px', fontSize: 14, marginBottom: 20 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { label: 'Email', type: 'email', key: 'email', ph: 'you@example.com' },
              { label: 'Пароль', type: 'password', key: 'password', ph: '••••••••' },
            ].map(f => (
              <div key={f.key}>
                <label style={{ display: 'block', color: MUTED, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>{f.label}</label>
                <input type={f.type} required placeholder={f.ph}
                  value={form[f.key as keyof typeof form]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  style={inp}
                  onFocus={e => e.target.style.borderColor = ACCENT}
                  onBlur={e => e.target.style.borderColor = BORDER} />
              </div>
            ))}

            <button type="submit" disabled={loading}
              style={{ width: '100%', background: ACCENT_GRADIENT, color: '#FFFFFF', fontWeight: 700, fontSize: 16, padding: '13px', borderRadius: 14, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', marginTop: 4, opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Входим...' : 'Войти'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 14, color: MUTED, marginTop: 20 }}>
            Нет аккаунта?{' '}
            <Link href="/auth/register" style={{ color: ACCENT, fontWeight: 600, textDecoration: 'none' }}>Зарегистрироваться</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
