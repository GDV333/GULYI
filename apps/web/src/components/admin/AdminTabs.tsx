'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/admin/users',   label: 'Пользователи' },
  { href: '/admin/reviews', label: 'Модерация отзывов' },
]

export function AdminTabs() {
  const pathname = usePathname()
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
      {TABS.map(t => {
        const active = pathname === t.href
        return (
          <Link key={t.href} href={t.href} style={{
            padding: '8px 16px', borderRadius: 50, fontSize: 14, fontWeight: 600, textDecoration: 'none',
            background: active ? '#7C3AED' : '#FFFFFF',
            color: active ? '#FFFFFF' : 'rgba(21,15,46,0.6)',
            border: '1px solid rgba(21,15,46,0.08)',
          }}>{t.label}</Link>
        )
      })}
    </div>
  )
}
