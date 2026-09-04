'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { API_URL } from '@/lib/config'
import { apiFetch } from '@/lib/apiFetch'
import { FavoriteButton } from '@/components/shared/FavoriteButton'

const CAT_COLORS: Record<string, string> = {
  host: '#FFF0E6', dj: '#EEF0FF', organizer: '#E6F4FF',
  video: '#F0E6FF', photo: '#E6FFF0', reels: '#FFE6F0',
  coordinator: '#FFF9E6', light_sound: '#FFF0E6', outfit: '#FFE6F9',
  venue: '#E6F0FF', transfer: '#E6FFF9', photo_studio: '#F9E6FF',
  catering: '#FFF4E6', jewelry: '#FFFBE6', barbershop: '#E6F9FF',
  makeup: '#FFE6EE', bachelor: '#EEF0FF', bachelorette: '#FFE6F5',
  decor: '#E6FFE6', confectionery: '#FFF3E6',
}

const CAT_EMOJI: Record<string, string> = {
  host: '🎤', dj: '🎧', organizer: '📋', video: '🎬', photo: '📸',
  reels: '🎥', coordinator: '🗂', light_sound: '💡', outfit: '👗',
  venue: '🏛', transfer: '🚗', photo_studio: '🎞', catering: '🍽',
  jewelry: '💍', barbershop: '💈', makeup: '💄', bachelor: '🥃',
  bachelorette: '🌸', decor: '🎈', confectionery: '🎂',
}

export const EVENT_TYPES = ['Свадьба', 'День рождения', 'Корпоратив', 'Выпускной', 'Юбилей', 'Девичник', 'Мальчишник', 'Детский праздник', 'Другое']
const AGE_CATEGORIES = ['Для всех', 'Семейное (дети + взрослые)', 'Только взрослые (18+)', 'Детское (до 14 лет)']

interface BusySlot { date: string; timeFrom: string | null; timeTo: string | null }

function timeToMinutes(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + (m || 0)
}

// Пересекаются ли два интервала времени. Если хотя бы один из них не задан целиком
// (например, старая бронь без времени) — безопасно считаем, что занят весь день.
function timeRangesOverlap(aFrom: string, aTo: string, bFrom: string | null, bTo: string | null) {
  if (!aFrom || !aTo || !bFrom || !bTo) return true
  return timeToMinutes(aFrom) < timeToMinutes(bTo) && timeToMinutes(bFrom) < timeToMinutes(aTo)
}
interface Album {
  id: string; title: string; description: string | null; coverUrl: string | null
  photos: { id: string; mediaUrl: string; mediaType: string }[]
}
interface Service {
  id: string; category: string; title: string; description: string | null
  price: string; priceUnit: string | null
}
interface Review {
  id: string; rating: number; comment: string | null; createdAt: string
  author: { id: string }
}
interface Profile {
  id: string; userId: string; displayName: string; bio: string | null; city: string
  priceFrom: string | null; priceUnit: string | null; avgRating: string | null
  reviewsCount: number; isActive: boolean; avatarUrl: string | null
  profileCategories: { isPrimary: boolean; category: { slug: string; name: string; icon: string | null } }[]
  contacts: { id: string; platform: string; value: string; isVisible: boolean }[]
  portfolio: { id: string; mediaUrl: string; mediaType: string; sortOrder: number }[]
  albums: Album[]; services: Service[]; reviews: Review[]
  availabilityDates: { date: string; isAvailable: boolean; timeFrom: string | null; timeTo: string | null; note: string | null }[]
}

function CalendarPicker({ busySlots, selected, onSelect }: {
  busySlots: BusySlot[]; selected: string; onSelect: (date: string) => void
}) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date()
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const busySet = new Set(busySlots.map(s => s.date))
  const daysInMonth = new Date(viewDate.year, viewDate.month + 1, 0).getDate()
  const firstDay = new Date(viewDate.year, viewDate.month, 1).getDay()
  const startOffset = (firstDay + 6) % 7
  const prevMonth = () => setViewDate(v => { const d = new Date(v.year, v.month - 1); return { year: d.getFullYear(), month: d.getMonth() } })
  const nextMonth = () => setViewDate(v => { const d = new Date(v.year, v.month + 1); return { year: d.getFullYear(), month: d.getMonth() } })
  const monthName = new Date(viewDate.year, viewDate.month).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
  const cells: (number | null)[] = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div className="border border-[#E8E2D8] rounded-xl overflow-hidden bg-[#FAFAF8]">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#E8E2D8]">
        <button onClick={prevMonth} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F0EDE8] text-[#6B6558] text-lg">‹</button>
        <span className="text-sm font-semibold capitalize">{monthName}</span>
        <button onClick={nextMonth} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F0EDE8] text-[#6B6558] text-lg">›</button>
      </div>
      <div className="grid grid-cols-7 text-center border-b border-[#E8E2D8]">
        {['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(d => (
          <div key={d} className="text-[10px] font-bold text-[#6B6558] py-1.5">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 p-1 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const dateStr = `${viewDate.year}-${String(viewDate.month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
          const isPast = new Date(viewDate.year, viewDate.month, day) < today
          const isBusy = busySet.has(dateStr)
          const isSelected = selected === dateStr
          let bg = 'hover:bg-green-50', textColor = 'text-[#1C1A17]'
          let dot: React.ReactNode = null
          if (isPast) { textColor = 'text-[#C5BFB8]'; bg = '' }
          else if (isBusy) { bg = 'bg-red-50 hover:bg-red-100'; textColor = 'text-red-600 font-semibold'; dot = <div className="w-1 h-1 rounded-full bg-red-400 mx-auto mt-0.5" /> }
          else { dot = <div className="w-1 h-1 rounded-full bg-green-400 mx-auto mt-0.5" /> }
          if (isSelected) { bg = isBusy ? 'bg-red-500' : 'bg-[#7C3AED]'; textColor = 'text-white font-bold'; dot = null }
          return (
            <button key={i} disabled={isPast} onClick={() => onSelect(dateStr)}
              className={`rounded-lg py-1.5 text-[13px] transition-all ${bg} ${textColor} ${isPast ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
              {day}{dot}
            </button>
          )
        })}
      </div>
      <div className="flex gap-3 px-3 py-2 border-t border-[#E8E2D8]">
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-400" /><span className="text-[10px] text-[#6B6558]">Свободно</span></div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-400" /><span className="text-[10px] text-[#6B6558]">Занято</span></div>
      </div>
    </div>
  )
}

export function ProfilePage({ id }: { id: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const contextEventId = searchParams.get('eventId') || undefined
  const contextRoleId = searchParams.get('roleId') || undefined
  const [bookedEventId, setBookedEventId] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [bookingDate, setBookingDate] = useState('')
  const [bookingTimeFrom, setBookingTimeFrom] = useState('')
  const [bookingTimeTo, setBookingTimeTo] = useState('')
  const [bookingNote, setBookingNote] = useState('')
  const [eventType, setEventType] = useState('')
  const [guestsCount, setGuestsCount] = useState('')
  const [ageCategory, setAgeCategory] = useState('')
  const [duration, setDuration] = useState('')
  const [location, setLocation] = useState('')
  const [budget, setBudget] = useState('')
  const [bookingLoading, setBookingLoading] = useState(false)
  const [bookingSuccess, setBookingSuccess] = useState(false)
  const [bookingError, setBookingError] = useState('')
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewLoading, setReviewLoading] = useState(false)
  const [reviewSubmitted, setReviewSubmitted] = useState(false)
  const [reviewError, setReviewError] = useState('')
  const [isFavorite, setIsFavorite] = useState(false)
  const [activeTab, setActiveTab] = useState<'about' | 'services' | 'albums' | 'reviews'>('about')
  const [openAlbum, setOpenAlbum] = useState<Album | null>(null)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [lightboxIdx, setLightboxIdx] = useState(0)
  const [lightboxPhotos, setLightboxPhotos] = useState<string[]>([])
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [busySlots, setBusySlots] = useState<BusySlot[]>([])
  const [prefilledFromEvent, setPrefilledFromEvent] = useState(false)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) { const u = JSON.parse(userData); setCurrentUserRole(u.role); setCurrentUserId(u.id) }
    fetch(`${API_URL}/api/catalog/${id}`)
      .then(r => r.json())
      .then(data => { if (data.error) setNotFound(true); else setProfile(data) })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
    const tok = localStorage.getItem('accessToken')
    if (tok) {
      apiFetch(`/api/bookings/busy/${id}`)
        .then(r => r.json()).then(data => Array.isArray(data) && setBusySlots(data)).catch(() => {})

      apiFetch('/api/favorites/ids')
        .then(r => r.json()).then(ids => Array.isArray(ids) && setIsFavorite(ids.includes(id))).catch(() => {})

      // Восстанавливаем черновик заявки, если пользователя увели логиниться посреди заполнения формы
      try {
        const raw = sessionStorage.getItem(`booking_draft_${id}`)
        if (raw) {
          const d = JSON.parse(raw)
          setBookingDate(d.bookingDate || '')
          setBookingTimeFrom(d.bookingTimeFrom || '')
          setBookingTimeTo(d.bookingTimeTo || '')
          setBookingNote(d.bookingNote || '')
          setEventType(d.eventType || '')
          setGuestsCount(d.guestsCount || '')
          setAgeCategory(d.ageCategory || '')
          setDuration(d.duration || '')
          setLocation(d.location || '')
          setBudget(d.budget || '')
          sessionStorage.removeItem(`booking_draft_${id}`)
        }
      } catch {}
    }
  }, [id])

  // Продолжительность считаем автоматически по времени "с" и "до" — вручную часы не вводим
  useEffect(() => {
    if (!bookingTimeFrom || !bookingTimeTo) return
    let diff = timeToMinutes(bookingTimeTo) - timeToMinutes(bookingTimeFrom)
    if (diff <= 0) diff += 24 * 60 // мероприятие уходит за полночь
    setDuration(String(Math.max(1, Math.round(diff / 60))))
  }, [bookingTimeFrom, bookingTimeTo])

  // Если пришли со страницы мероприятия — подставляем в форму его данные,
  // чтобы не вбивать одно и то же для каждого следующего исполнителя.
  // Затрагиваем только пустые поля — не перетираем то, что уже введено (в т.ч. восстановленный черновик).
  useEffect(() => {
    const tok = localStorage.getItem('accessToken')
    if (!tok || !contextEventId) return
    apiFetch(`/api/events/${contextEventId}`)
      .then(r => r.json())
      .then(ev => {
        if (ev.error) return
        setBookingDate(prev => prev || (ev.eventDate ? ev.eventDate.split('T')[0] : ''))
        setBookingTimeFrom(prev => prev || ev.eventTimeFrom || '')
        setBookingTimeTo(prev => prev || ev.eventTimeTo || '')
        setEventType(prev => prev || ev.eventType || '')
        setGuestsCount(prev => prev || (ev.guestsCount != null ? String(ev.guestsCount) : ''))
        setLocation(prev => prev || ev.location || '')
        setBudget(prev => prev || (ev.budget ? String(Math.round(Number(ev.budget))) : ''))
        setBookingNote(prev => prev || ev.description || '')
        setPrefilledFromEvent(true)
      })
      .catch(() => {})
  }, [contextEventId])

  const openLightbox = (photos: string[], idx: number) => { setLightboxPhotos(photos); setLightboxIdx(idx); setLightbox(photos[idx]) }
  const closeLightbox = () => setLightbox(null)
  const lightboxPrev = () => { const idx = (lightboxIdx - 1 + lightboxPhotos.length) % lightboxPhotos.length; setLightboxIdx(idx); setLightbox(lightboxPhotos[idx]) }
  const lightboxNext = () => { const idx = (lightboxIdx + 1) % lightboxPhotos.length; setLightboxIdx(idx); setLightbox(lightboxPhotos[idx]) }

  const handleBooking = async () => {
    if (!bookingDate) { setBookingError('Выберите дату'); return }
    if (!eventType) { setBookingError('Укажите тип мероприятия'); return }
    if (hasBookingConflict) { setBookingError('Выбранное время пересекается с другой бронью исполнителя. Выберите другое время или дату.'); return }

    const token = localStorage.getItem('accessToken')
    if (!token) {
      // Сохраняем введённые данные, чтобы не потерять их после логина
      try {
        sessionStorage.setItem(`booking_draft_${id}`, JSON.stringify({
          bookingDate, bookingTimeFrom, bookingTimeTo, bookingNote,
          eventType, guestsCount, ageCategory, duration, location, budget,
        }))
      } catch {}
      const returnQuery = contextEventId ? `?eventId=${contextEventId}${contextRoleId ? `&roleId=${contextRoleId}` : ''}` : ''
      router.push(`/auth/login?redirect=${encodeURIComponent(`/catalog/${id}${returnQuery}`)}`)
      return
    }

    setBookingLoading(true)
    setBookingError('')
    try {
      const res = await apiFetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId:     id,
          eventId:       contextEventId,
          eventRoleId:   contextRoleId,
          eventDate:     new Date(bookingDate).toISOString(),
          eventTimeFrom: bookingTimeFrom || undefined,
          eventTimeTo:   bookingTimeTo || undefined,
          eventType:     eventType || undefined,
          guestsCount:   guestsCount ? Number(guestsCount) : undefined,
          ageCategory:   ageCategory || undefined,
          duration:      duration ? Number(duration) : undefined,
          location:      location || undefined,
          budget:        budget ? Number(budget) : undefined,
          notes:         bookingNote || undefined,
          total:         Number(profile?.priceFrom) || 0,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setBookingError(typeof data.error === 'string' ? data.error : 'Ошибка бронирования'); return }
      setBookedEventId(data.eventId || contextEventId || null)
      setBookingSuccess(true)
    } catch { setBookingError('Не удалось подключиться к серверу') }
    finally { setBookingLoading(false) }
  }

  const handleSubmitReview = async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) { router.push(`/auth/login?redirect=${encodeURIComponent(`/catalog/${id}`)}`); return }
    if (!reviewRating) { setReviewError('Поставьте оценку от 1 до 5 звёзд'); return }

    setReviewLoading(true)
    setReviewError('')
    try {
      const res = await apiFetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: id, rating: reviewRating, comment: reviewComment || undefined }),
      })
      const data = await res.json()
      if (!res.ok) { setReviewError(typeof data.error === 'string' ? data.error : 'Не удалось отправить отзыв'); return }
      setReviewSubmitted(true)
    } catch { setReviewError('Не удалось подключиться к серверу') }
    finally { setReviewLoading(false) }
  }

  if (loading) return (
    <><Header /><main style={{ background: 'linear-gradient(135deg, #F3E9FC 0%, #FCEAF1 45%, #FFF4EA 100%)', minHeight: '100vh' }}>
      <div className="max-w-[1240px] mx-auto px-8 py-10 animate-pulse">
        <div className="h-72 bg-[#E8E2D8] rounded-2xl mb-6" /><div className="h-8 bg-[#E8E2D8] rounded w-1/3 mb-3" />
      </div>
    </main><Footer /></>
  )

  if (notFound || !profile) return (
    <><Header /><main style={{ background: 'linear-gradient(135deg, #F3E9FC 0%, #FCEAF1 45%, #FFF4EA 100%)', minHeight: '100vh' }}>
      <div className="max-w-[1240px] mx-auto px-8 py-20 text-center">
        <p className="text-6xl mb-4">🔍</p><h1 className="font-bold text-2xl mb-2">Исполнитель не найден</h1>
        <Link href="/catalog" className="text-[#7C3AED] font-semibold hover:underline">← Вернуться в каталог</Link>
      </div>
    </main><Footer /></>
  )

  const primaryCat = profile.profileCategories.find(pc => pc.isPrimary)?.category || profile.profileCategories[0]?.category
  const catSlug = primaryCat?.slug || ''
  const catEmoji = CAT_EMOJI[catSlug] || '✦'
  const catColor = CAT_COLORS[catSlug] || '#F5F0E8'
  const catLabel = primaryCat?.name || ''
  const photos = profile.portfolio?.slice(0, 5) || []
  const isOwnProfile = !!currentUserId && currentUserId === profile.userId
  const canBook = (currentUserRole === 'client' || currentUserRole === null) && !isOwnProfile
  // Занятость = подтверждённые брони + дни, которые исполнитель сам отметил недоступными в календаре
  const selfMarkedBusy: BusySlot[] = (profile.availabilityDates || [])
    .filter(a => !a.isAvailable)
    .map(a => ({ date: a.date, timeFrom: a.timeFrom, timeTo: a.timeTo }))
  const allBusySlots = [...busySlots, ...selfMarkedBusy]
  const busyForDate = bookingDate ? allBusySlots.filter(s => s.date === bookingDate) : []
  const hasBookingConflict = busyForDate.some(s => timeRangesOverlap(bookingTimeFrom, bookingTimeTo, s.timeFrom, s.timeTo))
  const servicesByCategory = (profile.services || []).reduce((acc, s) => {
    if (!acc[s.category]) acc[s.category] = []
    acc[s.category].push(s)
    return acc
  }, {} as Record<string, Service[]>)

  const inputCls = 'w-full border border-[#E8E2D8] rounded-xl px-3 py-2.5 text-[14px] outline-none focus:border-[#7C3AED] transition-colors bg-[#FAFAF8]'

  return (
    <>
      <Header />
      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90" onClick={closeLightbox}>
          <button onClick={e => { e.stopPropagation(); lightboxPrev() }} className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 text-white text-2xl flex items-center justify-center">‹</button>
          <img src={lightbox} alt="" className="max-h-[90vh] max-w-[90vw] object-contain rounded-xl" onClick={e => e.stopPropagation()} />
          <button onClick={e => { e.stopPropagation(); lightboxNext() }} className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 text-white text-2xl flex items-center justify-center">›</button>
          <button onClick={closeLightbox} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center">✕</button>
          <div className="absolute bottom-4 text-white/60 text-sm">{lightboxIdx + 1} / {lightboxPhotos.length}</div>
        </div>
      )}

      <main style={{ background: 'linear-gradient(135deg, #F3E9FC 0%, #FCEAF1 45%, #FFF4EA 100%)', minHeight: '100vh' }}>
        <div className="max-w-[1240px] mx-auto px-8 py-8">
          <div className="flex items-center gap-2 text-sm text-[#6B6558] mb-5">
            <Link href="/catalog" className="hover:text-[#7C3AED] transition-colors">Каталог</Link>
            <span>→</span><span className="text-[#1C1A17] font-medium">{profile.displayName}</span>
          </div>

          <div className="flex flex-col lg:flex-row gap-7 lg:items-start">
            <div className="flex-1 min-w-0">

              {/* Галерея */}
              {photos.length > 0 ? (
                <div className="mb-6">
                  {photos.length === 1 ? (
                    <div className="w-full rounded-2xl overflow-hidden cursor-pointer" style={{ height: 400 }} onClick={() => openLightbox(photos.map(p => p.mediaUrl), 0)}>
                      <img src={photos[0].mediaUrl} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                    </div>
                  ) : photos.length === 2 ? (
                    <div className="grid grid-cols-2 gap-3 h-[220px] md:h-[400px]">
                      {photos.map((p, i) => (
                        <div key={p.id} className="rounded-2xl overflow-hidden cursor-pointer h-full" onClick={() => openLightbox(photos.map(x => x.mediaUrl), i)}>
                          <img src={p.mediaUrl} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                        </div>
                      ))}
                    </div>
                  ) : photos.length === 3 ? (
                    <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-3 md:h-[400px]">
                      <div className="rounded-2xl overflow-hidden cursor-pointer h-[240px] md:h-full" onClick={() => openLightbox(photos.map(p => p.mediaUrl), 0)}>
                        <img src={photos[0].mediaUrl} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                      </div>
                      <div className="grid grid-cols-2 md:flex md:flex-col gap-3 h-[140px] md:h-full">
                        {photos.slice(1, 3).map((p, i) => (
                          <div key={p.id} className="md:flex-1 rounded-2xl overflow-hidden cursor-pointer h-full" onClick={() => openLightbox(photos.map(x => x.mediaUrl), i + 1)}>
                            <img src={p.mediaUrl} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-3 md:h-[440px]">
                      <div className="rounded-2xl overflow-hidden cursor-pointer h-[240px] md:h-full" onClick={() => openLightbox(photos.map(p => p.mediaUrl), 0)}>
                        <img src={photos[0].mediaUrl} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                      </div>
                      <div className="grid grid-cols-4 md:grid-cols-2 md:grid-rows-2 gap-3 h-[90px] md:h-full">
                        {photos.slice(1, 5).map((p, i) => (
                          <div key={p.id} className="rounded-xl overflow-hidden cursor-pointer relative" onClick={() => openLightbox(photos.map(x => x.mediaUrl), i + 1)}>
                            <img src={p.mediaUrl} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                            {i === 3 && profile.portfolio.length > 5 && (
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <span className="text-white font-bold text-xl">+{profile.portfolio.length - 5}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full rounded-2xl mb-6 flex items-center justify-center" style={{ height: 280, background: catColor }}>
                  <span style={{ fontSize: 80, opacity: 0.25 }}>{catEmoji}</span>
                </div>
              )}

              {/* Имя и мета */}
              <div className="bg-white rounded-2xl border border-[#E8E2D8] p-6 mb-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    {canBook && (
                      <FavoriteButton profileId={profile.id} active={isFavorite} onToggle={setIsFavorite} size={38} />
                    )}
                    <div>
                      <h1 className="font-bold mb-1" style={{ fontSize: 'clamp(22px, 3vw, 30px)', letterSpacing: '-0.02em' }}>{profile.displayName}</h1>
                      <p className="text-[#6B6558] text-[15px]">{catEmoji} {catLabel} · 📍 {profile.city}</p>
                    </div>
                  </div>
                  {profile.avgRating && Number(profile.avgRating) > 0 && (
                    <div className="text-center flex-shrink-0">
                      <div className="font-bold text-[26px] leading-none" style={{ color: '#7C3AED' }}>{Number(profile.avgRating).toFixed(1)}</div>
                      <div className="text-yellow-500">★★★★★</div>
                      <div className="text-[#6B6558] text-xs">{profile.reviewsCount} отзывов</div>
                    </div>
                  )}
                </div>
                {profile.contacts.filter(c => c.isVisible).length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {profile.contacts.filter(c => c.isVisible).map(c => (
                      <span key={c.id} className="text-xs font-medium px-3 py-1.5 rounded-full border border-[#E8E2D8] text-[#6B6558]">{c.platform}: {c.value}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Табы */}
              <div className="flex gap-1 bg-white border border-[#E8E2D8] rounded-2xl p-1 mb-5">
                {[
                  { key: 'about', label: 'О себе' },
                  { key: 'services', label: `Услуги${profile.services?.length > 0 ? ` (${profile.services.length})` : ''}` },
                  { key: 'albums', label: `Альбомы${profile.albums?.length > 0 ? ` (${profile.albums.length})` : ''}` },
                  { key: 'reviews', label: `Отзывы${profile.reviewsCount > 0 ? ` (${profile.reviewsCount})` : ''}` },
                ].map(tab => (
                  <button key={tab.key} onClick={() => { setActiveTab(tab.key as any); setOpenAlbum(null) }}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                    style={{ background: activeTab === tab.key ? '#1C1A17' : 'transparent', color: activeTab === tab.key ? 'white' : '#6B6558' }}>
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeTab === 'about' && (
                <div className="bg-white rounded-2xl border border-[#E8E2D8] p-6">
                  <h2 className="font-bold text-[18px] mb-4">О себе</h2>
                  {profile.bio ? <p className="text-[#4A4540] leading-relaxed text-[15px] whitespace-pre-line">{profile.bio}</p>
                    : <p className="text-[#6B6558] text-[15px]">Исполнитель пока не заполнил описание</p>}
                </div>
              )}

              {activeTab === 'services' && (
                <div className="flex flex-col gap-5">
                  {Object.keys(servicesByCategory).length === 0 ? (
                    <div className="bg-white rounded-2xl border border-[#E8E2D8] p-8 text-center text-[#6B6558]">
                      <p className="text-3xl mb-2">📋</p><p className="font-medium">Услуги пока не добавлены</p>
                    </div>
                  ) : Object.entries(servicesByCategory).map(([cat, items]) => (
                    <div key={cat} className="bg-white rounded-2xl border border-[#E8E2D8] overflow-hidden">
                      <div className="px-6 py-4 border-b border-[#E8E2D8]" style={{ background: '#F9F6F0' }}>
                        <h3 className="font-bold text-[17px]">{cat}</h3>
                      </div>
                      <div className="divide-y divide-[#E8E2D8]">
                        {items.map(service => (
                          <div key={service.id} className="px-6 py-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <p className="font-semibold text-[15px] mb-1">{service.title}</p>
                                {service.description && <p className="text-[#6B6558] text-[13px] leading-relaxed whitespace-pre-line">{service.description}</p>}
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="font-bold text-[16px]">от {Number(service.price).toLocaleString('ru-RU')} ₽</p>
                                {service.priceUnit && <p className="text-[#6B6558] text-xs">{service.priceUnit}</p>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'albums' && (
                <div>
                  {!openAlbum ? (
                    !profile.albums || profile.albums.length === 0 ? (
                      <div className="bg-white rounded-2xl border border-[#E8E2D8] p-8 text-center text-[#6B6558]">
                        <p className="text-3xl mb-2">📁</p><p className="font-medium">Альбомы пока не добавлены</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-4">
                        {profile.albums.map(album => (
                          <button key={album.id} onClick={() => setOpenAlbum(album)} className="text-left group">
                            <div className="rounded-2xl overflow-hidden aspect-square bg-[#E8E2D8] relative">
                              {album.coverUrl ? <img src={album.coverUrl} alt={album.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                : <div className="w-full h-full flex items-center justify-center text-4xl opacity-30">📁</div>}
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                                <p className="text-white font-semibold text-sm">{album.title}</p>
                                <p className="text-white/70 text-xs">{album.photos?.length || 0} фото</p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )
                  ) : (
                    <div>
                      <button onClick={() => setOpenAlbum(null)} className="text-sm text-[#6B6558] hover:text-[#7C3AED] mb-4 transition-colors">← Все альбомы</button>
                      <h3 className="font-bold text-[20px] mb-1">{openAlbum.title}</h3>
                      {openAlbum.description && <p className="text-[#6B6558] text-sm mb-4">{openAlbum.description}</p>}
                      {openAlbum.photos?.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-[#E8E2D8] p-8 text-center text-[#6B6558]">
                          <p className="text-3xl mb-2">📷</p><p className="font-medium">В этом альбоме пока нет фото</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-3">
                          {openAlbum.photos?.map((photo, i) => (
                            <div key={photo.id} className="rounded-2xl overflow-hidden aspect-square cursor-pointer"
                              onClick={() => openLightbox(openAlbum.photos.map(p => p.mediaUrl), i)}>
                              <img src={photo.mediaUrl} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'reviews' && (
                <div className="flex flex-col gap-4">
                  {canBook && (
                    <div className="bg-white rounded-2xl border border-[#E8E2D8] p-5">
                      {reviewSubmitted ? (
                        <p className="text-sm font-semibold" style={{ color: '#166534' }}>✓ Отзыв отправлен на модерацию. Он появится на странице после проверки.</p>
                      ) : (
                        <>
                          <h3 className="font-bold text-[15px] mb-3">Оставить отзыв</h3>
                          {reviewError && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2 text-sm mb-3">{reviewError}</div>}
                          <div className="flex gap-1 mb-3">
                            {[1, 2, 3, 4, 5].map(n => (
                              <button key={n} type="button" onClick={() => setReviewRating(n)}
                                className="text-2xl leading-none transition-colors" style={{ color: n <= reviewRating ? '#FBBF24' : '#E8E2D8' }}>★</button>
                            ))}
                          </div>
                          <textarea rows={3} placeholder="Расскажите, как всё прошло..." value={reviewComment}
                            onChange={e => setReviewComment(e.target.value)}
                            className="w-full border border-[#E8E2D8] rounded-xl px-3 py-2.5 text-[14px] outline-none focus:border-[#7C3AED] transition-colors bg-[#FAFAF8] resize-none mb-3" />
                          <button onClick={handleSubmitReview} disabled={reviewLoading}
                            className="text-white font-semibold py-2.5 px-5 rounded-xl text-[14px] disabled:opacity-60"
                            style={{ background: '#7C3AED' }}>
                            {reviewLoading ? 'Отправляем...' : 'Отправить отзыв'}
                          </button>
                          <p className="text-[#6B6558] text-xs mt-2">Доступно только после завершённого мероприятия с этим исполнителем</p>
                        </>
                      )}
                    </div>
                  )}
                  {profile.reviews.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-[#E8E2D8] p-8 text-center text-[#6B6558]">
                      <p className="text-3xl mb-2">💬</p><p className="font-medium">Отзывов пока нет</p>
                    </div>
                  ) : profile.reviews.map(review => (
                    <div key={review.id} className="bg-white rounded-2xl border border-[#E8E2D8] p-5">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white flex-shrink-0" style={{ background: '#7C3AED' }}>?</div>
                        <p className="text-[#6B6558] text-xs">{new Date(review.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        <div className="ml-auto text-yellow-500 font-semibold text-sm">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</div>
                      </div>
                      {review.comment && <p className="text-[#4A4540] text-[14px] leading-relaxed">{review.comment}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Правая колонка — бронирование */}
            {canBook && (
              <div className="w-full lg:w-80 flex-shrink-0 lg:sticky lg:top-24">
                <div className="bg-white rounded-2xl border border-[#E8E2D8] p-5 max-h-[90vh] overflow-y-auto">
                  {bookingSuccess ? (
                    <div className="text-center py-4">
                      <div className="text-5xl mb-3">🎉</div>
                      <h3 className="font-bold text-[18px] mb-2">Заявка отправлена!</h3>
                      <p className="text-[#6B6558] text-sm mb-4">Исполнитель получит уведомление и свяжется с вами</p>
                      <Link href={bookedEventId ? `/events/${bookedEventId}` : '/dashboard'} className="block w-full text-center text-white font-semibold py-3 rounded-xl text-[15px]" style={{ background: '#7C3AED' }}>
                        {bookedEventId ? 'Перейти к мероприятию' : 'Мои брони'}
                      </Link>
                    </div>
                  ) : (
                    <>
                      <h3 className="font-bold text-[18px] mb-1">Забронировать</h3>
                      {profile.priceFrom && (
                        <p className="text-[#6B6558] text-sm mb-4">
                          от <b className="text-[#1C1A17] text-[17px]">{Number(profile.priceFrom).toLocaleString('ru-RU')} ₽</b>
                          {profile.priceUnit && ` / ${profile.priceUnit}`}
                        </p>
                      )}
                      {prefilledFromEvent && (
                        <div className="bg-[#F3E9FC] border border-[#7C3AED]/25 text-[#7C3AED] rounded-xl px-4 py-3 text-sm mb-3">
                          Поля заполнены данными мероприятия — при необходимости поменяйте под этого исполнителя
                        </div>
                      )}
                      {bookingError && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-3">{bookingError}</div>}

                      <div className="flex flex-col gap-3">
                        {/* Календарь */}
                        <div>
                          <label className="text-xs font-bold uppercase tracking-widest text-[#6B6558] mb-2 block">Дата мероприятия</label>
                          <CalendarPicker busySlots={allBusySlots} selected={bookingDate} onSelect={setBookingDate} />
                          {busyForDate.length > 0 && (
                            <div className={`rounded-xl px-3 py-2.5 mt-2 border ${hasBookingConflict ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                              <p className={`text-xs font-bold ${hasBookingConflict ? 'text-red-700' : 'text-amber-700'}`}>
                                {hasBookingConflict ? '⚠️ Время пересекается с занятым' : 'ℹ️ В этот день уже есть другие брони'}
                              </p>
                              <p className={`text-xs mt-0.5 ${hasBookingConflict ? 'text-red-600' : 'text-amber-600'}`}>
                                {busyForDate.map((s, i) => (
                                  <span key={i}>
                                    {s.timeFrom && s.timeTo ? `Занято с ${s.timeFrom} до ${s.timeTo}` : 'Занят весь день'}
                                    {i < busyForDate.length - 1 ? ', ' : ''}
                                  </span>
                                ))}
                                {!hasBookingConflict && ' — но выбранное вами время свободно'}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Время */}
                        <div>
                          <label className="text-xs font-bold uppercase tracking-widest text-[#6B6558] mb-1.5 block">Время</label>
                          <div className="flex gap-2 items-center">
                            <input type="time" value={bookingTimeFrom} onChange={e => setBookingTimeFrom(e.target.value)} className="flex-1 border border-[#E8E2D8] rounded-xl px-3 py-2.5 text-[14px] outline-none focus:border-[#7C3AED] bg-[#FAFAF8]" />
                            <span className="text-[#6B6558] text-sm">до</span>
                            <input type="time" value={bookingTimeTo} onChange={e => setBookingTimeTo(e.target.value)} className="flex-1 border border-[#E8E2D8] rounded-xl px-3 py-2.5 text-[14px] outline-none focus:border-[#7C3AED] bg-[#FAFAF8]" />
                          </div>
                        </div>

                        {/* Тип мероприятия */}
                        <div>
                          <label className="text-xs font-bold uppercase tracking-widest text-[#6B6558] mb-1.5 block">Тип мероприятия *</label>
                          <select value={eventType} onChange={e => setEventType(e.target.value)} className={inputCls}>
                            <option value="">Выберите тип...</option>
                            {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>

                        {/* Количество гостей */}
                        <div>
                          <label className="text-xs font-bold uppercase tracking-widest text-[#6B6558] mb-1.5 block">Кол-во гостей</label>
                          <input type="number" min={1} placeholder="50" value={guestsCount} onChange={e => setGuestsCount(e.target.value)} className={inputCls} />
                        </div>

                        {/* Возрастная категория */}
                        <div>
                          <label className="text-xs font-bold uppercase tracking-widest text-[#6B6558] mb-1.5 block">Аудитория</label>
                          <select value={ageCategory} onChange={e => setAgeCategory(e.target.value)} className={inputCls}>
                            <option value="">Выберите...</option>
                            {AGE_CATEGORIES.map(a => <option key={a} value={a}>{a}</option>)}
                          </select>
                        </div>

                        {/* Продолжительность */}
                        <div>
                          <label className="text-xs font-bold uppercase tracking-widest text-[#6B6558] mb-1.5 block">Продолжительность (часов)</label>
                          <input type="number" min={1} max={24} placeholder="4" value={duration}
                            onChange={e => setDuration(e.target.value)}
                            readOnly={!!(bookingTimeFrom && bookingTimeTo)}
                            className={`${inputCls}${bookingTimeFrom && bookingTimeTo ? ' opacity-70 cursor-not-allowed' : ''}`} />
                          {bookingTimeFrom && bookingTimeTo
                            ? <p className="text-xs text-[#6B6558] mt-1">Рассчитано автоматически по времени</p>
                            : <p className="text-xs text-[#6B6558] mt-1">Укажите время "с" и "до" — посчитаем сами</p>}
                        </div>

                        {/* Место проведения */}
                        <div>
                          <label className="text-xs font-bold uppercase tracking-widest text-[#6B6558] mb-1.5 block">Место проведения</label>
                          <input type="text" placeholder="Адрес или название площадки" value={location} onChange={e => setLocation(e.target.value)} className={inputCls} />
                        </div>

                        {/* Бюджет */}
                        <div>
                          <label className="text-xs font-bold uppercase tracking-widest text-[#6B6558] mb-1.5 block">Бюджет (₽)</label>
                          <input type="number" min={0} placeholder="100 000" value={budget} onChange={e => setBudget(e.target.value)} className={inputCls} />
                        </div>

                        {/* Комментарий */}
                        <div>
                          <label className="text-xs font-bold uppercase tracking-widest text-[#6B6558] mb-1.5 block">Дополнительно</label>
                          <textarea rows={2} placeholder="Пожелания, особенности мероприятия..."
                            value={bookingNote} onChange={e => setBookingNote(e.target.value)}
                            className="w-full border border-[#E8E2D8] rounded-xl px-3 py-2.5 text-[14px] outline-none focus:border-[#7C3AED] transition-colors bg-[#FAFAF8] resize-none" />
                        </div>

                        <button onClick={handleBooking} disabled={bookingLoading}
                          className="w-full text-white font-semibold py-3.5 rounded-xl text-[16px] transition-opacity disabled:opacity-60"
                          style={{ background: '#7C3AED' }}>
                          {bookingLoading ? 'Отправляем...' : 'Отправить заявку'}
                        </button>
                        <p className="text-center text-xs text-[#6B6558]">Оплата только после подтверждения мероприятия</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {!canBook && isOwnProfile && (
              <div className="w-full lg:w-80 flex-shrink-0 lg:sticky lg:top-24">
                <div className="bg-white rounded-2xl border border-[#E8E2D8] p-6 text-center">
                  <p className="text-3xl mb-3">👤</p>
                  <p className="font-semibold text-[15px] mb-2">Это ваш профиль</p>
                  <p className="text-[#6B6558] text-sm mb-4">Вы видите его так, как видят клиенты</p>
                  <Link href="/dashboard" className="block w-full text-center text-white font-semibold py-3 rounded-xl text-[15px]" style={{ background: '#7C3AED' }}>Перейти в кабинет</Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}