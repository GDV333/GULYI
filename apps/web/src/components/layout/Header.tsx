'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const AVATAR_BG = 'linear-gradient(135deg, #8B3DFF 0%, #E93D8A 100%)'

export function Header() {
  const router = useRouter()
  const [user, setUser] = useState<{ name: string; role: string; avatar?: string | null } | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const loadUser = () => {
      const u = localStorage.getItem('user')
      setUser(u ? JSON.parse(u) : null)
    }
    loadUser()
    // Обновляем состояние при логине/логауте из любого места на странице
    // (без этого шапка не узнает об изменении, пока не будет полной перезагрузки)
    window.addEventListener('auth-changed', loadUser)
    window.addEventListener('storage', loadUser)
    return () => {
      window.removeEventListener('auth-changed', loadUser)
      window.removeEventListener('storage', loadUser)
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('user')
    window.dispatchEvent(new Event('auth-changed'))
    setUser(null)
    router.push('/')
  }

  return (
    <>
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(21,15,46,0.08)',
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 clamp(16px,4vw,40px)', display: 'flex', alignItems: 'center', height: 60, gap: 24 }}>

          <Link href="/" style={{ fontWeight: 900, fontSize: 20, color: '#150F2E', textDecoration: 'none', letterSpacing: '-0.03em', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            гуляй
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#7C3AED', display: 'inline-block', boxShadow: '0 0 10px rgba(124,58,237,0.5)' }} />
          </Link>

          {/* Desktop nav */}
          <nav className="desktop-nav" style={{ display: 'flex', gap: 24 }}>
            {[['Каталог','/catalog'],['Как это работает','/#how'],['Исполнителям','/#pro']].map(([l,h]) => (
              <Link key={l} href={h} style={{ color: 'rgba(21,15,46,0.55)', fontSize: 14, textDecoration: 'none', fontWeight: 500 }}>{l}</Link>
            ))}
          </nav>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
            {user ? (
              <>
                <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#150F2E', fontSize: 14, textDecoration: 'none', fontWeight: 600 }}>
                  <span style={{
                    width: 26, height: 26, borderRadius: '50%', background: AVATAR_BG,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, color: '#FFFFFF', flexShrink: 0, overflow: 'hidden',
                  }}>
                    {user.avatar
                      ? <img src={user.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : (user.name?.[0]?.toUpperCase() || '?')}
                  </span>
                  {user.name.split(' ')[0]}
                </Link>
                <Link href="/events" className="desktop-nav" style={{ color: 'rgba(21,15,46,0.55)', fontSize: 14, textDecoration: 'none' }}>
                  Мероприятия
                </Link>
                {user.role === 'admin' && (
                  <Link href="/admin/stats" className="desktop-nav" style={{ color: '#7C3AED', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                    Админка
                  </Link>
                )}
                <button onClick={handleLogout} style={{ color: 'rgba(21,15,46,0.45)', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer' }}>
                  Выйти
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="desktop-nav" style={{ color: 'rgba(21,15,46,0.55)', fontSize: 14, textDecoration: 'none' }}>Войти</Link>
                <Link href="/auth/register" style={{ background: 'linear-gradient(90deg, #8B3DFF 0%, #E93D8A 100%)', color: '#FFFFFF', fontSize: 13, fontWeight: 700, padding: '8px 16px', borderRadius: 20, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                  Начать
                </Link>
              </>
            )}
            {/* Burger */}
            <button className="burger-btn" onClick={() => setMenuOpen(o => !o)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#150F2E', padding: 4, display: 'none' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                {menuOpen
                  ? <><path d="M18 6 6 18"/><path d="M6 6l12 12"/></>
                  : <><path d="M3 12h18"/><path d="M3 6h18"/><path d="M3 18h18"/></>
                }
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div style={{ background: '#FFFFFF', borderTop: '1px solid rgba(21,15,46,0.08)', padding: '12px clamp(16px,4vw,40px) 20px' }}>
            {[['Каталог','/catalog'],['Как это работает','/#how'],['Исполнителям','/#pro']].map(([l,h]) => (
              <Link key={l} href={h} onClick={() => setMenuOpen(false)}
                style={{ display: 'block', color: 'rgba(21,15,46,0.7)', fontSize: 16, textDecoration: 'none', padding: '12px 0', borderBottom: '1px solid rgba(21,15,46,0.06)' }}>
                {l}
              </Link>
            ))}
            {user ? (
              <>
                <Link href="/events" onClick={() => setMenuOpen(false)}
                  style={{ display: 'block', color: 'rgba(21,15,46,0.7)', fontSize: 16, textDecoration: 'none', padding: '12px 0' }}>
                  Мероприятия
                </Link>
                {user.role === 'admin' && (
                  <Link href="/admin/stats" onClick={() => setMenuOpen(false)}
                    style={{ display: 'block', color: '#7C3AED', fontSize: 16, fontWeight: 600, textDecoration: 'none', padding: '12px 0' }}>
                    Админка
                  </Link>
                )}
              </>
            ) : (
              <Link href="/auth/login" onClick={() => setMenuOpen(false)}
                style={{ display: 'block', color: 'rgba(21,15,46,0.7)', fontSize: 16, textDecoration: 'none', padding: '12px 0' }}>
                Войти
              </Link>
            )}
          </div>
        )}
      </header>

      <style>{`
        @media (max-width: 640px) {
          .desktop-nav { display: none !important; }
          .burger-btn { display: block !important; }
        }
      `}</style>
    </>
  )
}
