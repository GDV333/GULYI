'use client'
import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { apiFetch } from '@/lib/apiFetch'
import { AdminTabs } from './AdminTabs'

interface PendingReview {
  id: string
  rating: number
  comment: string | null
  createdAt: string
  author: { id: string; email: string }
  profile: { id: string; displayName: string }
}

const BG = 'linear-gradient(135deg, #F3E9FC 0%, #FCEAF1 45%, #FFF4EA 100%)'

export function AdminReviewsPage() {
  const [checked, setChecked] = useState(false)
  const [allowed, setAllowed] = useState(false)
  const [reviews, setReviews] = useState<PendingReview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    apiFetch('/api/reviews/pending')
      .then(r => r.json())
      .then(data => setReviews(Array.isArray(data) ? data : []))
      .catch(() => setError('Не удалось загрузить отзывы'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    const raw = localStorage.getItem('user')
    const user = raw ? JSON.parse(raw) : null
    setAllowed(user?.role === 'admin')
    setChecked(true)
    if (user?.role === 'admin') load()
  }, [])

  const moderate = async (id: string, action: 'approve' | 'reject') => {
    setBusyId(id)
    try {
      const res = await apiFetch(`/api/reviews/${id}/${action}`, {
        method: 'PATCH',
      })
      if (res.ok) setReviews(prev => prev.filter(r => r.id !== id))
    } catch {}
    finally { setBusyId(null) }
  }

  if (!checked) return null

  if (!allowed) {
    return (
      <>
        <Header />
        <main style={{ background: BG, minHeight: '100vh' }}>
          <div className="max-w-[600px] mx-auto px-6 py-24 text-center">
            <p className="text-4xl mb-4">🔒</p>
            <h1 className="font-bold text-xl mb-2">Доступ запрещён</h1>
            <p className="text-[#6B6558] text-sm">Эта страница доступна только администраторам.</p>
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
        <div className="max-w-[860px] mx-auto px-6 py-10">
          <h1 className="font-extrabold text-[26px] mb-1" style={{ color: '#150F2E' }}>Модерация отзывов</h1>
          <p className="text-[#6B6558] text-sm mb-6">Отзывы публикуются в каталоге только после одобрения</p>

          <AdminTabs />

          {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-4">{error}</div>}

          {loading ? (
            <p className="text-[#6B6558] text-sm">Загрузка...</p>
          ) : reviews.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#E8E2D8] p-8 text-center text-[#6B6558]">
              <p className="text-3xl mb-2">✅</p>
              <p className="font-medium">Очередь модерации пуста</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {reviews.map(r => (
                <div key={r.id} className="bg-white rounded-2xl border border-[#E8E2D8] p-5">
                  <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                    <div>
                      <p className="font-semibold text-[15px]">{r.profile.displayName}</p>
                      <p className="text-[#6B6558] text-xs">Автор: {r.author.email} · {new Date(r.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                    <div className="text-yellow-500 font-semibold text-sm">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
                  </div>
                  {r.comment && <p className="text-[#4A4540] text-[14px] leading-relaxed mb-4">{r.comment}</p>}
                  <div className="flex gap-2">
                    <button onClick={() => moderate(r.id, 'approve')} disabled={busyId === r.id}
                      className="text-white font-semibold py-2 px-4 rounded-xl text-[13px] disabled:opacity-60"
                      style={{ background: '#16A34A' }}>
                      Опубликовать
                    </button>
                    <button onClick={() => moderate(r.id, 'reject')} disabled={busyId === r.id}
                      className="font-semibold py-2 px-4 rounded-xl text-[13px] disabled:opacity-60"
                      style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#DC2626' }}>
                      Отклонить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
