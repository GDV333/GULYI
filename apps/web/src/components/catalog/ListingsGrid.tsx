'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { API_URL } from '@/lib/config'
import { apiFetch } from '@/lib/apiFetch'
import { FavoriteButton } from '@/components/shared/FavoriteButton'

const ACCENT = '#7C3AED'
const BORDER = 'rgba(21,15,46,0.08)'
const TEXT = '#150F2E'
const MUTED = 'rgba(21,15,46,0.5)'

const CAT_EMOJI: Record<string,string> = {
  host:'🎤',dj:'🎧',organizer:'📋',video:'🎬',photo:'📸',reels:'🎥',
  coordinator:'🗂',light_sound:'💡',outfit:'👗',venue:'🏛',transfer:'🚗',
  photo_studio:'🎞',catering:'🍽',jewelry:'💍',barbershop:'💈',makeup:'💄',
  bachelor:'🥃',bachelorette:'🌸',decor:'🎈',confectionery:'🎂',
}

interface Profile {
  id:string; displayName:string; city:string; bio:string|null
  priceFrom:string|null; priceUnit:string|null; avgRating:string|null
  profileCategories:{isPrimary:boolean;category:{slug:string;name:string;icon:string|null}}[]
  portfolio:{id:string;mediaUrl:string}[]
}

export function ListingsGrid() {
  const [items, setItems] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch(`${API_URL}/api/catalog?city=Новосибирск&limit=4&sortBy=rating`)
      .then(r => r.json()).then(d => setItems(d.data ?? []))
      .catch(console.error).finally(() => setLoading(false))

    const token = localStorage.getItem('accessToken')
    if (token) {
      apiFetch('/api/favorites/ids')
        .then(r => r.json()).then(ids => Array.isArray(ids) && setFavoriteIds(new Set(ids)))
        .catch(() => {})
    }
  }, [])

  const toggleFavorite = (profileId: string, next: boolean) => {
    setFavoriteIds(prev => {
      const copy = new Set(prev)
      next ? copy.add(profileId) : copy.delete(profileId)
      return copy
    })
  }

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: 'clamp(18px,3vw,32px) clamp(16px,4vw,40px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 'clamp(22px,2.5vw,28px)', fontWeight: 800, color: TEXT, letterSpacing: '-0.02em', marginBottom: 4 }}>Рекомендуем для вас</h2>
          <p style={{ color: MUTED, fontSize: 14 }}>Подобрано на основе популярных запросов</p>
        </div>
        <Link href="/catalog" style={{ color: ACCENT, fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>Смотреть все →</Link>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: 16 }}>
          {[...Array(4)].map((_,i) => (
            <div key={i} style={{ background: '#FFFFFF', borderRadius: 18, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
              <div style={{ height: 176, background: 'rgba(21,15,46,0.05)' }} />
              <div style={{ padding: 16 }}>
                <div style={{ height: 14, background: 'rgba(21,15,46,0.07)', borderRadius: 6, width: '70%', marginBottom: 8 }} />
                <div style={{ height: 11, background: 'rgba(21,15,46,0.05)', borderRadius: 6, width: '50%' }} />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: MUTED }}>
          <p style={{ fontSize: 16, fontWeight: 600, color: TEXT, marginBottom: 6 }}>Исполнители появятся здесь</p>
          <p style={{ fontSize: 14 }}>Как только кто-то зарегистрируется — карточки отобразятся</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: 16 }}>
          {items.map((item, i) => {
            const cat = item.profileCategories?.find(p=>p.isPrimary)?.category || item.profileCategories?.[0]?.category
            const emoji = CAT_EMOJI[cat?.slug||''] || '✦'
            return (
              <Link key={item.id} href={`/catalog/${item.id}`} className="gulyay-pop" style={{ textDecoration: 'none', display: 'block', background: '#FFFFFF', borderRadius: 18, border: `1px solid ${BORDER}`, overflow: 'hidden', transition: 'all 0.2s', boxShadow: '0 2px 12px rgba(21,15,46,0.05)', animationDelay: `${i * 0.06}s` }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor='rgba(124,58,237,0.35)'; el.style.transform='translateY(-2px)'; el.style.boxShadow='0 8px 24px rgba(21,15,46,0.1)' }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor=BORDER; el.style.transform='none'; el.style.boxShadow='0 2px 12px rgba(21,15,46,0.05)' }}>
                <div style={{ height: 176, background: 'rgba(21,15,46,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                  {item.portfolio?.[0]
                    ? <img src={item.portfolio[0].mediaUrl} alt={item.displayName} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                    : <span style={{ fontSize: 48, opacity: 0.3 }}>{emoji}</span>
                  }
                  <div style={{ position: 'absolute', top: 10, right: 10 }}>
                    <FavoriteButton profileId={item.id} active={favoriteIds.has(item.id)}
                      onToggle={next => toggleFavorite(item.id, next)} size={30} />
                  </div>
                </div>
                <div style={{ padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                    <p style={{ fontWeight: 700, fontSize: 16, color: TEXT, lineHeight: 1.3 }}>{item.displayName}</p>
                    {item.avgRating && Number(item.avgRating) > 0 && (
                      <span style={{ fontSize: 12, fontWeight: 600, color: TEXT, whiteSpace: 'nowrap', display:'flex', alignItems:'center', gap:2 }}>
                        <span style={{ color:'#FBBF24' }}>★</span>{Number(item.avgRating).toFixed(1)}
                      </span>
                    )}
                  </div>
                  <p style={{ color: MUTED, fontSize: 13, marginBottom: 10 }}>{emoji} {cat?.name} · {item.city}</p>
                  {item.bio && (
                    <p style={{ color:'rgba(21,15,46,0.45)', fontSize:13, lineHeight:1.6, marginBottom:10, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' } as any}>
                      {item.bio}
                    </p>
                  )}
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', borderTop:`1px solid ${BORDER}`, paddingTop:10 }}>
                    {item.priceFrom
                      ? <span style={{ fontWeight:700, fontSize:13, color:TEXT }}>от {Number(item.priceFrom).toLocaleString('ru-RU')} ₽{item.priceUnit && <span style={{ color:MUTED, fontWeight:400, fontSize:12 }}> / {item.priceUnit}</span>}</span>
                      : <span style={{ color:MUTED, fontSize:13 }}>По запросу</span>
                    }
                    <span style={{ color:ACCENT, fontSize:13, fontWeight:600 }}>→</span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
