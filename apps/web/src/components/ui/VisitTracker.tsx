'use client'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { API_URL } from '@/lib/config'

function sessionId(): string | undefined {
  try {
    let s = localStorage.getItem('gulyay-sid')
    if (!s) {
      s = Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
      localStorage.setItem('gulyay-sid', s)
    }
    return s
  } catch {
    return undefined
  }
}

/**
 * Лёгкий счётчик посещений для админ-статистики.
 * Один пинг на смену маршрута. Ничего не блокирует, все ошибки глотаются.
 */
export function VisitTracker() {
  const pathname = usePathname()

  useEffect(() => {
    if (!pathname) return
    let referrer: string | undefined
    try {
      referrer = document.referrer ? new URL(document.referrer).hostname : undefined
      if (referrer === location.hostname) referrer = undefined
    } catch { /* ignore */ }

    const payload = JSON.stringify({ path: pathname, sessionId: sessionId(), referrer })
    const url = `${API_URL}/api/metrics/visit`
    try {
      const ok = navigator.sendBeacon?.(url, new Blob([payload], { type: 'application/json' }))
      if (!ok) {
        fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true }).catch(() => {})
      }
    } catch { /* ignore */ }
  }, [pathname])

  return null
}
