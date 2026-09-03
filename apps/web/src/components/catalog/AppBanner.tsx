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
    <section style={{ maxWidth: 1280, margin: '0 auto', padding: '0 clamp(16px,4vw,40px) clamp(20px,4vw,36px)', position: 'relative' }}>
      <div style={{ borderRadius: 28, padding: 'clamp(24px,4vw,40px) clamp(20px,4vw,48px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24, flexWrap: 'wrap', background: '#FFFFFF', border: '1px solid rgba(21,15,46,0.07)', boxShadow: '0 10px 40px rgba(21,15,46,0.06)' }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-bricolage),"Bricolage Grotesque",system-ui', fontSize: 'clamp(20px,2.5vw,28px)', fontWeight: 800, letterSpacing: '-0.02em', color: '#150F2E', marginBottom: 8 }}>
            Всё то же — в мобильном приложении
          </h3>
          <p style={{ color: 'rgba(21,15,46,0.5)', fontSize: 15, maxWidth: '44ch' }}>
            Каталог специалистов, чат с исполнителями и брони всегда под рукой.
          </p>
        </div>
        <button onClick={() => setShowNotice(true)} style={{ background: 'linear-gradient(90deg, #8B3DFF 0%, #E93D8A 100%)', color: '#FFFFFF', padding: '13px 24px', borderRadius: 50, fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap', flexShrink: 0 }}>
          Открыть приложение
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6"/>
          </svg>
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