import { API_URL } from './config'

/**
 * Единая обёртка над fetch для запросов к бэкенду.
 *
 * - подставляет базовый адрес API (`/api/...` → `${API_URL}/api/...`);
 * - автоматически добавляет заголовок Authorization из localStorage;
 * - при 401 на авторизованном запросе (токен протух / отозван) — чистит
 *   сессию, шлёт `auth-changed` и уводит на /auth/login?expired=1, после
 *   чего бросает SessionExpiredError, чтобы вызывающий код не продолжал
 *   работу с пустым ответом.
 *
 * Для публичных эндпоинтов (login/register, каталог) передавайте
 * `{ auth: false }` — тогда 401 трактуется как обычная ошибка ответа.
 */

export class SessionExpiredError extends Error {
  constructor() {
    super('Session expired')
    this.name = 'SessionExpiredError'
  }
}

export interface ApiFetchInit extends RequestInit {
  /** Прикреплять Bearer-токен и обрабатывать 401 как истёкшую сессию. По умолчанию true. */
  auth?: boolean
}

let sessionExpiryHandled = false

function handleSessionExpiry() {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('user')
    window.dispatchEvent(new Event('auth-changed'))
  } catch {
    /* localStorage может быть недоступен — не критично */
  }

  // Не даём нескольким параллельным запросам устроить гонку редиректов.
  if (sessionExpiryHandled) return
  sessionExpiryHandled = true

  const { pathname, search } = window.location
  // Уже на странице входа/регистрации — просто перезагрузим её с флагом.
  if (pathname.startsWith('/auth/')) {
    if (!search.includes('expired=1')) window.location.href = '/auth/login?expired=1'
    return
  }
  const redirect = encodeURIComponent(pathname + search)
  window.location.href = `/auth/login?expired=1&redirect=${redirect}`
}

export async function apiFetch(path: string, init: ApiFetchInit = {}): Promise<Response> {
  const { auth = true, headers, ...rest } = init

  const url = /^https?:\/\//.test(path)
    ? path
    : `${API_URL}${path.startsWith('/') ? '' : '/'}${path}`

  const finalHeaders = new Headers(headers as HeadersInit | undefined)

  let tokenSent = false
  if (auth && typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken')
    if (token) {
      finalHeaders.set('Authorization', `Bearer ${token}`)
      tokenSent = true
    }
  }

  const res = await fetch(url, { ...rest, headers: finalHeaders })

  if (res.status === 401 && tokenSent) {
    handleSessionExpiry()
    throw new SessionExpiredError()
  }

  return res
}
