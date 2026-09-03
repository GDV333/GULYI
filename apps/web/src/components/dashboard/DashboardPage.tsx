'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { apiFetch } from '@/lib/apiFetch'
import { FavoriteButton } from '@/components/shared/FavoriteButton'

const BG    = 'linear-gradient(135deg, #F3E9FC 0%, #FCEAF1 45%, #FFF4EA 100%)'
const CARD  = '#FFFFFF'
const CARD2 = '#F3EEFB'
const ACCENT= '#7C3AED'
const BORDER= 'rgba(21,15,46,0.08)'
const TEXT  = '#150F2E'
const MUTED = 'rgba(21,15,46,0.5)'
const inp: React.CSSProperties = { width:'100%', background:'#F8F6FC', border:`1px solid ${BORDER}`, borderRadius:12, padding:'11px 14px', fontSize:14, color:TEXT, outline:'none', boxSizing:'border-box', colorScheme:'light' }

interface User { id:string; name:string; email:string; role:'client'|'vendor'|'admin'; avatar:string|null }
interface Profile {
  id:string; displayName:string; bio:string|null; city:string
  priceFrom:string|null; priceUnit:string|null; avatarUrl:string|null
  avgRating:string|null; reviewsCount:number
  profileCategories:{isPrimary:boolean;category:{slug:string;name:string;icon:string|null}}[]
  contacts:{id:string;platform:string;value:string;isVisible:boolean}[]
  portfolio:{id:string;title:string|null;mediaUrl:string;mediaType:string;sortOrder:number}[]
  albums:Album[]; services:Service[]
}
interface Album { id:string; title:string; description:string|null; coverUrl:string|null; photos:{id:string;mediaUrl:string;mediaType:string}[] }
interface Service { id:string; category:string; title:string; description:string|null; price:string; priceUnit:string|null }
interface AvailabilityDate { id?:string; date:string; isAvailable:boolean; timeFrom:string|null; timeTo:string|null; note:string|null }
interface Booking {
  id:string; eventDate:string; status:string; total:number; notes:string|null
  eventTimeFrom?:string|null; eventTimeTo?:string|null; eventType?:string|null
  guestsCount?:number|null; ageCategory?:string|null; duration?:number|null
  location?:string|null; budget?:string|null; eventId?:string|null
  profile?:{displayName:string;profileCategories:{isPrimary:boolean;category:{name:string}}[]}
  client?:{email:string;profile?:{displayName:string}}
}
interface FavoriteItem {
  id:string; savedAt:string
  profile:{
    id:string; displayName:string; city:string; avatarUrl:string|null
    priceFrom:string|null; priceUnit:string|null; avgRating:string|null; reviewsCount:number
    profileCategories:{isPrimary:boolean;category:{slug:string;name:string;icon:string|null}}[]
  }
}

const STATUS: Record<string,{label:string;color:string;bg:string}> = {
  pending:   { label:'Ожидает',     color:'#FBBF24', bg:'rgba(251,191,36,0.12)' },
  confirmed: { label:'Подтверждён', color:'#34D399', bg:'rgba(52,211,153,0.12)' },
  paid:      { label:'Оплачен',     color:'#60A5FA', bg:'rgba(96,165,250,0.12)' },
  completed: { label:'Завершён',    color:MUTED,     bg:'rgba(21,15,46,0.06)' },
  cancelled: { label:'Отменён',     color:'#F87171', bg:'rgba(248,113,113,0.12)' },
  refunded:  { label:'Возврат',     color:'#C084FC', bg:'rgba(192,132,252,0.12)' },
}

const PRICE_UNITS = ['за час','за смену','за вечер','за выступление','за проект','за гостя','за мероприятие']
const PLATFORMS = [
  { value:'phone',     label:'Телефон',   placeholder:'+7 900 000 00 00' },
  { value:'telegram',  label:'Telegram',  placeholder:'@username' },
  { value:'instagram', label:'Instagram', placeholder:'@username' },
  { value:'whatsapp',  label:'WhatsApp',  placeholder:'+7 900 000 00 00' },
  { value:'vk',        label:'ВКонтакте', placeholder:'vk.com/id' },
]

function VendorCalendar({ bookings, unavailableDates, onSelectBooking }: { bookings:Booking[]; unavailableDates:Set<string>; onSelectBooking:(b:Booking)=>void }) {
  const today = new Date(); today.setHours(0,0,0,0)
  const [viewDate, setViewDate] = useState({ year:today.getFullYear(), month:today.getMonth() })
  const prevMonth = () => setViewDate(v => { const d=new Date(v.year,v.month-1); return {year:d.getFullYear(),month:d.getMonth()} })
  const nextMonth = () => setViewDate(v => { const d=new Date(v.year,v.month+1); return {year:d.getFullYear(),month:d.getMonth()} })
  const monthName = new Date(viewDate.year,viewDate.month).toLocaleDateString('ru-RU',{month:'long',year:'numeric'})
  const daysInMonth = new Date(viewDate.year,viewDate.month+1,0).getDate()
  const startOffset = (new Date(viewDate.year,viewDate.month,1).getDay()+6)%7
  const cells: (number|null)[] = []
  for (let i=0;i<startOffset;i++) cells.push(null)
  for (let d=1;d<=daysInMonth;d++) cells.push(d)

  const byDate: Record<string,Booking[]> = {}
  for (const b of bookings) {
    const d=new Date(b.eventDate)
    const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    if (!byDate[key]) byDate[key]=[]
    byDate[key].push(b)
  }
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`

  return (
    <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:20, overflow:'hidden', boxShadow:'0 4px 24px rgba(21,15,46,0.06)' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderBottom:`1px solid ${BORDER}` }}>
        <button onClick={prevMonth} style={{ width:32, height:32, borderRadius:10, background:'rgba(21,15,46,0.04)', border:`1px solid ${BORDER}`, color:MUTED, cursor:'pointer', fontSize:18 }}>‹</button>
        <span style={{ fontSize:13, fontWeight:700, color:TEXT, textTransform:'capitalize' }}>{monthName}</span>
        <button onClick={nextMonth} style={{ width:32, height:32, borderRadius:10, background:'rgba(21,15,46,0.04)', border:`1px solid ${BORDER}`, color:MUTED, cursor:'pointer', fontSize:18 }}>›</button>
      </div>
      {/* Days of week */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', textAlign:'center', background:'rgba(21,15,46,0.02)', borderBottom:`1px solid ${BORDER}` }}>
        {['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(d => (
          <div key={d} style={{ fontSize:10, fontWeight:700, color:MUTED, padding:'8px 0' }}>{d}</div>
        ))}
      </div>
      {/* Cells */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', padding:8, gap:2 }}>
        {cells.map((day,i) => {
          if (!day) return <div key={i} />
          const dateStr=`${viewDate.year}-${String(viewDate.month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
          const isPast = new Date(viewDate.year,viewDate.month,day)<today
          const dayBks = byDate[dateStr]||[]
          const isToday = dateStr===todayStr
          const confirmed = dayBks.filter(b=>b.status==='confirmed')
          const pending = dayBks.filter(b=>b.status==='pending')
          const hasBks = dayBks.length>0
          const selfUnavailable = !hasBks && unavailableDates.has(dateStr)
          const bg = confirmed.length>0?'rgba(52,211,153,0.15)':pending.length>0?'rgba(251,191,36,0.15)':hasBks?'rgba(248,113,113,0.15)':selfUnavailable?'rgba(21,15,46,0.08)':'transparent'
          const dayColor = confirmed.length>0?'#34D399':pending.length>0?'#FBBF24':hasBks?'#F87171':selfUnavailable?'#6B7280':isToday?ACCENT:isPast?'rgba(21,15,46,0.2)':TEXT
          return (
            <button key={i} disabled={!hasBks&&isPast} onClick={()=>hasBks&&onSelectBooking(dayBks[0])}
              style={{ borderRadius:10, padding:'6px 2px', textAlign:'center', background:bg, border:`1px solid ${isToday?ACCENT:'transparent'}`, cursor:hasBks?'pointer':'default', opacity:(!hasBks&&isPast)?0.35:1 }}>
              <span style={{ fontSize:13, fontWeight:600, color:dayColor }}>{day}</span>
              {hasBks && (
                <div style={{ display:'flex', justifyContent:'center', gap:2, marginTop:2 }}>
                  {dayBks.slice(0,3).map((b,idx) => (
                    <div key={idx} style={{ width:4, height:4, borderRadius:'50%', background:STATUS[b.status]?.color||MUTED }} />
                  ))}
                </div>
              )}
              {selfUnavailable && (
                <div style={{ width:4, height:4, borderRadius:'50%', background:'#6B7280', margin:'2px auto 0' }} />
              )}
            </button>
          )
        })}
      </div>
      {/* Legend */}
      <div style={{ padding:'10px 16px', borderTop:`1px solid ${BORDER}`, background:'rgba(21,15,46,0.02)' }}>
        <div style={{ display:'flex', flexWrap:'wrap', gap:12 }}>
          {[['#34D399','Подтверждён'],['#FBBF24','Ожидает'],['#F87171','Отменён'],['#6B7280','Вы недоступны']].map(([c,l]) => (
            <div key={l} style={{ display:'flex', alignItems:'center', gap:6 }}>
              <div style={{ width:10, height:10, borderRadius:3, background:c+'22', border:`1px solid ${c}66` }} />
              <span style={{ fontSize:11, color:MUTED }}>{l}</span>
            </div>
          ))}
        </div>
      </div>
      {/* Upcoming */}
      <div style={{ padding:'12px 16px', borderTop:`1px solid ${BORDER}` }}>
        <p style={{ fontSize:10, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:MUTED, marginBottom:10 }}>Ближайшие</p>
        {bookings.filter(b=>new Date(b.eventDate)>=today&&b.status!=='cancelled').sort((a,b)=>new Date(a.eventDate).getTime()-new Date(b.eventDate).getTime()).slice(0,3).map(b => {
          const s=STATUS[b.status]||STATUS.pending
          return (
            <button key={b.id} onClick={()=>onSelectBooking(b)}
              style={{ width:'100%', textAlign:'left', display:'flex', alignItems:'center', gap:10, padding:'8px 10px', borderRadius:12, background:'transparent', border:'none', cursor:'pointer', marginBottom:2 }}
              onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='rgba(21,15,46,0.04)'}
              onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='transparent'}>
              <div style={{ width:32, height:32, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, flexShrink:0, background:s.bg, color:s.color }}>
                {new Date(b.eventDate).getDate()}
              </div>
              <div style={{ minWidth:0 }}>
                <p style={{ fontSize:13, fontWeight:600, color:TEXT, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{b.client?.profile?.displayName||b.client?.email||'Клиент'}</p>
                <p style={{ fontSize:11, color:MUTED, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{b.eventType||new Date(b.eventDate).toLocaleDateString('ru-RU',{day:'numeric',month:'short'})}</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function AvailabilityCalendar({ dates, selectedDate, onSelectDate }: { dates:AvailabilityDate[]; selectedDate:string|null; onSelectDate:(dateStr:string)=>void }) {
  const today = new Date(); today.setHours(0,0,0,0)
  const [viewDate, setViewDate] = useState({ year:today.getFullYear(), month:today.getMonth() })
  const prevMonth = () => setViewDate(v => { const d=new Date(v.year,v.month-1); return {year:d.getFullYear(),month:d.getMonth()} })
  const nextMonth = () => setViewDate(v => { const d=new Date(v.year,v.month+1); return {year:d.getFullYear(),month:d.getMonth()} })
  const monthName = new Date(viewDate.year,viewDate.month).toLocaleDateString('ru-RU',{month:'long',year:'numeric'})
  const daysInMonth = new Date(viewDate.year,viewDate.month+1,0).getDate()
  const startOffset = (new Date(viewDate.year,viewDate.month,1).getDay()+6)%7
  const cells: (number|null)[] = []
  for (let i=0;i<startOffset;i++) cells.push(null)
  for (let d=1;d<=daysInMonth;d++) cells.push(d)

  const byDate: Record<string,AvailabilityDate> = {}
  for (const a of dates) byDate[a.date] = a
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`

  return (
    <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:20, overflow:'hidden', boxShadow:'0 4px 24px rgba(21,15,46,0.06)' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderBottom:`1px solid ${BORDER}` }}>
        <button onClick={prevMonth} style={{ width:32, height:32, borderRadius:10, background:'rgba(21,15,46,0.04)', border:`1px solid ${BORDER}`, color:MUTED, cursor:'pointer', fontSize:18 }}>‹</button>
        <span style={{ fontSize:14, fontWeight:700, color:TEXT, textTransform:'capitalize' }}>{monthName}</span>
        <button onClick={nextMonth} style={{ width:32, height:32, borderRadius:10, background:'rgba(21,15,46,0.04)', border:`1px solid ${BORDER}`, color:MUTED, cursor:'pointer', fontSize:18 }}>›</button>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', textAlign:'center', background:'rgba(21,15,46,0.02)', borderBottom:`1px solid ${BORDER}` }}>
        {['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(d => (
          <div key={d} style={{ fontSize:11, fontWeight:700, color:MUTED, padding:'10px 0' }}>{d}</div>
        ))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', padding:10, gap:4 }}>
        {cells.map((day,i) => {
          if (!day) return <div key={i} />
          const dateStr = `${viewDate.year}-${String(viewDate.month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
          const isPast = new Date(viewDate.year,viewDate.month,day) < today
          const entry = byDate[dateStr]
          const isToday = dateStr === todayStr
          const isSelected = dateStr === selectedDate
          const bg = entry ? (entry.isAvailable ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)') : 'transparent'
          const dayColor = entry ? (entry.isAvailable ? '#34D399' : '#F87171') : isToday ? ACCENT : isPast ? 'rgba(21,15,46,0.25)' : TEXT
          return (
            <button key={i} onClick={() => onSelectDate(dateStr)}
              style={{ borderRadius:10, padding:'10px 2px', textAlign:'center', background:bg, border:`1.5px solid ${isSelected?ACCENT:isToday?`${ACCENT}55`:'transparent'}`, cursor:'pointer' }}>
              <span style={{ fontSize:13, fontWeight:600, color:dayColor }}>{day}</span>
              {entry?.note && <div style={{ width:4, height:4, borderRadius:'50%', background:entry.isAvailable?'#34D399':'#F87171', margin:'3px auto 0' }} />}
            </button>
          )
        })}
      </div>
      <div style={{ padding:'10px 16px', borderTop:`1px solid ${BORDER}`, background:'rgba(21,15,46,0.02)', display:'flex', gap:14, flexWrap:'wrap' }}>
        {[['#34D399','Доступен'],['#F87171','Недоступен']].map(([c,l]) => (
          <div key={l} style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ width:10, height:10, borderRadius:3, background:c+'22', border:`1px solid ${c}66` }} />
            <span style={{ fontSize:11, color:MUTED }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User|null>(null)
  const [profile, setProfile] = useState<Profile|null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'bookings'|'anketa'|'account'|'favorites'>('bookings')
  const [favorites, setFavorites] = useState<FavoriteItem[]>([])
  const [favoritesLoading, setFavoritesLoading] = useState(false)
  const [anketaTab, setAnketaTab] = useState<'info'|'services'|'albums'|'availability'>('info')
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [availability, setAvailability] = useState<AvailabilityDate[]>([])
  const [selectedAvailDate, setSelectedAvailDate] = useState<string|null>(null)
  const [availForm, setAvailForm] = useState({ isAvailable:true, timeFrom:'10:00', timeTo:'21:00', note:'' })
  const [availSaving, setAvailSaving] = useState(false)
  const [availError, setAvailError] = useState('')
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const portfolioInputRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({ displayName:'', bio:'', city:'', priceFrom:'', priceUnit:'за час' })
  const [contacts, setContacts] = useState<{platform:string;value:string;isVisible:boolean}[]>([])
  const [newService, setNewService] = useState({ category:'', title:'', description:'', price:'', priceUnit:'за мероприятие' })
  const [serviceError, setServiceError] = useState('')
  const [editingServiceId, setEditingServiceId] = useState<string|null>(null)
  const [editService, setEditService] = useState({ category:'', title:'', description:'', price:'', priceUnit:'' })
  const [newAlbumTitle, setNewAlbumTitle] = useState('')
  const [newAlbumDesc, setNewAlbumDesc] = useState('')
  const [openAlbumId, setOpenAlbumId] = useState<string|null>(null)
  const [editingAlbumId, setEditingAlbumId] = useState<string|null>(null)
  const [editAlbum, setEditAlbum] = useState({ title:'', description:'' })
  const [uploadingAlbum, setUploadingAlbum] = useState(false)
  const [editingAccount, setEditingAccount] = useState(false)
  const [accountForm, setAccountForm] = useState({ name:'', email:'', city:'', currentPassword:'', newPassword:'' })
  const [accountSaving, setAccountSaving] = useState(false)
  const [accountSuccess, setAccountSuccess] = useState('')
  const [accountError, setAccountError] = useState('')
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [selectedBooking, setSelectedBooking] = useState<Booking|null>(null)

  useEffect(() => {
    const tok=localStorage.getItem('accessToken'); const ud=localStorage.getItem('user')
    if (!tok||!ud) { router.push('/auth/login'); return }
    const u=JSON.parse(ud); setUser(u); setAccountForm(f=>({...f,name:u.name,email:u.email}))
    apiFetch(`/api/bookings`).then(r=>r.json()).then(d=>setBookings(Array.isArray(d)?d:[])).catch(console.error)
    if (u.role==='vendor') {
      apiFetch(`/api/profile/me`).then(r=>r.json()).then(p=>{
        setProfile(p); setForm({displayName:p.displayName||'',bio:p.bio||'',city:p.city||'',priceFrom:p.priceFrom||'',priceUnit:p.priceUnit||'за час'}); setContacts(p.contacts||[])
      }).catch(console.error)
      apiFetch(`/api/profile/availability`).then(r=>r.json()).then(d=>{
        if (Array.isArray(d)) setAvailability(d)
      }).catch(console.error)
    } else {
      setFavoritesLoading(true)
      apiFetch(`/api/favorites`).then(r=>r.json()).then(d=>setFavorites(Array.isArray(d)?d:[])).catch(console.error).finally(()=>setFavoritesLoading(false))
      apiFetch(`/api/auth/me`).then(r=>r.json()).then(me=>{
        setAccountForm(f=>({...f,city:me.city||''}))
      }).catch(console.error)
    }
    setLoading(false)
  },[])

  const handleRemoveFavorite = async (profileId:string) => {
    setFavorites(prev => prev.filter(f => f.profile.id !== profileId))
    try { await apiFetch(`/api/favorites/${profileId}`,{method:'DELETE'}) } catch {}
  }

  const handleLogout = () => { localStorage.removeItem('accessToken'); localStorage.removeItem('user'); window.dispatchEvent(new Event('auth-changed')); router.push('/') }

  const handleSaveProfile = async () => {
    setSaving(true)
    try { await apiFetch(`/api/profile/me`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({...form,contacts})}); setSaveSuccess(true); setTimeout(()=>setSaveSuccess(false),3000) }
    catch(e){console.error(e)} finally{setSaving(false)}
  }
  const handleSelectAvailDate = (dateStr:string) => {
    setSelectedAvailDate(dateStr)
    setAvailError('')
    const existing = availability.find(a=>a.date===dateStr)
    setAvailForm(existing
      ? { isAvailable:existing.isAvailable, timeFrom:existing.timeFrom||'10:00', timeTo:existing.timeTo||'21:00', note:existing.note||'' }
      : { isAvailable:true, timeFrom:'10:00', timeTo:'21:00', note:'' })
  }
  const handleSaveAvailDate = async () => {
    if (!selectedAvailDate) return
    setAvailSaving(true); setAvailError('')
    try {
      const res = await apiFetch(`/api/profile/availability/${selectedAvailDate}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(availForm)})
      if (!res.ok) { setAvailError('Не удалось сохранить'); return }
      const data = await res.json()
      setAvailability(prev=>[...prev.filter(a=>a.date!==selectedAvailDate), data].sort((a,b)=>a.date.localeCompare(b.date)))
    } catch { setAvailError('Ошибка соединения') } finally { setAvailSaving(false) }
  }
  const handleDeleteAvailDate = async () => {
    if (!selectedAvailDate) return
    try {
      await apiFetch(`/api/profile/availability/${selectedAvailDate}`,{method:'DELETE'})
      setAvailability(prev=>prev.filter(a=>a.date!==selectedAvailDate))
      setSelectedAvailDate(null)
    } catch(e){console.error(e)}
  }
  const handleAvatarUpload = async (file:File) => {
    const fd=new FormData(); fd.append('file',file)
    const res=await apiFetch(`/api/profile/avatar`,{method:'POST',body:fd})
    if (res.ok){
      const d=await res.json()
      setProfile(p=>p?{...p,avatarUrl:d.avatarUrl}:p)
      // Обновляем аватар и в шапке сайта — иначе там останется старое фото (или буква) до следующего логина
      const updatedUser={...user!,avatar:d.avatarUrl}
      setUser(updatedUser)
      localStorage.setItem('user',JSON.stringify(updatedUser))
      window.dispatchEvent(new Event('auth-changed'))
    }
  }
  const handlePortfolioUpload = async (files:FileList) => {
    for (const file of Array.from(files)){const fd=new FormData();fd.append('file',file);const res=await apiFetch(`/api/profile/portfolio`,{method:'POST',body:fd});if(res.ok){const d=await res.json();setProfile(p=>p?{...p,portfolio:[...(p.portfolio||[]),d]}:p)}}
  }
  const handleDeletePortfolio = async (id:string) => { await apiFetch(`/api/profile/portfolio/${id}`,{method:'DELETE'}); setProfile(p=>p?{...p,portfolio:p.portfolio.filter(i=>i.id!==id)}:p) }
  const handleAddService = async () => {
    if (!newService.category||!newService.title||!newService.price){setServiceError('Заполните категорию, название и цену');return}
    setServiceError('')
    const res=await apiFetch(`/api/profile/services`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...newService,price:Number(newService.price)})})
    if(res.ok){const d=await res.json();setProfile(p=>p?{...p,services:[...(p.services||[]),d]}:p);setNewService({category:'',title:'',description:'',price:'',priceUnit:'за мероприятие'})}
  }
  const handleUpdateService = async (id:string) => {
    const res=await apiFetch(`/api/profile/services/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({...editService,price:Number(editService.price)})})
    if(res.ok){const u=await res.json();setProfile(p=>p?{...p,services:p.services.map(s=>s.id===id?u:s)}:p);setEditingServiceId(null)}
  }
  const handleDeleteService = async (id:string) => { await apiFetch(`/api/profile/services/${id}`,{method:'DELETE'}); setProfile(p=>p?{...p,services:p.services.filter(s=>s.id!==id)}:p) }
  const handleCreateAlbum = async () => {
    if (!newAlbumTitle) return
    const res=await apiFetch(`/api/profile/albums`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:newAlbumTitle,description:newAlbumDesc||undefined})})
    if(res.ok){const d=await res.json();setProfile(p=>p?{...p,albums:[...(p.albums||[]),{...d,photos:[]}]}:p);setNewAlbumTitle('');setNewAlbumDesc('')}
  }
  const handleUpdateAlbum = async (id:string) => {
    const res=await apiFetch(`/api/profile/albums/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:editAlbum.title,description:editAlbum.description||undefined})})
    if(res.ok){setProfile(p=>p?{...p,albums:p.albums.map(a=>a.id===id?{...a,...editAlbum}:a)}:p);setEditingAlbumId(null)}
  }
  const handleDeleteAlbum = async (id:string) => { await apiFetch(`/api/profile/albums/${id}`,{method:'DELETE'}); setProfile(p=>p?{...p,albums:p.albums.filter(a=>a.id!==id)}:p); if(openAlbumId===id)setOpenAlbumId(null) }
  const handleUploadAlbumPhoto = async (albumId:string,files:FileList) => {
    setUploadingAlbum(true)
    for (const file of Array.from(files)){const fd=new FormData();fd.append('file',file);const res=await apiFetch(`/api/profile/albums/${albumId}/photos`,{method:'POST',body:fd});if(res.ok){const ph=await res.json();setProfile(p=>p?{...p,albums:p.albums.map(a=>a.id===albumId?{...a,photos:[...a.photos,ph],coverUrl:a.coverUrl||ph.mediaUrl}:a)}:p)}}
    setUploadingAlbum(false)
  }
  const handleDeleteAlbumPhoto = async (albumId:string,photoId:string) => { await apiFetch(`/api/profile/albums/${albumId}/photos/${photoId}`,{method:'DELETE'}); setProfile(p=>p?{...p,albums:p.albums.map(a=>a.id===albumId?{...a,photos:a.photos.filter(ph=>ph.id!==photoId)}:a)}:p) }
  const handleSaveAccount = async () => {
    setAccountSaving(true);setAccountError('');setAccountSuccess('')
    try {
      const body:any={name:accountForm.name,city:accountForm.city}
      if(accountForm.newPassword){if(!accountForm.currentPassword){setAccountError('Введите текущий пароль');setAccountSaving(false);return};body.currentPassword=accountForm.currentPassword;body.newPassword=accountForm.newPassword}
      const res=await apiFetch(`/api/auth/update`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
      if(!res.ok){const d=await res.json();setAccountError(d.error||'Ошибка');return}
      const updatedUser={...user!,name:accountForm.name};setUser(updatedUser);localStorage.setItem('user',JSON.stringify(updatedUser))
      setAccountSuccess('Данные сохранены!');setAccountForm(f=>({...f,currentPassword:'',newPassword:''}));setEditingAccount(false);setTimeout(()=>setAccountSuccess(''),3000)
    } catch{setAccountError('Ошибка соединения')} finally{setAccountSaving(false)}
  }
  const handleDeleteAccount = async () => {
    if(!deletePassword){setDeleteError('Введите пароль для подтверждения');return}
    setDeleteLoading(true);setDeleteError('')
    try {
      const res=await apiFetch(`/api/auth/me`,{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:deletePassword})})
      const data=await res.json()
      if(!res.ok){setDeleteError(typeof data.error==='string'?data.error:'Не удалось удалить аккаунт');return}
      localStorage.removeItem('accessToken');localStorage.removeItem('user')
      window.dispatchEvent(new Event('auth-changed'))
      router.push('/')
    } catch{setDeleteError('Не удалось подключиться к серверу')} finally{setDeleteLoading(false)}
  }

  const addContact = () => setContacts(c=>[...c,{platform:'phone',value:'',isVisible:true}])
  const removeContact = (i:number) => setContacts(c=>c.filter((_,idx)=>idx!==i))

  if (!user) return null

  const primaryCat = profile?.profileCategories?.find(pc=>pc.isPrimary)?.category||profile?.profileCategories?.[0]?.category
  const unavailableDatesSet = new Set(availability.filter(a=>!a.isAvailable).map(a=>a.date))
  const tabs = user.role==='vendor'
    ? [{key:'bookings',label:'Заявки'},{key:'anketa',label:'Анкета'},{key:'account',label:'Аккаунт'}]
    : [{key:'bookings',label:'Мои брони'},{key:'favorites',label:'Избранное'},{key:'account',label:'Аккаунт'}]
  const openAlbum = profile?.albums?.find(a=>a.id===openAlbumId)
  const svcByCat = (profile?.services||[]).reduce((acc,s)=>{if(!acc[s.category])acc[s.category]=[];acc[s.category].push(s);return acc},{} as Record<string,Service[]>)

  const Card = ({children,style}:{children:React.ReactNode;style?:React.CSSProperties}) => (
    <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:20,padding:'clamp(16px,3vw,24px)',boxShadow:'0 4px 24px rgba(21,15,46,0.06)',...style}}>{children}</div>
  )

  const initialOf = (name?: string | null) => (name?.trim()?.[0] || '?').toUpperCase()
  const AVATAR_BG = 'linear-gradient(135deg, #8B3DFF 0%, #E93D8A 100%)'

  const Label = ({children}:{children:React.ReactNode}) => (
    <label style={{display:'block',color:MUTED,fontSize:11,fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase' as const,marginBottom:8}}>{children}</label>
  )

  return (
    <>
      <Header />

      {/* Booking detail modal */}
      {selectedBooking && (
        <div style={{position:'fixed',inset:0,zIndex:50,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.75)',padding:'16px'}} onClick={()=>setSelectedBooking(null)}>
          <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:24,padding:24,width:'100%',maxWidth:440,maxHeight:'90vh',overflowY:'auto',boxShadow:'0 20px 60px rgba(21,15,46,0.25)'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
              <h2 style={{fontWeight:800,fontSize:18,color:TEXT}}>Детали заявки</h2>
              <button onClick={()=>setSelectedBooking(null)} style={{width:32,height:32,borderRadius:'50%',background:'rgba(21,15,46,0.06)',border:`1px solid ${BORDER}`,color:MUTED,cursor:'pointer',fontSize:16}}>✕</button>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
              {(()=>{const s=STATUS[selectedBooking.status]||STATUS.pending;return <span style={{fontSize:12,fontWeight:700,padding:'5px 12px',borderRadius:50,background:s.bg,color:s.color}}>{s.label}</span>})()}
              <span style={{color:MUTED,fontSize:14}}>📅 {new Date(selectedBooking.eventDate).toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'})}</span>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {[
                user.role==='vendor'&&selectedBooking.client ? ['Заказчик', selectedBooking.client.profile?.displayName||selectedBooking.client.email] : null,
                user.role==='client'&&selectedBooking.profile ? ['Исполнитель', selectedBooking.profile.displayName] : null,
                (selectedBooking.eventTimeFrom||selectedBooking.eventTimeTo) ? ['Время', selectedBooking.eventTimeFrom&&selectedBooking.eventTimeTo?`${selectedBooking.eventTimeFrom} — ${selectedBooking.eventTimeTo}`:selectedBooking.eventTimeFrom||selectedBooking.eventTimeTo] : null,
                selectedBooking.eventType ? ['Тип мероприятия', selectedBooking.eventType] : null,
                selectedBooking.guestsCount ? ['Количество гостей', `${selectedBooking.guestsCount} человек`] : null,
                selectedBooking.ageCategory ? ['Аудитория', selectedBooking.ageCategory] : null,
                selectedBooking.duration ? ['Продолжительность', `${selectedBooking.duration} ч.`] : null,
                selectedBooking.location ? ['Место проведения', selectedBooking.location] : null,
                selectedBooking.budget ? ['Бюджет', `${Number(selectedBooking.budget).toLocaleString('ru-RU')} ₽`] : null,
                selectedBooking.notes ? ['Комментарий', selectedBooking.notes] : null,
              ].filter((row): row is [string, string] => Boolean(row)).map(([label,val])=>(
                <div key={label as string} style={{background:'rgba(21,15,46,0.03)',border:`1px solid ${BORDER}`,borderRadius:12,padding:'10px 14px'}}>
                  <p style={{fontSize:10,fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',color:MUTED,marginBottom:4}}>{label as string}</p>
                  <p style={{fontWeight:600,color:TEXT,fontSize:14}}>{val as string}</p>
                </div>
              ))}
              <div style={{background:`${ACCENT}12`,border:`1px solid ${ACCENT}30`,borderRadius:12,padding:'10px 14px'}}>
                <p style={{fontSize:10,fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',color:ACCENT,marginBottom:4}}>Сумма</p>
                <p style={{fontWeight:800,fontSize:20,color:TEXT}}>{Number(selectedBooking.total).toLocaleString('ru-RU')} ₽</p>
              </div>
            </div>
            {user.role==='vendor'&&(selectedBooking.status==='pending'||selectedBooking.status==='confirmed')&&(
              <div style={{display:'flex',gap:10,marginTop:20}}>
                {selectedBooking.status==='pending'&&(
                  <button onClick={()=>{updateBookingStatus(selectedBooking.id,'confirmed');setSelectedBooking(b=>b?{...b,status:'confirmed'}:null)}}
                    style={{flex:1,padding:'12px',borderRadius:14,fontSize:14,fontWeight:700,background:ACCENT,color:'#FFFFFF',border:'none',cursor:'pointer'}}>Принять</button>
                )}
                <button onClick={()=>{updateBookingStatus(selectedBooking.id,'cancelled');setSelectedBooking(b=>b?{...b,status:'cancelled'}:null)}}
                  style={{flex:1,padding:'12px',borderRadius:14,fontSize:14,fontWeight:600,background:'transparent',border:`1px solid ${BORDER}`,color:MUTED,cursor:'pointer'}}>
                  {selectedBooking.status==='pending'?'Отклонить':'Отменить'}
                </button>
              </div>
            )}
            {user.role==='client'&&selectedBooking.status==='pending'&&(
              <button onClick={()=>{updateBookingStatus(selectedBooking.id,'cancelled');setSelectedBooking(b=>b?{...b,status:'cancelled'}:null)}}
                style={{width:'100%',marginTop:20,padding:'12px',borderRadius:14,fontSize:14,fontWeight:600,background:'rgba(248,113,113,0.1)',border:'1px solid rgba(248,113,113,0.3)',color:'#F87171',cursor:'pointer'}}>
                Отменить заявку
              </button>
            )}
            {selectedBooking.status!=='pending'&&selectedBooking.status!=='cancelled'&&(
              <Link href={selectedBooking.eventId?`/events/${selectedBooking.eventId}`:`/messages?booking=${selectedBooking.id}`}
                style={{display:'block',width:'100%',marginTop:12,padding:'12px',borderRadius:14,fontSize:14,fontWeight:700,background:ACCENT,color:'#FFFFFF',border:'none',cursor:'pointer',textAlign:'center',textDecoration:'none',boxSizing:'border-box'}}>
                💬 Открыть чат
              </Link>
            )}
            {selectedBooking.eventId&&(
              <Link href={`/events/${selectedBooking.eventId}`}
                style={{display:'block',width:'100%',marginTop:10,padding:'11px',borderRadius:14,fontSize:13,fontWeight:600,background:'transparent',border:`1px solid ${BORDER}`,color:MUTED,cursor:'pointer',textAlign:'center',textDecoration:'none',boxSizing:'border-box'}}>
                🎪 Перейти к мероприятию
              </Link>
            )}
            {['cancelled','completed','refunded'].includes(selectedBooking.status)&&(
              <button onClick={()=>handleDeleteBooking(selectedBooking.id)}
                style={{width:'100%',marginTop:10,padding:'11px',borderRadius:14,fontSize:13,fontWeight:600,background:'transparent',border:'1px solid rgba(248,113,113,0.3)',color:'#F87171',cursor:'pointer'}}>
                🗑 Удалить бронь
              </button>
            )}
          </div>
        </div>
      )}

      <main style={{background:BG,minHeight:'100vh'}}>
        <div style={{maxWidth:1280,margin:'0 auto',padding:'clamp(16px,4vw,32px) clamp(16px,4vw,40px)'}}>

          {/* Header */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24,flexWrap:'wrap',gap:12}}>
            <div style={{display:'flex',alignItems:'center',gap:14}}>
              <div style={{width:52,height:52,borderRadius:'50%',overflow:'hidden',background:ACCENT,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,fontWeight:700,color:'#FFFFFF',cursor:'pointer',flexShrink:0,position:'relative'}}
                onClick={()=>avatarInputRef.current?.click()}>
                {(profile?.avatarUrl||user.avatar)?<img src={profile?.avatarUrl||user.avatar||''} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:(user.name?.[0]||'?').toUpperCase()}
              </div>
              <input ref={avatarInputRef} type="file" accept="image/*" style={{display:'none'}} onChange={e=>e.target.files?.[0]&&handleAvatarUpload(e.target.files[0])} />
              <div style={{minWidth:0}}>
                <h1 style={{fontWeight:800,fontSize:'clamp(18px,3vw,24px)',color:TEXT,letterSpacing:'-0.02em',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user.name}</h1>
                <p style={{color:MUTED,fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                  {primaryCat?`${primaryCat.icon||''} ${primaryCat.name}`:user.role==='vendor'?'🎤 Исполнитель':'🎉 Организатор'}
                  {' · '}{user.email}
                </p>
              </div>
            </div>
          </div>

          {/* Main tabs */}
          <div style={{display:'flex',gap:4,background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,padding:4,marginBottom:24}}>
            {tabs.map(tab=>(
              <button key={tab.key} onClick={()=>setActiveTab(tab.key as any)}
                style={{flex:1,padding:'10px',borderRadius:12,fontSize:14,fontWeight:600,border:'none',cursor:'pointer',transition:'all 0.2s',background:activeTab===tab.key?ACCENT:'transparent',color:activeTab===tab.key?'#FFFFFF':MUTED}}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── BOOKINGS ── */}
          {activeTab==='bookings'&&(
            <div>
              {loading?(
                <div style={{display:'flex',flexDirection:'column',gap:12}}>
                  {[1,2,3].map(i=><div key={i} style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,padding:20,height:80}}/>)}
                </div>
              ):bookings.length===0?(
                <Card>
                  <div style={{textAlign:'center',padding:'40px 0'}}>
                    <p style={{fontSize:40,marginBottom:12}}>📋</p>
                    <p style={{fontWeight:700,fontSize:17,color:TEXT,marginBottom:6}}>{user.role==='vendor'?'Заявок пока нет':'Броней пока нет'}</p>
                    <p style={{color:MUTED,fontSize:14,marginBottom:user.role==='client'?20:0}}>{user.role==='vendor'?'Когда клиенты начнут бронировать — заявки появятся здесь':'Найдите исполнителя и отправьте заявку'}</p>
                    {user.role==='client'&&<Link href="/catalog" style={{display:'inline-block',background:ACCENT,color:'#FFFFFF',fontWeight:700,padding:'12px 28px',borderRadius:50,textDecoration:'none',fontSize:14}}>Найти исполнителя</Link>}
                  </div>
                </Card>
              ):(
                <div style={{display:'flex',gap:20,alignItems:'flex-start',flexWrap:'wrap'}}>
                  {user.role==='vendor'&&(
                    <div style={{width:280,flexShrink:0}} className="calendar-col">
                      <VendorCalendar bookings={bookings} unavailableDates={unavailableDatesSet} onSelectBooking={setSelectedBooking}/>
                    </div>
                  )}
                  <div style={{flex:1,minWidth:280,display:'flex',flexDirection:'column',gap:12}}>
                    {bookings.map(booking=>{
                      const s=STATUS[booking.status]||STATUS.pending
                      const date=new Date(booking.eventDate).toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'})
                      return (
                        <div key={booking.id} style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,padding:'clamp(14px,3vw,20px)',cursor:'pointer',transition:'border-color 0.2s, box-shadow 0.2s',boxShadow:'0 2px 12px rgba(21,15,46,0.05)'}}
                          onClick={()=>setSelectedBooking(booking)}
                          onMouseEnter={e=>{const el=e.currentTarget as HTMLElement; el.style.borderColor=`${ACCENT}44`; el.style.boxShadow='0 6px 20px rgba(21,15,46,0.1)'}}
                          onMouseLeave={e=>{const el=e.currentTarget as HTMLElement; el.style.borderColor=BORDER; el.style.boxShadow='0 2px 12px rgba(21,15,46,0.05)'}}>
                          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12}}>
                            <div style={{display:'flex',alignItems:'flex-start',gap:12,flex:1,minWidth:0}}>
                              {(()=>{
                                const otherName = user.role==='client' ? booking.profile?.displayName : (booking.client?.profile?.displayName||booking.client?.email)
                                return (
                                  <span style={{width:36,height:36,borderRadius:'50%',background:AVATAR_BG,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:700,color:'#FFFFFF',flexShrink:0}}>
                                    {initialOf(otherName)}
                                  </span>
                                )
                              })()}
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{display:'flex',flexWrap:'wrap',alignItems:'center',gap:8,marginBottom:8}}>
                                  <span style={{fontSize:11,fontWeight:700,padding:'4px 10px',borderRadius:50,background:s.bg,color:s.color}}>{s.label}</span>
                                  <span style={{color:MUTED,fontSize:13}}>📅 {date}</span>
                                  {booking.eventId&&(
                                    <Link href={`/events/${booking.eventId}`} onClick={e=>e.stopPropagation()}
                                      style={{fontSize:11,fontWeight:700,padding:'4px 10px',borderRadius:50,background:'rgba(124,58,237,0.1)',color:ACCENT,textDecoration:'none'}}>
                                      🎪 Мероприятие
                                    </Link>
                                  )}
                                </div>
                                {user.role==='client'&&booking.profile&&<p style={{fontWeight:700,fontSize:15,color:TEXT}}>{booking.profile.displayName}</p>}
                                {user.role==='vendor'&&booking.client&&<p style={{fontWeight:700,fontSize:15,color:TEXT}}>{booking.client.profile?.displayName||booking.client.email}</p>}
                                {booking.eventType&&<p style={{color:MUTED,fontSize:13,marginTop:2}}>🎉 {booking.eventType}</p>}
                                {(booking.eventTimeFrom||booking.eventTimeTo)&&(
                                  <p style={{color:MUTED,fontSize:13,marginTop:2}}>🕐 {booking.eventTimeFrom&&booking.eventTimeTo?`${booking.eventTimeFrom}–${booking.eventTimeTo}`:booking.eventTimeFrom||booking.eventTimeTo}</p>
                                )}
                                <p style={{color:ACCENT,fontSize:12,marginTop:6,fontWeight:500}}>Нажмите для деталей →</p>
                              </div>
                            </div>
                            <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:8,flexShrink:0}}>
                              <p style={{fontWeight:800,fontSize:16,color:TEXT}}>{Number(booking.total).toLocaleString('ru-RU')} ₽</p>
                              {['cancelled','completed','refunded'].includes(booking.status)&&(
                                <button onClick={e=>{e.stopPropagation();handleDeleteBooking(booking.id)}} title="Удалить бронь"
                                  style={{background:'none',border:'none',cursor:'pointer',color:MUTED,fontSize:15,padding:2}}>
                                  🗑
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── ANKETA ── */}
          {activeTab==='anketa'&&user.role==='vendor'&&(
            <div>
              <div style={{display:'flex',gap:4,background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,padding:4,marginBottom:20}}>
                {[{key:'info',label:'👤 Основное'},{key:'services',label:'📋 Услуги'},{key:'albums',label:'📁 Альбомы'},{key:'availability',label:'🕐 Доступность'}].map(t=>(
                  <button key={t.key} onClick={()=>setAnketaTab(t.key as any)}
                    style={{flex:1,padding:'9px',borderRadius:12,fontSize:13,fontWeight:600,border:'none',cursor:'pointer',background:anketaTab===t.key?ACCENT:'transparent',color:anketaTab===t.key?'#FFFFFF':MUTED}}>
                    {t.label}
                  </button>
                ))}
              </div>
              {profile&&(
                <Link href={`/catalog/${profile.id}`} style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,color:ACCENT,fontSize:14,fontWeight:600,padding:'10px',borderRadius:14,background:`${ACCENT}10`,border:`1px solid ${ACCENT}25`,textDecoration:'none',marginBottom:20}}>
                  Посмотреть мой профиль →
                </Link>
              )}

              {anketaTab==='info'&&(
                <div style={{display:'flex',flexDirection:'column',gap:16}}>
                  <Card>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
                      <h2 style={{fontWeight:700,fontSize:16,color:TEXT}}>Главные фото</h2>
                      <button onClick={()=>portfolioInputRef.current?.click()} style={{fontSize:13,color:ACCENT,fontWeight:600,background:'none',border:'none',cursor:'pointer'}}>+ Добавить</button>
                      <input ref={portfolioInputRef} type="file" accept="image/*,video/*" multiple style={{display:'none'}} onChange={e=>e.target.files&&handlePortfolioUpload(e.target.files)}/>
                    </div>
                    <p style={{color:MUTED,fontSize:13,marginBottom:16}}>Загрузите 3–5 лучших работ</p>
                    {profile?.portfolio&&profile.portfolio.length>0?(
                      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))',gap:10}}>
                        {profile.portfolio.map(item=>(
                          <div key={item.id} style={{position:'relative',borderRadius:12,overflow:'hidden',aspectRatio:'1',background:'rgba(21,15,46,0.04)'}}>
                            <img src={item.mediaUrl} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                            <button onClick={()=>handleDeletePortfolio(item.id)} style={{position:'absolute',top:6,right:6,width:22,height:22,background:'rgba(0,0,0,0.7)',border:'none',borderRadius:'50%',color:'white',cursor:'pointer',fontSize:11}}>✕</button>
                          </div>
                        ))}
                        {profile.portfolio.length<5&&(
                          <button onClick={()=>portfolioInputRef.current?.click()} style={{aspectRatio:'1',borderRadius:12,border:`2px dashed ${BORDER}`,background:'transparent',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',color:MUTED,cursor:'pointer',fontSize:22}}>+</button>
                        )}
                      </div>
                    ):(
                      <button onClick={()=>portfolioInputRef.current?.click()} style={{width:'100%',padding:'32px 0',borderRadius:14,border:`2px dashed ${BORDER}`,background:'transparent',display:'flex',flexDirection:'column',alignItems:'center',gap:8,color:MUTED,cursor:'pointer'}}>
                        <span style={{fontSize:28}}>📷</span><span style={{fontSize:13,fontWeight:500}}>Загрузить фото</span>
                      </button>
                    )}
                  </Card>

                  <Card>
                    <h2 style={{fontWeight:700,fontSize:16,color:TEXT,marginBottom:16}}>Основная информация</h2>
                    <div style={{display:'flex',flexDirection:'column',gap:14}}>
                      {[['Имя и фамилия','displayName','text','Данил Иванов'],['Город','city','text','Москва']].map(([label,key,type,ph])=>(
                        <div key={key as string}>
                          <Label>{label}</Label>
                          <input type={type as string} placeholder={ph as string} value={form[key as keyof typeof form]} onChange={e=>setForm(f=>({...f,[key as string]:e.target.value}))} style={inp}
                            onFocus={e=>e.target.style.borderColor=ACCENT} onBlur={e=>e.target.style.borderColor=BORDER}/>
                        </div>
                      ))}
                      <div><Label>О себе</Label><textarea rows={4} value={form.bio} onChange={e=>setForm(f=>({...f,bio:e.target.value}))} style={{...inp,resize:'none'}}/></div>
                      <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
                        <div style={{flex:1,minWidth:120}}><Label>Цена от (₽)</Label><input type="number" min={0} value={form.priceFrom} onChange={e=>setForm(f=>({...f,priceFrom:e.target.value}))} style={inp} onFocus={e=>e.target.style.borderColor=ACCENT} onBlur={e=>e.target.style.borderColor=BORDER}/></div>
                        <div style={{flex:1,minWidth:120}}><Label>Единица</Label><select value={form.priceUnit} onChange={e=>setForm(f=>({...f,priceUnit:e.target.value}))} style={inp}>{PRICE_UNITS.map(u=><option key={u}>{u}</option>)}</select></div>
                      </div>
                    </div>
                  </Card>

                  <Card>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
                      <h2 style={{fontWeight:700,fontSize:16,color:TEXT}}>Контакты</h2>
                      <button onClick={addContact} style={{fontSize:13,color:ACCENT,fontWeight:600,background:'none',border:'none',cursor:'pointer'}}>+ Добавить</button>
                    </div>
                    {contacts.length===0?<p style={{color:MUTED,fontSize:13}}>Добавьте контакты чтобы клиенты могли связаться с вами</p>:(
                      <div style={{display:'flex',flexDirection:'column',gap:10}}>
                        {contacts.map((c,i)=>(
                          <div key={i} style={{display:'flex',gap:8,alignItems:'center'}}>
                            <select value={c.platform} onChange={e=>setContacts(cs=>cs.map((x,idx)=>idx===i?{...x,platform:e.target.value}:x))} style={{...inp,width:110,flexShrink:0}}>{PLATFORMS.map(p=><option key={p.value} value={p.value}>{p.label}</option>)}</select>
                            <input type="text" placeholder={PLATFORMS.find(p=>p.value===c.platform)?.placeholder||''} value={c.value} onChange={e=>setContacts(cs=>cs.map((x,idx)=>idx===i?{...x,value:e.target.value}:x))} style={{...inp,flex:1}} onFocus={e=>e.target.style.borderColor=ACCENT} onBlur={e=>e.target.style.borderColor=BORDER}/>
                            <button onClick={()=>removeContact(i)} style={{color:MUTED,background:'none',border:'none',cursor:'pointer',fontSize:18,flexShrink:0}}>✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>

                  <div style={{display:'flex',alignItems:'center',gap:14}}>
                    <button onClick={handleSaveProfile} disabled={saving} style={{background:ACCENT,color:'#FFFFFF',fontWeight:700,padding:'13px 32px',borderRadius:14,border:'none',cursor:saving?'not-allowed':'pointer',fontSize:15,opacity:saving?0.6:1}}>
                      {saving?'Сохраняем...':'Сохранить изменения'}
                    </button>
                    {saveSuccess&&<span style={{color:'#34D399',fontWeight:600,fontSize:14}}>✓ Сохранено!</span>}
                  </div>
                </div>
              )}

              {anketaTab==='services'&&(
                <div style={{display:'flex',flexDirection:'column',gap:16}}>
                  <Card>
                    <h2 style={{fontWeight:700,fontSize:16,color:TEXT,marginBottom:16}}>Добавить услугу</h2>
                    <div style={{display:'flex',flexDirection:'column',gap:12}}>
                      {[['Категория мероприятия','category','Свадьбы, Выпускные...'],['Название пакета','title','Ведущий 6 часов...']].map(([label,key,ph])=>(
                        <div key={key as string}><Label>{label}</Label><input type="text" placeholder={ph as string} value={newService[key as keyof typeof newService]} onChange={e=>setNewService(s=>({...s,[key as string]:e.target.value}))} style={inp} onFocus={e=>e.target.style.borderColor=ACCENT} onBlur={e=>e.target.style.borderColor=BORDER}/></div>
                      ))}
                      <div><Label>Что входит</Label><textarea rows={3} placeholder="Опишите что включено..." value={newService.description} onChange={e=>setNewService(s=>({...s,description:e.target.value}))} style={{...inp,resize:'none'}}/></div>
                      <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
                        <div style={{flex:1,minWidth:120}}><Label>Цена от (₽)</Label><input type="number" min={0} placeholder="50000" value={newService.price} onChange={e=>setNewService(s=>({...s,price:e.target.value}))} style={inp} onFocus={e=>e.target.style.borderColor=ACCENT} onBlur={e=>e.target.style.borderColor=BORDER}/></div>
                        <div style={{flex:1,minWidth:120}}><Label>Единица</Label><select value={newService.priceUnit} onChange={e=>setNewService(s=>({...s,priceUnit:e.target.value}))} style={inp}>{PRICE_UNITS.map(u=><option key={u}>{u}</option>)}</select></div>
                      </div>
                      {serviceError&&<p style={{color:'#F87171',fontSize:13}}>{serviceError}</p>}
                      <button onClick={handleAddService} style={{background:ACCENT,color:'#FFFFFF',fontWeight:700,padding:'12px',borderRadius:14,border:'none',cursor:'pointer',fontSize:14}}>+ Добавить услугу</button>
                    </div>
                  </Card>
                  {Object.keys(svcByCat).length===0?(
                    <Card><div style={{textAlign:'center',padding:'24px 0',color:MUTED}}><p style={{fontSize:28,marginBottom:8}}>📋</p><p style={{fontWeight:500}}>Услуги пока не добавлены</p></div></Card>
                  ):Object.entries(svcByCat).map(([cat,items])=>(
                    <div key={cat} style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:20,overflow:'hidden'}}>
                      <div style={{padding:'14px 20px',background:'rgba(21,15,46,0.02)',borderBottom:`1px solid ${BORDER}`}}>
                        <h3 style={{fontWeight:700,fontSize:15,color:TEXT}}>{cat}</h3>
                      </div>
                      {items.map(service=>(
                        editingServiceId===service.id?(
                          <div key={service.id} style={{padding:16,display:'flex',flexDirection:'column',gap:10,borderBottom:`1px solid ${BORDER}`}}>
                            {[['category','Категория'],['title','Название'],['description','Описание'],['price','Цена']].map(([k,ph])=>(
                              <input key={k} placeholder={ph} value={editService[k as keyof typeof editService]} onChange={e=>setEditService(s=>({...s,[k]:e.target.value}))} style={inp} type={k==='price'?'number':'text'} onFocus={e=>e.target.style.borderColor=ACCENT} onBlur={e=>e.target.style.borderColor=BORDER}/>
                            ))}
                            <div style={{display:'flex',gap:10}}>
                              <button onClick={()=>handleUpdateService(service.id)} style={{flex:1,background:ACCENT,color:'#FFFFFF',fontWeight:700,padding:'10px',borderRadius:12,border:'none',cursor:'pointer',fontSize:13}}>Сохранить</button>
                              <button onClick={()=>setEditingServiceId(null)} style={{flex:1,background:'transparent',border:`1px solid ${BORDER}`,color:MUTED,padding:'10px',borderRadius:12,cursor:'pointer',fontSize:13}}>Отмена</button>
                            </div>
                          </div>
                        ):(
                          <div key={service.id} style={{padding:'14px 20px',borderBottom:`1px solid ${BORDER}`,display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12}}>
                            <div style={{flex:1,minWidth:0}}>
                              <p style={{fontWeight:600,fontSize:14,color:TEXT,marginBottom:2}}>{service.title}</p>
                              {service.description&&<p style={{color:MUTED,fontSize:12,lineHeight:1.6}}>{service.description}</p>}
                            </div>
                            <div style={{textAlign:'right',flexShrink:0,display:'flex',alignItems:'flex-start',gap:10}}>
                              <div>
                                <p style={{fontWeight:700,fontSize:14,color:TEXT}}>от {Number(service.price).toLocaleString('ru-RU')} ₽</p>
                                {service.priceUnit&&<p style={{color:MUTED,fontSize:11}}>{service.priceUnit}</p>}
                              </div>
                              <button onClick={()=>{setEditingServiceId(service.id);setEditService({category:service.category,title:service.title,description:service.description||'',price:service.price,priceUnit:service.priceUnit||'за мероприятие'})}} style={{background:'none',border:'none',cursor:'pointer',color:MUTED,fontSize:14}}>✏️</button>
                              <button onClick={()=>handleDeleteService(service.id)} style={{background:'none',border:'none',cursor:'pointer',color:MUTED,fontSize:16}}>✕</button>
                            </div>
                          </div>
                        )
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {anketaTab==='albums'&&(
                <div style={{display:'flex',flexDirection:'column',gap:16}}>
                  {!openAlbumId&&(
                    <Card>
                      <h2 style={{fontWeight:700,fontSize:16,color:TEXT,marginBottom:16}}>Создать альбом</h2>
                      <div style={{display:'flex',flexDirection:'column',gap:12}}>
                        <input type="text" placeholder="Название (напр. Свадьба Андрей и Мария)" value={newAlbumTitle} onChange={e=>setNewAlbumTitle(e.target.value)} style={inp} onFocus={e=>e.target.style.borderColor=ACCENT} onBlur={e=>e.target.style.borderColor=BORDER}/>
                        <input type="text" placeholder="Описание (необязательно)" value={newAlbumDesc} onChange={e=>setNewAlbumDesc(e.target.value)} style={inp} onFocus={e=>e.target.style.borderColor=ACCENT} onBlur={e=>e.target.style.borderColor=BORDER}/>
                        <button onClick={handleCreateAlbum} disabled={!newAlbumTitle} style={{background:ACCENT,color:'#FFFFFF',fontWeight:700,padding:'12px',borderRadius:14,border:'none',cursor:newAlbumTitle?'pointer':'not-allowed',fontSize:14,opacity:newAlbumTitle?1:0.5}}>+ Создать альбом</button>
                      </div>
                    </Card>
                  )}
                  {!openAlbumId?(
                    !profile?.albums||profile.albums.length===0?(
                      <Card><div style={{textAlign:'center',padding:'24px 0',color:MUTED}}><p style={{fontSize:28,marginBottom:8}}>📁</p><p style={{fontWeight:500}}>Альбомов пока нет</p></div></Card>
                    ):(
                      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:12}}>
                        {profile.albums.map(album=>(
                          <div key={album.id} style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,overflow:'hidden'}}>
                            {editingAlbumId===album.id?(
                              <div style={{padding:12,display:'flex',flexDirection:'column',gap:8}}>
                                <input value={editAlbum.title} onChange={e=>setEditAlbum(a=>({...a,title:e.target.value}))} style={{...inp,fontSize:13}} onFocus={e=>e.target.style.borderColor=ACCENT} onBlur={e=>e.target.style.borderColor=BORDER}/>
                                <input value={editAlbum.description} onChange={e=>setEditAlbum(a=>({...a,description:e.target.value}))} placeholder="Описание" style={{...inp,fontSize:13}} onFocus={e=>e.target.style.borderColor=ACCENT} onBlur={e=>e.target.style.borderColor=BORDER}/>
                                <div style={{display:'flex',gap:8}}>
                                  <button onClick={()=>handleUpdateAlbum(album.id)} style={{flex:1,background:ACCENT,color:'#FFFFFF',fontWeight:700,padding:'8px',borderRadius:10,border:'none',cursor:'pointer',fontSize:12}}>Сохранить</button>
                                  <button onClick={()=>setEditingAlbumId(null)} style={{flex:1,background:'transparent',border:`1px solid ${BORDER}`,color:MUTED,padding:'8px',borderRadius:10,cursor:'pointer',fontSize:12}}>Отмена</button>
                                </div>
                              </div>
                            ):(
                              <>
                                <button style={{width:'100%',textAlign:'left',background:'none',border:'none',cursor:'pointer',padding:0}} onClick={()=>setOpenAlbumId(album.id)}>
                                  <div style={{aspectRatio:'1',background:'rgba(21,15,46,0.04)',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center'}}>
                                    {album.coverUrl?<img src={album.coverUrl} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<span style={{fontSize:28,opacity:0.3}}>📁</span>}
                                  </div>
                                  <div style={{padding:'10px 12px'}}>
                                    <p style={{fontWeight:600,fontSize:13,color:TEXT,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{album.title}</p>
                                    <p style={{color:MUTED,fontSize:11}}>{album.photos?.length||0} фото</p>
                                  </div>
                                </button>
                                <div style={{padding:'0 12px 10px',display:'flex',gap:12}}>
                                  <button onClick={()=>{setEditingAlbumId(album.id);setEditAlbum({title:album.title,description:album.description||''})}} style={{fontSize:12,color:ACCENT,background:'none',border:'none',cursor:'pointer',fontWeight:500}}>Переименовать</button>
                                  <button onClick={()=>handleDeleteAlbum(album.id)} style={{fontSize:12,color:'#F87171',background:'none',border:'none',cursor:'pointer'}}>Удалить</button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )
                  ):(
                    <Card>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
                        <div style={{display:'flex',alignItems:'center',gap:10,minWidth:0}}>
                          <button onClick={()=>setOpenAlbumId(null)} style={{fontSize:13,color:MUTED,background:'none',border:'none',cursor:'pointer',flexShrink:0}}>← Назад</button>
                          <h2 style={{fontWeight:700,fontSize:15,color:TEXT,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{openAlbum?.title}</h2>
                        </div>
                        <label style={{cursor:'pointer',fontSize:13,color:ACCENT,fontWeight:600,flexShrink:0,marginLeft:10}}>
                          {uploadingAlbum?'...':'+ Фото'}
                          <input type="file" accept="image/*,video/*" multiple style={{display:'none'}} onChange={e=>e.target.files&&handleUploadAlbumPhoto(openAlbumId,e.target.files)}/>
                        </label>
                      </div>
                      {!openAlbum?.photos||openAlbum.photos.length===0?(
                        <label style={{cursor:'pointer',width:'100%',padding:'40px 0',borderRadius:14,border:`2px dashed ${BORDER}`,display:'flex',flexDirection:'column',alignItems:'center',gap:8,color:MUTED}}>
                          <span style={{fontSize:28}}>📷</span><span style={{fontSize:13,fontWeight:500}}>Добавить фото</span>
                          <input type="file" accept="image/*,video/*" multiple style={{display:'none'}} onChange={e=>e.target.files&&handleUploadAlbumPhoto(openAlbumId,e.target.files)}/>
                        </label>
                      ):(
                        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))',gap:10}}>
                          {openAlbum.photos.map(photo=>(
                            <div key={photo.id} style={{position:'relative',borderRadius:12,overflow:'hidden',aspectRatio:'1',background:'rgba(21,15,46,0.04)'}}>
                              <img src={photo.mediaUrl} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                              <button onClick={()=>handleDeleteAlbumPhoto(openAlbumId,photo.id)} style={{position:'absolute',top:6,right:6,width:22,height:22,background:'rgba(0,0,0,0.7)',border:'none',borderRadius:'50%',color:'white',cursor:'pointer',fontSize:11}}>✕</button>
                            </div>
                          ))}
                          <label style={{cursor:'pointer',aspectRatio:'1',borderRadius:12,border:`2px dashed ${BORDER}`,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',color:MUTED,fontSize:22}}>
                            +<input type="file" accept="image/*,video/*" multiple style={{display:'none'}} onChange={e=>e.target.files&&handleUploadAlbumPhoto(openAlbumId,e.target.files)}/>
                          </label>
                        </div>
                      )}
                    </Card>
                  )}
                </div>
              )}

              {anketaTab==='availability'&&(
                <div style={{display:'flex',flexDirection:'column',gap:16}}>
                  <Card>
                    <h2 style={{fontWeight:700,fontSize:16,color:TEXT,marginBottom:4}}>Календарь доступности</h2>
                    <p style={{color:MUTED,fontSize:13,marginBottom:16}}>Отмечайте конкретные дни: когда вы доступны (и в какие часы), а когда — нет. Клиенты увидят это в вашем профиле.</p>
                    <div style={{display:'flex',gap:20,alignItems:'flex-start',flexWrap:'wrap'}}>
                      <div style={{flex:'1 1 300px',minWidth:280}}>
                        <AvailabilityCalendar dates={availability} selectedDate={selectedAvailDate} onSelectDate={handleSelectAvailDate}/>
                      </div>
                      <div style={{flex:'1 1 260px',minWidth:240}}>
                        {selectedAvailDate?(
                          <div style={{background:'rgba(21,15,46,0.02)',border:`1px solid ${BORDER}`,borderRadius:16,padding:16}}>
                            <p style={{fontWeight:700,fontSize:14,color:TEXT,marginBottom:14}}>
                              {new Date(selectedAvailDate+'T00:00:00').toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'})}
                            </p>
                            <div style={{display:'flex',gap:8,marginBottom:14}}>
                              <button onClick={()=>setAvailForm(f=>({...f,isAvailable:true}))}
                                style={{flex:1,padding:'9px',borderRadius:10,fontSize:13,fontWeight:600,border:`1px solid ${availForm.isAvailable?'#34D399':BORDER}`,background:availForm.isAvailable?'rgba(52,211,153,0.12)':'transparent',color:availForm.isAvailable?'#34D399':MUTED,cursor:'pointer'}}>
                                Доступен
                              </button>
                              <button onClick={()=>setAvailForm(f=>({...f,isAvailable:false}))}
                                style={{flex:1,padding:'9px',borderRadius:10,fontSize:13,fontWeight:600,border:`1px solid ${!availForm.isAvailable?'#F87171':BORDER}`,background:!availForm.isAvailable?'rgba(248,113,113,0.12)':'transparent',color:!availForm.isAvailable?'#F87171':MUTED,cursor:'pointer'}}>
                                Недоступен
                              </button>
                            </div>
                            {availForm.isAvailable&&(
                              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
                                <input type="time" value={availForm.timeFrom} onChange={e=>setAvailForm(f=>({...f,timeFrom:e.target.value}))} style={{...inp,flex:1}} onFocus={e=>e.target.style.borderColor=ACCENT} onBlur={e=>e.target.style.borderColor=BORDER}/>
                                <span style={{color:MUTED,fontSize:13}}>—</span>
                                <input type="time" value={availForm.timeTo} onChange={e=>setAvailForm(f=>({...f,timeTo:e.target.value}))} style={{...inp,flex:1}} onFocus={e=>e.target.style.borderColor=ACCENT} onBlur={e=>e.target.style.borderColor=BORDER}/>
                              </div>
                            )}
                            <Label>Заметка</Label>
                            <textarea rows={3} placeholder="Например: только после 18:00, уезжаю..." value={availForm.note} onChange={e=>setAvailForm(f=>({...f,note:e.target.value}))} style={{...inp,resize:'none',marginBottom:14}}/>
                            {availError&&<p style={{color:'#F87171',fontSize:12,marginBottom:10}}>{availError}</p>}
                            <div style={{display:'flex',gap:8}}>
                              <button onClick={handleSaveAvailDate} disabled={availSaving} style={{flex:1,background:ACCENT,color:'#FFFFFF',fontWeight:700,padding:'11px',borderRadius:12,border:'none',cursor:availSaving?'not-allowed':'pointer',fontSize:13,opacity:availSaving?0.6:1}}>
                                {availSaving?'Сохраняем...':'Сохранить'}
                              </button>
                              {availability.some(a=>a.date===selectedAvailDate)&&(
                                <button onClick={handleDeleteAvailDate} style={{padding:'11px 14px',borderRadius:12,border:`1px solid ${BORDER}`,background:'transparent',color:MUTED,cursor:'pointer',fontSize:13}}>
                                  Очистить
                                </button>
                              )}
                            </div>
                          </div>
                        ):(
                          <div style={{textAlign:'center',padding:'40px 16px',color:MUTED,fontSize:13}}>
                            Выберите день в календаре, чтобы отметить доступность
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                </div>
              )}
            </div>
          )}

          {/* ── FAVORITES ── */}
          {activeTab==='favorites'&&(
            <div>
              {favoritesLoading?(
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(200px,1fr))',gap:14}}>
                  {[1,2,3].map(i=><div key={i} style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,height:220}}/>)}
                </div>
              ):favorites.length===0?(
                <Card style={{textAlign:'center',padding:'48px 20px'}}>
                  <p style={{fontSize:32,marginBottom:8}}>🤍</p>
                  <p style={{fontWeight:700,fontSize:16,color:TEXT,marginBottom:4}}>Пока пусто</p>
                  <p style={{color:MUTED,fontSize:14,marginBottom:16}}>Добавляйте исполнителей в избранное — жмите на сердечко на карточке или в профиле</p>
                  <Link href="/catalog" style={{display:'inline-block',background:ACCENT,color:'#FFFFFF',fontWeight:700,padding:'10px 20px',borderRadius:12,textDecoration:'none',fontSize:14}}>Открыть каталог</Link>
                </Card>
              ):(
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(200px,1fr))',gap:14}}>
                  {favorites.map(fav=>{
                    const p=fav.profile
                    const cat=p.profileCategories?.find(pc=>pc.isPrimary)?.category||p.profileCategories?.[0]?.category
                    return (
                      <Link key={fav.id} href={`/catalog/${p.id}`} style={{textDecoration:'none',display:'block',background:CARD,borderRadius:16,border:`1px solid ${BORDER}`,overflow:'hidden',boxShadow:'0 2px 12px rgba(21,15,46,0.05)'}}>
                        <div style={{height:140,background:'rgba(21,15,46,0.05)',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',position:'relative'}}>
                          {p.avatarUrl?<img src={p.avatarUrl} alt={p.displayName} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<span style={{fontSize:40,opacity:0.3}}>{cat?.icon||'✦'}</span>}
                          <div style={{position:'absolute',top:8,right:8}}>
                            <FavoriteButton profileId={p.id} active={true} onToggle={()=>handleRemoveFavorite(p.id)} size={28} />
                          </div>
                        </div>
                        <div style={{padding:12}}>
                          <p style={{fontWeight:700,fontSize:14,color:TEXT,marginBottom:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.displayName}</p>
                          <p style={{color:MUTED,fontSize:12,marginBottom:8}}>{cat?.name}{cat?.name&&' · '}{p.city}</p>
                          {p.priceFrom
                            ? <span style={{fontWeight:700,fontSize:13,color:TEXT}}>от {Number(p.priceFrom).toLocaleString('ru-RU')} ₽</span>
                            : <span style={{color:MUTED,fontSize:12}}>По запросу</span>}
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── ACCOUNT ── */}
          {activeTab==='account'&&(
            <div style={{display:'flex',flexDirection:'column',gap:16}}>
            <Card>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
                <h2 style={{fontWeight:800,fontSize:18,color:TEXT}}>Данные аккаунта</h2>
                {!editingAccount&&<button onClick={()=>setEditingAccount(true)} style={{fontSize:13,color:ACCENT,fontWeight:600,background:'none',border:'none',cursor:'pointer'}}>Редактировать</button>}
              </div>
              {accountSuccess&&<div style={{background:'rgba(52,211,153,0.1)',border:'1px solid rgba(52,211,153,0.25)',color:'#34D399',borderRadius:12,padding:'12px 16px',fontSize:14,marginBottom:16}}>{accountSuccess}</div>}
              {accountError&&<div style={{background:'rgba(248,113,113,0.1)',border:'1px solid rgba(248,113,113,0.25)',color:'#F87171',borderRadius:12,padding:'12px 16px',fontSize:14,marginBottom:16}}>{accountError}</div>}
              <div style={{display:'flex',flexDirection:'column',gap:16}}>
                <div>
                  <Label>Имя</Label>
                  {editingAccount?<input type="text" value={accountForm.name} onChange={e=>setAccountForm(f=>({...f,name:e.target.value}))} style={inp} onFocus={e=>e.target.style.borderColor=ACCENT} onBlur={e=>e.target.style.borderColor=BORDER}/>
                    :<div style={{...inp,color:TEXT}}>{user.name}</div>}
                </div>
                <div>
                  <Label>Email</Label>
                  <div style={{...inp,color:MUTED}}>{user.email}</div>
                  {editingAccount&&<p style={{fontSize:12,color:MUTED,marginTop:6}}>Email изменить нельзя</p>}
                </div>
                {user.role==='client'&&(
                  <div>
                    <Label>Город</Label>
                    {editingAccount?<input type="text" placeholder="Москва" value={accountForm.city} onChange={e=>setAccountForm(f=>({...f,city:e.target.value}))} style={inp} onFocus={e=>e.target.style.borderColor=ACCENT} onBlur={e=>e.target.style.borderColor=BORDER}/>
                      :<div style={{...inp,color:accountForm.city?TEXT:MUTED}}>{accountForm.city||'Не указан'}</div>}
                    {editingAccount&&<p style={{fontSize:12,color:MUTED,marginTop:6}}>Подставится в новые мероприятия автоматически</p>}
                  </div>
                )}
                <div>
                  <Label>Роль</Label>
                  <div style={{...inp,color:TEXT}}>{primaryCat?`${primaryCat.icon||''} ${primaryCat.name}`:user.role==='vendor'?'🎤 Исполнитель':'🎉 Организатор'}</div>
                </div>
                {editingAccount&&(
                  <>
                    <div style={{borderTop:`1px solid ${BORDER}`,paddingTop:16}}>
                      <p style={{fontSize:13,fontWeight:600,color:MUTED,marginBottom:14}}>Сменить пароль (необязательно)</p>
                      <div style={{display:'flex',flexDirection:'column',gap:12}}>
                        <div><Label>Текущий пароль</Label><input type="password" value={accountForm.currentPassword} onChange={e=>setAccountForm(f=>({...f,currentPassword:e.target.value}))} placeholder="••••••••" style={inp} onFocus={e=>e.target.style.borderColor=ACCENT} onBlur={e=>e.target.style.borderColor=BORDER}/></div>
                        <div><Label>Новый пароль</Label><input type="password" value={accountForm.newPassword} onChange={e=>setAccountForm(f=>({...f,newPassword:e.target.value}))} placeholder="Минимум 8 символов" style={inp} onFocus={e=>e.target.style.borderColor=ACCENT} onBlur={e=>e.target.style.borderColor=BORDER}/></div>
                      </div>
                    </div>
                    <div style={{display:'flex',gap:12}}>
                      <button onClick={handleSaveAccount} disabled={accountSaving} style={{flex:1,background:ACCENT,color:'#FFFFFF',fontWeight:700,padding:'13px',borderRadius:14,border:'none',cursor:accountSaving?'not-allowed':'pointer',fontSize:14,opacity:accountSaving?0.6:1}}>
                        {accountSaving?'Сохраняем...':'Сохранить'}
                      </button>
                      <button onClick={()=>{setEditingAccount(false);setAccountError('')}} style={{flex:1,background:'transparent',border:`1px solid ${BORDER}`,color:MUTED,padding:'13px',borderRadius:14,cursor:'pointer',fontSize:14}}>Отмена</button>
                    </div>
                  </>
                )}
                <button onClick={handleLogout} style={{background:'rgba(248,113,113,0.08)',border:'1px solid rgba(248,113,113,0.2)',color:'#F87171',fontWeight:600,padding:'13px',borderRadius:14,cursor:'pointer',fontSize:14}}>
                  Выйти из аккаунта
                </button>
              </div>
            </Card>

            <Card style={{border:'1px solid rgba(248,113,113,0.3)'}}>
              <h2 style={{fontWeight:800,fontSize:16,color:'#F87171',marginBottom:8}}>Опасная зона</h2>
              <p style={{color:MUTED,fontSize:13,marginBottom:16}}>Удаление аккаунта необратимо: пропадут профиль, брони, мероприятия, чаты и отзывы.</p>
              {!deleteConfirmOpen?(
                <button onClick={()=>setDeleteConfirmOpen(true)} style={{background:'rgba(248,113,113,0.08)',border:'1px solid rgba(248,113,113,0.3)',color:'#F87171',fontWeight:700,padding:'13px',borderRadius:14,cursor:'pointer',fontSize:14}}>
                  Удалить аккаунт
                </button>
              ):(
                <div style={{display:'flex',flexDirection:'column',gap:12}}>
                  {deleteError&&<p style={{color:'#F87171',fontSize:13}}>{deleteError}</p>}
                  <div>
                    <Label>Подтвердите паролем</Label>
                    <input type="password" value={deletePassword} onChange={e=>setDeletePassword(e.target.value)} placeholder="Текущий пароль" style={inp} onFocus={e=>e.target.style.borderColor=ACCENT} onBlur={e=>e.target.style.borderColor=BORDER}/>
                  </div>
                  <div style={{display:'flex',gap:12}}>
                    <button onClick={handleDeleteAccount} disabled={deleteLoading} style={{flex:1,background:'#F87171',color:'#FFFFFF',fontWeight:700,padding:'13px',borderRadius:14,border:'none',cursor:deleteLoading?'not-allowed':'pointer',fontSize:14,opacity:deleteLoading?0.6:1}}>
                      {deleteLoading?'Удаляем...':'Да, удалить навсегда'}
                    </button>
                    <button onClick={()=>{setDeleteConfirmOpen(false);setDeletePassword('');setDeleteError('')}} style={{flex:1,background:'transparent',border:`1px solid ${BORDER}`,color:MUTED,padding:'13px',borderRadius:14,cursor:'pointer',fontSize:14}}>Отмена</button>
                  </div>
                </div>
              )}
            </Card>
            </div>
          )}
        </div>
      </main>
      <Footer/>

      <style>{`
        @media (max-width: 640px) { .calendar-col { width: 100% !important; } }
      `}</style>
    </>
  )

  async function updateBookingStatus(bookingId:string, status:string) {
    try {
      const endpoint=status==='confirmed'?'confirm':'cancel'
      await apiFetch(`/api/bookings/${bookingId}/${endpoint}`,{method:'PATCH'})
      setBookings(prev=>prev.map(b=>b.id===bookingId?{...b,status}:b))
    } catch(e){console.error(e)}
  }

  async function handleDeleteBooking(bookingId:string) {
    if(!window.confirm('Удалить эту бронь навсегда?')) return
    try {
      const res=await apiFetch(`/api/bookings/${bookingId}`,{method:'DELETE'})
      if(!res.ok) return
      setBookings(prev=>prev.filter(b=>b.id!==bookingId))
      setSelectedBooking(b=>b?.id===bookingId?null:b)
    } catch(e){console.error(e)}
  }
}
