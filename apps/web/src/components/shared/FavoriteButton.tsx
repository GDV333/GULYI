'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/apiFetch'

interface Props {
  profileId: string
  active: boolean
  onToggle: (next: boolean) => void
  size?: number
}

// Кнопка-сердечко «в избранное». Используется поверх карточек каталога и в профиле —
// сама делает POST/DELETE на /api/favorites и оптимистично обновляет состояние.
export function FavoriteButton({ profileId, active, onToggle, size = 34 }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (busy) return

    const token = localStorage.getItem('accessToken')
    if (!token) { router.push('/auth/login'); return }

    const next = !active
    onToggle(next) // оптимистичное обновление UI
    setBusy(true)
    try {
      await apiFetch(`/api/favorites/${profileId}`, {
        method: next ? 'POST' : 'DELETE',
      })
    } catch {
      onToggle(!next) // откатываем, если запрос не прошёл
    } finally {
      setBusy(false)
    }
  }

  return (
    <button onClick={handleClick} aria-label={active ? 'Убрать из избранного' : 'Добавить в избранное'}
      style={{
        width: size, height: size, borderRadius: '50%', border: 'none', cursor: 'pointer',
        background: 'rgba(255,255,255,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(21,15,46,0.18)', flexShrink: 0, backdropFilter: 'blur(4px)',
      }}>
      <span style={{ fontSize: size * 0.5, color: active ? '#E93D8A' : 'rgba(21,15,46,0.35)', lineHeight: 1 }}>
        {active ? '♥' : '♡'}
      </span>
    </button>
  )
}
