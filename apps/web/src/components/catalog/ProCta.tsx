import Link from 'next/link'

const ACCENT = '#7C3AED'

export function ProCta() {
  return (
    <section id="pro" style={{ maxWidth: 1280, margin: '0 auto', padding: '0 clamp(16px,4vw,40px) clamp(20px,4vw,36px)' }}>
      <div style={{ borderRadius: 28, padding: 'clamp(26px,3.5vw,44px) clamp(20px,4vw,48px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap', position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, #8B3DFF, #E93D8A)', border: 'none' }}>
        <div style={{ position: 'absolute', right: -60, top: -60, width: 260, height: 260, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2 style={{ fontFamily: 'var(--font-bricolage),"Bricolage Grotesque",system-ui', fontSize: 'clamp(22px,2.8vw,34px)', fontWeight: 900, letterSpacing: '-0.025em', lineHeight: 1.1, color: 'white', maxWidth: '16ch', marginBottom: 10 }}>
            Вы — исполнитель? Получайте заказы на гуляй
          </h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.82)', maxWidth: '42ch', lineHeight: 1.6 }}>
            Создайте профиль за 10 минут, покажите портфолио и начните принимать брони.
          </p>
        </div>
        <Link href="/auth/register" className="pro-cta-btn" style={{ position: 'relative', zIndex: 1, background: '#FFFFFF', color: ACCENT, padding: '14px 28px', borderRadius: 50, fontSize: 15, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0, transition: 'transform .2s, box-shadow .2s' }}>
          Разместить профиль бесплатно
        </Link>
      </div>
      <style>{`
        .pro-cta-btn:hover { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(0,0,0,0.18); }
      `}</style>
    </section>
  )
}
