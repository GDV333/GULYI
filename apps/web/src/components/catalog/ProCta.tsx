import Link from 'next/link'

const ACCENT = '#7C3AED'

export function ProCta() {
  return (
    <section id="pro" style={{ maxWidth: 1280, margin: '0 auto', padding: 'clamp(8px,2vw,16px) clamp(16px,4vw,40px) clamp(24px,4vw,40px)' }}>
      <div style={{ borderRadius: 32, padding: 'clamp(32px,5vw,60px) clamp(20px,4vw,56px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 28, flexWrap: 'wrap', position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, #8B3DFF, #E93D8A)', border: 'none' }}>
        <div style={{ position: 'absolute', right: -60, top: -60, width: 280, height: 280, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2 style={{ fontFamily: 'var(--font-bricolage),"Bricolage Grotesque",system-ui', fontSize: 'clamp(24px,3vw,38px)', fontWeight: 900, letterSpacing: '-0.025em', lineHeight: 1.1, color: 'white', maxWidth: '16ch', marginBottom: 14 }}>
            Вы — исполнитель? Получайте заказы на гуляй
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)', maxWidth: '42ch', lineHeight: 1.65 }}>
            Создайте профиль за 10 минут, покажите портфолио и начните принимать брони.
          </p>
        </div>
        <Link href="/auth/register" style={{ position: 'relative', zIndex: 1, background: '#FFFFFF', color: ACCENT, padding: '14px 28px', borderRadius: 50, fontSize: 15, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
          Разместить профиль бесплатно
        </Link>
      </div>
    </section>
  )
}