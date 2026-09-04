'use client'
import { useState, useEffect } from 'react'

const ACCENT = '#7C3AED'

export function AppBanner() {
  const [showNotice, setShowNotice] = useState(false)

  useEffect(() => {
    if (!showNotice) return
    const t = setTimeout(() => setShowNotice(false), 5000)
    return () => clearTimeout(t)
  }, [showNotice])

  return (
    <section style={{ maxWidth: 1280, margin: '0 auto', padding: '0 clamp(16px,4vw,40px) clamp(16px,3vw,28px)', position: 'relative' }}>
      <div style={{ borderRadius: 18, padding: '14px clamp(16px,3vw,24px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', background: '#FFFFFF', border: '1px solid rgba(21,15,46,0.07)', boxShadow: '0 4px 20px rgba(21,15,46,0.05)' }}>
        <p style={{ color: 'rgba(21,15,46,0.62)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>📱</span>
          <span><b style={{ color: '#150F2E', fontWeight: 700 }}>Скоро мобильное приложение</b> — каталог, чат и брони под рукой.</span>
        </p>
        <button onClick={() => setShowNotice(true)}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#7C3AED'; e.currentTarget.style.color = '#7C3AED' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(21,15,46,0.14)'; e.currentTarget.style.color = 'rgba(21,15,46,0.6)' }}
          style={{ background: 'none', color: 'rgba(21,15,46,0.6)', padding: '9px 18px', borderRadius: 50, fontSize: 13.5, fontWeight: 600, border: '1px solid rgba(21,15,46,0.14)', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, transition: 'border-color .18s, color .18s' }}>
          Уведомить о запуске
        </button>
      </div>

      {showNotice && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 100, background: '#150F2E', color: '#FFFFFF', padding: '14px 18px 14px 20px', borderRadius: 50, fontSize: 14, fontWeight: 600, boxShadow: '0 10px 30px rgba(21,15,46,0.35)', display: 'flex', alignItems: 'center', gap: 10, maxWidth: '90vw' }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>📱</span>
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Приложения для App Store и Google Play в разработке — скоро будут доступны</span>
          <button onClick={() => setShowNotice(false)} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: 13, width: 22, height: 22, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>
      )}
    </section>
  )
}