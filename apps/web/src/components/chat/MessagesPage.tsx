'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { apiFetch } from '@/lib/apiFetch'

interface Party { id: string; email: string; profile?: { displayName: string; avatarUrl: string | null } | null }
interface ConversationListItem {
  id: string
  bookingId: string
  createdAt: string
  booking: { id: string; eventDate: string; eventType: string | null; status: string }
  client: Party
  vendor: Party
  messages: { id: string; text: string; createdAt: string; senderId: string }[]
  unreadCount: number
}
interface Message {
  id: string
  text: string
  createdAt: string
  sender: { id: string; email: string }
}

const BG = 'linear-gradient(135deg, #F3E9FC 0%, #FCEAF1 45%, #FFF4EA 100%)'
const BORDER = 'rgba(21,15,46,0.08)'
const TEXT = '#150F2E'
const MUTED = 'rgba(21,15,46,0.5)'
const ACCENT = '#7C3AED'
const AVATAR_BG = 'linear-gradient(135deg, #8B3DFF 0%, #E93D8A 100%)'

function otherParty(conv: ConversationListItem, myId: string): Party {
  return conv.client.id === myId ? conv.vendor : conv.client
}

export function MessagesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [myId, setMyId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<ConversationListItem[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const token = () => localStorage.getItem('accessToken')

  // Список диалогов
  useEffect(() => {
    const tok = token()
    const ud = localStorage.getItem('user')
    if (!tok || !ud) { router.push('/auth/login'); return }
    setMyId(JSON.parse(ud).id)

    apiFetch('/api/chat')
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : []
        setConversations(list)
        const bookingParam = searchParams.get('booking')
        if (bookingParam) {
          const match = list.find((c: ConversationListItem) => c.bookingId === bookingParam)
          if (match) setActiveId(match.id)
        }
      })
      .catch(() => setError('Не удалось загрузить диалоги'))
      .finally(() => setLoadingList(false))
  }, [])

  // Сообщения активного диалога — с поллингом, пока диалог открыт
  useEffect(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    if (!activeId) { setMessages([]); return }

    const load = () => {
      apiFetch(`/api/chat/${activeId}/messages`)
        .then(r => r.json())
        .then(data => Array.isArray(data) && setMessages(data))
        .catch(() => {})
    }
    load()
    pollRef.current = setInterval(load, 4000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [activeId])

  // Открыли диалог — сервер отметил его сообщения прочитанными, обнуляем счётчик локально
  const handleSelectConversation = (id: string) => {
    setActiveId(id)
    setConversations(prev => prev.map(c => c.id === id ? { ...c, unreadCount: 0 } : c))
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!text.trim() || !activeId || sending) return
    setSending(true)
    const body = text
    setText('')
    try {
      const res = await apiFetch(`/api/chat/${activeId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: body }),
      })
      if (res.ok) {
        const msg = await res.json()
        setMessages(prev => [...prev, { ...msg, sender: { id: myId as string, email: '' } }])
      }
    } catch {}
    finally { setSending(false) }
  }

  const activeConv = conversations.find(c => c.id === activeId) || null

  return (
    <>
      <Header />
      <main style={{ background: BG, minHeight: 'calc(100vh - 60px)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px clamp(16px,4vw,40px)' }}>
          <h1 style={{ fontWeight: 800, fontSize: 24, color: TEXT, marginBottom: 16 }}>Сообщения</h1>

          {error && <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#B91C1C', borderRadius: 12, padding: '12px 16px', fontSize: 14, marginBottom: 16 }}>{error}</div>}

          <div style={{ display: 'flex', gap: 16, background: '#FFFFFF', border: `1px solid ${BORDER}`, borderRadius: 20, overflow: 'hidden', height: 'calc(100vh - 200px)', minHeight: 420 }}>

            {/* Список диалогов */}
            <div style={{ width: 280, flexShrink: 0, borderRight: `1px solid ${BORDER}`, overflowY: 'auto' }}>
              {loadingList ? (
                <p style={{ padding: 16, color: MUTED, fontSize: 14 }}>Загрузка...</p>
              ) : conversations.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center' }}>
                  <p style={{ fontSize: 28, marginBottom: 8 }}>💬</p>
                  <p style={{ color: MUTED, fontSize: 13 }}>Диалоги появляются автоматически после подтверждения брони</p>
                </div>
              ) : conversations.map(conv => {
                if (!myId) return null
                const other = otherParty(conv, myId)
                const lastMsg = conv.messages?.[0]
                const active = conv.id === activeId
                const unread = conv.unreadCount || 0
                return (
                  <button key={conv.id} onClick={() => handleSelectConversation(conv.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', padding: '14px 16px',
                      background: active ? 'rgba(124,58,237,0.08)' : 'transparent', border: 'none',
                      borderBottom: `1px solid ${BORDER}`, cursor: 'pointer',
                    }}>
                    <span style={{
                      width: 38, height: 38, borderRadius: '50%', background: AVATAR_BG, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 15, fontWeight: 700, color: '#FFFFFF', overflow: 'hidden',
                    }}>
                      {other.profile?.avatarUrl
                        ? <img src={other.profile.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : (other.profile?.displayName?.[0]?.toUpperCase() || other.email?.[0]?.toUpperCase() || '?')}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 700, fontSize: 14, color: TEXT, marginBottom: 2 }}>
                        {other.profile?.displayName || other.email}
                      </p>
                      <p style={{ color: MUTED, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {lastMsg ? lastMsg.text : (conv.booking.eventType || 'Новый диалог')}
                      </p>
                    </div>
                    {unread > 0 && (
                      <span style={{
                        minWidth: 20, height: 20, padding: '0 6px', borderRadius: 10, background: ACCENT, color: '#FFFFFF',
                        fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        {unread}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Переписка */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              {!activeConv ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: MUTED, fontSize: 14 }}>
                  Выберите диалог слева
                </div>
              ) : (
                <>
                  <div style={{ padding: '14px 20px', borderBottom: `1px solid ${BORDER}` }}>
                    <p style={{ fontWeight: 700, fontSize: 15, color: TEXT }}>
                      {myId && otherParty(activeConv, myId).profile?.displayName}
                    </p>
                    <p style={{ color: MUTED, fontSize: 12 }}>
                      {activeConv.booking.eventType} · {new Date(activeConv.booking.eventDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>

                  <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {messages.length === 0 ? (
                      <p style={{ color: MUTED, fontSize: 13, textAlign: 'center', marginTop: 20 }}>Сообщений пока нет — напишите первым</p>
                    ) : messages.map(m => {
                      const mine = m.sender.id === myId
                      return (
                        <div key={m.id} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '70%' }}>
                          <div style={{
                            background: mine ? ACCENT : '#F3EEFB', color: mine ? '#FFFFFF' : TEXT,
                            padding: '10px 14px', borderRadius: 14,
                            borderBottomRightRadius: mine ? 4 : 14, borderBottomLeftRadius: mine ? 14 : 4,
                            fontSize: 14, lineHeight: 1.5, wordBreak: 'break-word',
                          }}>
                            {m.text}
                          </div>
                          <p style={{ fontSize: 11, color: MUTED, marginTop: 3, textAlign: mine ? 'right' : 'left' }}>
                            {new Date(m.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      )
                    })}
                    <div ref={bottomRef} />
                  </div>

                  <div style={{ padding: 14, borderTop: `1px solid ${BORDER}`, display: 'flex', gap: 10 }}>
                    <input value={text} onChange={e => setText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSend() }}
                      placeholder="Написать сообщение..."
                      style={{ flex: 1, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '10px 14px', fontSize: 14, outline: 'none', background: '#F8F6FC' }} />
                    <button onClick={handleSend} disabled={sending || !text.trim()}
                      style={{ background: ACCENT, color: '#FFFFFF', fontWeight: 700, padding: '0 20px', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 14, opacity: sending || !text.trim() ? 0.6 : 1 }}>
                      →
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
