'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const ACCENT = '#7C3AED'
const cats = [
  { label: 'Все', icon: '✦', slug: null },
  { label: 'Площадки', icon: '🏛', slug: 'venue' },
  { label: 'Диджеи', icon: '🎧', slug: 'dj' },
  { label: 'Ведущие', icon: '🎤', slug: 'host' },
  { label: 'Фотографы', icon: '📸', slug: 'photo' },
  { label: 'Кейтеринг', icon: '🍽', slug: 'catering' },
  { label: 'Декор', icon: '🎈', slug: 'decor' },
  { label: 'Артисты', icon: '🎭', slug: null },
]

export function CategoryChips() {
  const router = useRouter()
  const [active, setActive] = useState('Все')

  const handleClick = (c: typeof cats[number]) => {
    setActive(c.label)
    // Роль выбрана — сразу к описанию мероприятия под неё; без роли ("Все"/"Артисты") — в общий каталог.
    if (c.slug) router.push(`/events/new?categorySlugs=${c.slug}`)
    else router.push('/catalog')
  }

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 clamp(16px,4vw,40px) 8px' }}>
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
        {cats.map(c => {
          const on = active === c.label
          return (
            <button key={c.label} onClick={() => handleClick(c)}
              onMouseEnter={e => { if (!on) { e.currentTarget.style.borderColor = 'rgba(124,58,237,0.4)'; e.currentTarget.style.color = ACCENT } }}
              onMouseLeave={e => { if (!on) { e.currentTarget.style.borderColor = 'rgba(21,15,46,0.1)'; e.currentTarget.style.color = 'rgba(21,15,46,0.6)' } }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', borderRadius: 50,
                border: `1px solid ${on ? ACCENT : 'rgba(21,15,46,0.1)'}`,
                background: on ? 'rgba(124,58,237,0.1)' : '#FFFFFF',
                color: on ? ACCENT : 'rgba(21,15,46,0.6)',
                fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                transition: 'border-color .18s, color .18s, background .18s',
              }}>
              <span style={{ fontSize: 16 }}>{c.icon}</span>
              {c.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}