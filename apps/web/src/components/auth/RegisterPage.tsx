'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/apiFetch'

const CATEGORIES = [
  { value: 'host',         label: 'Ведущий',          emoji: '🎤' },
  { value: 'dj',           label: 'Диджей',           emoji: '🎧' },
  { value: 'organizer',    label: 'Организатор',      emoji: '📋' },
  { value: 'video',        label: 'Видеограф',        emoji: '🎬' },
  { value: 'photo',        label: 'Фотограф',         emoji: '📸' },
  { value: 'reels',        label: 'Рилсмейкер',       emoji: '🎥' },
  { value: 'coordinator',  label: 'Координатор',      emoji: '🗂' },
  { value: 'light_sound',  label: 'Свет и звук',      emoji: '💡' },
  { value: 'outfit',       label: 'Платья и костюмы', emoji: '👗' },
  { value: 'venue',        label: 'Площадка',         emoji: '🏛' },
  { value: 'transfer',     label: 'Трансфер',         emoji: '🚗' },
  { value: 'photo_studio', label: 'Фотостудия',       emoji: '🎞' },
  { value: 'catering',     label: 'Кейтеринг',        emoji: '🍽' },
  { value: 'jewelry',      label: 'Ювелирка',         emoji: '💍' },
  { value: 'barbershop',   label: 'Барбер шоп',       emoji: '💈' },
  { value: 'makeup',       label: 'Макияж',           emoji: '💄' },
  { value: 'bachelor',     label: 'Мальчишник',       emoji: '🥃' },
  { value: 'bachelorette', label: 'Девичник',         emoji: '🌸' },
  { value: 'decor',        label: 'Декоратор',        emoji: '🎈' },
  { value: 'confectionery',label: 'Кондитер',         emoji: '🎂' },
]

const CITIES = [
  'Москва', 'Санкт-Петербург', 'Новосибирск', 'Екатеринбург', 'Казань',
  'Нижний Новгород', 'Челябинск', 'Самара', 'Омск', 'Ростов-на-Дону',
  'Уфа', 'Красноярск', 'Пермь', 'Воронеж', 'Волгоград', 'Краснодар',
  'Саратов', 'Тюмень', 'Тольятти', 'Ижевск', 'Барнаул', 'Ульяновск',
  'Иркутск', 'Хабаровск', 'Ярославль', 'Владивосток', 'Махачкала',
  'Томск', 'Оренбург', 'Кемерово', 'Новокузнецк', 'Рязань', 'Астрахань',
  'Набережные Челны', 'Пенза', 'Липецк', 'Тула', 'Киров', 'Чебоксары',
  'Калининград', 'Брянск', 'Курск', 'Иваново', 'Магнитогорск', 'Тверь',
  'Сочи', 'Ставрополь', 'Белгород', 'Архангельск', 'Владимир', 'Сургут',
]

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[а-яё]/g, (c: string) => ({
      а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'yo',ж:'zh',з:'z',и:'i',й:'y',
      к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',
      х:'kh',ц:'ts',ч:'ch',ш:'sh',щ:'shch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya'
    } as any)[c] || c)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [cityOpen, setCityOpen] = useState(false)

  const [form1, setForm1] = useState({
    firstName: '',
    lastName:  '',
    email:     '',
    phone:     '',
    password:  '',
    city:      '',
    role:      'client' as 'client' | 'vendor',
  })
  const [cityOpen1, setCityOpen1] = useState(false)

  const [form2, setForm2] = useState({
    categorySlug: 'host',
    city:         'Новосибирск',
  })

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const fullName = `${form1.firstName} ${form1.lastName}`.trim()
      const res = await apiFetch('/api/auth/register', {
        auth: false,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:     fullName,
          email:    form1.email,
          password: form1.password,
          role:     form1.role,
          phone:    form1.phone || undefined,
          city:     form1.city || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Ошибка регистрации')
        return
      }
      localStorage.setItem('accessToken', data.accessToken)
      localStorage.setItem('user', JSON.stringify(data.user))
      window.dispatchEvent(new Event('auth-changed'))

      if (form1.role === 'vendor') {
        setForm2(f => ({ ...f, city: form1.city || f.city }))
        setStep(2)
      } else {
        router.push('/')
      }
    } catch {
      setError('Не удалось подключиться к серверу')
    } finally {
      setLoading(false)
    }
  }

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const fullName = `${form1.firstName} ${form1.lastName}`.trim()
      const res = await apiFetch('/api/auth/setup-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categorySlug: form2.categorySlug,
          city:         form2.city,
          displayName:  fullName,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Ошибка создания профиля')
        return
      }
      router.push('/')
    } catch {
      setError('Не удалось подключиться к серверу')
    } finally {
      setLoading(false)
    }
  }

  const filteredCities = CITIES.filter(c =>
    c.toLowerCase().includes(form2.city.toLowerCase())
  ).slice(0, 8)

  const filteredCities1 = CITIES.filter(c =>
    c.toLowerCase().includes(form1.city.toLowerCase())
  ).slice(0, 8)

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: 'linear-gradient(135deg, #F3E9FC 0%, #FCEAF1 45%, #FFF4EA 100%)' }}>
      <div className="w-full max-w-[520px]">

        {/* Лого */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="font-bold text-[28px]" style={{ fontFamily: '"Bricolage Grotesque", system-ui, sans-serif', letterSpacing: '-0.02em' }}>
              гуляй
            </span>
            <span className="w-[10px] h-[10px] rounded-full inline-block" style={{ background: '#7C3AED', boxShadow: '0 0 12px rgba(124,58,237,0.5)' }} />
          </Link>
          <p className="text-[#6B6558] text-sm mt-2">
            {step === 1 ? 'Создайте аккаунт бесплатно' : 'Выберите категорию — шаг 2 из 2'}
          </p>
        </div>

        {/* Прогресс для vendor */}
        {(form1.role === 'vendor' || step === 2) && (
          <div className="flex items-center mb-6">
            {[1, 2].map((n, i) => (
              <React.Fragment key={n}>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{
                    background: step >= n ? '#7C3AED' : '#E8E2D8',
                    color:      step >= n ? 'white' : '#6B6558',
                  }}
                >
                  {n}
                </div>
                {i < 1 && (
                  <div className="h-0.5 flex-1 mx-2" style={{ background: step > n ? '#7C3AED' : '#E8E2D8' }} />
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        <div className="bg-white rounded-[24px] border border-[#E8E2D8] p-8 shadow-sm">

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-5">
              {error}
            </div>
          )}

          {/* ШАГ 1 */}
          {step === 1 && (
            <form onSubmit={handleStep1} className="flex flex-col gap-4">
              <h1 className="font-bold text-[22px] mb-1" style={{ letterSpacing: '-0.02em' }}>
                Регистрация
              </h1>

              {/* Роль */}
              <div className="flex gap-2 p-1 bg-[#F5F0E8] rounded-xl">
                {[
                  { value: 'client', label: '🎉 Организатор' },
                  { value: 'vendor', label: '🎤 Исполнитель' },
                ].map(r => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setForm1(f => ({ ...f, role: r.value as 'client' | 'vendor' }))}
                    className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
                    style={{
                      background: form1.role === r.value ? 'white' : 'transparent',
                      color:      form1.role === r.value ? '#1C1A17' : '#6B6558',
                      boxShadow:  form1.role === r.value ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                    }}
                  >
                    {r.label}
                  </button>
                ))}
              </div>

              {/* Имя и фамилия */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs font-bold uppercase tracking-widest text-[#6B6558] mb-1.5 block">Имя</label>
                  <input
                    type="text" required minLength={2} placeholder="Иван"
                    value={form1.firstName}
                    onChange={e => setForm1(f => ({ ...f, firstName: e.target.value }))}
                    className="w-full border border-[#E8E2D8] rounded-xl px-4 py-3 text-[15px] outline-none focus:border-[#7C3AED] transition-colors bg-[#FAFAF8]"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-bold uppercase tracking-widest text-[#6B6558] mb-1.5 block">Фамилия</label>
                  <input
                    type="text" required minLength={2} placeholder="Иванов"
                    value={form1.lastName}
                    onChange={e => setForm1(f => ({ ...f, lastName: e.target.value }))}
                    className="w-full border border-[#E8E2D8] rounded-xl px-4 py-3 text-[15px] outline-none focus:border-[#7C3AED] transition-colors bg-[#FAFAF8]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-[#6B6558] mb-1.5 block">Email</label>
                <input
                  type="email" required placeholder="you@example.com"
                  value={form1.email}
                  onChange={e => setForm1(f => ({ ...f, email: e.target.value }))}
                  className="w-full border border-[#E8E2D8] rounded-xl px-4 py-3 text-[15px] outline-none focus:border-[#7C3AED] transition-colors bg-[#FAFAF8]"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-[#6B6558] mb-1.5 block">
                  Телефон <span className="normal-case font-normal">(необязательно)</span>
                </label>
                <input
                  type="tel" placeholder="+7 900 000 00 00"
                  value={form1.phone}
                  onChange={e => setForm1(f => ({ ...f, phone: e.target.value }))}
                  className="w-full border border-[#E8E2D8] rounded-xl px-4 py-3 text-[15px] outline-none focus:border-[#7C3AED] transition-colors bg-[#FAFAF8]"
                />
              </div>

              <div className="relative">
                <label className="text-xs font-bold uppercase tracking-widest text-[#6B6558] mb-1.5 block">Город</label>
                <input
                  type="text" required placeholder="Новосибирск"
                  value={form1.city}
                  onChange={e => { setForm1(f => ({ ...f, city: e.target.value })); setCityOpen1(true) }}
                  onFocus={() => setCityOpen1(true)}
                  onBlur={() => setTimeout(() => setCityOpen1(false), 150)}
                  className="w-full border border-[#E8E2D8] rounded-xl px-4 py-3 text-[15px] outline-none focus:border-[#7C3AED] transition-colors bg-[#FAFAF8]"
                />
                {cityOpen1 && form1.city.length >= 1 && filteredCities1.length > 0 && (
                  <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-white border border-[#E8E2D8] rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                    {filteredCities1.map(c => (
                      <button
                        key={c}
                        type="button"
                        onMouseDown={() => { setForm1(f => ({ ...f, city: c })); setCityOpen1(false) }}
                        className="w-full text-left px-4 py-2.5 text-[14px] hover:bg-[#F5F0E8] transition-colors"
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}
                <p className="text-xs text-[#6B6558] mt-1">Пригодится при создании мероприятий и в вашем профиле</p>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-[#6B6558] mb-1.5 block">Пароль</label>
                <input
                  type="password" required minLength={8} placeholder="Минимум 8 символов"
                  value={form1.password}
                  onChange={e => setForm1(f => ({ ...f, password: e.target.value }))}
                  className="w-full border border-[#E8E2D8] rounded-xl px-4 py-3 text-[15px] outline-none focus:border-[#7C3AED] transition-colors bg-[#FAFAF8]"
                />
              </div>

              <button
                type="submit" disabled={loading}
                className="w-full text-white font-semibold py-3.5 rounded-xl text-[16px] mt-1 transition-opacity disabled:opacity-60"
                style={{ background: 'linear-gradient(90deg, #8B3DFF 0%, #E93D8A 100%)' }}
              >
                {loading ? 'Создаём...' : form1.role === 'vendor' ? 'Далее →' : 'Создать аккаунт'}
              </button>

              <p className="text-center text-sm text-[#6B6558] mt-2">
                Уже есть аккаунт?{' '}
                <Link href="/auth/login" className="text-[#7C3AED] font-semibold hover:underline">
                  Войти
                </Link>
              </p>
            </form>
          )}

          {/* ШАГ 2 */}
          {step === 2 && (
            <form onSubmit={handleStep2} className="flex flex-col gap-5">
              <h1 className="font-bold text-[22px] mb-1" style={{ letterSpacing: '-0.02em' }}>
                Чем вы занимаетесь?
              </h1>

              {/* Категории */}
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-[#6B6558] mb-3 block">
                  Категория
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {CATEGORIES.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setForm2(f => ({ ...f, categorySlug: c.value }))}
                      className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-center transition-all min-w-0"
                      style={{
                        background:  form2.categorySlug === c.value ? '#7C3AED' : 'white',
                        borderColor: form2.categorySlug === c.value ? '#7C3AED' : '#E8E2D8',
                        color:       form2.categorySlug === c.value ? 'white' : '#4A4540',
                      }}
                    >
                      <span style={{ fontSize: 22 }}>{c.emoji}</span>
                      <span className="text-[11px] font-medium leading-tight break-words w-full">{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Город с автодополнением */}
              <div className="relative">
                <label className="text-xs font-bold uppercase tracking-widest text-[#6B6558] mb-1.5 block">Город</label>
                <input
                  type="text" required placeholder="Новосибирск"
                  value={form2.city}
                  onChange={e => { setForm2(f => ({ ...f, city: e.target.value })); setCityOpen(true) }}
                  onFocus={() => setCityOpen(true)}
                  onBlur={() => setTimeout(() => setCityOpen(false), 150)}
                  className="w-full border border-[#E8E2D8] rounded-xl px-4 py-3 text-[15px] outline-none focus:border-[#7C3AED] transition-colors bg-[#FAFAF8]"
                />
                {cityOpen && form2.city.length >= 1 && filteredCities.length > 0 && (
                  <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-white border border-[#E8E2D8] rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                    {filteredCities.map(c => (
                      <button
                        key={c}
                        type="button"
                        onMouseDown={() => { setForm2(f => ({ ...f, city: c })); setCityOpen(false) }}
                        className="w-full text-left px-4 py-2.5 text-[14px] hover:bg-[#F5F0E8] transition-colors"
                      >
                        {c}
                      </button>
                    ))}
                    {filteredCities.length === 0 && (
                      <div className="px-4 py-3 text-[14px] text-[#6B6558]">Город не найден</div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-3.5 rounded-xl text-[15px] font-semibold border border-[#E8E2D8] text-[#6B6558] hover:border-[#1C1A17] transition-colors"
                >
                  ← Назад
                </button>
                <button
                  type="submit" disabled={loading}
                  className="flex-1 text-white font-semibold py-3.5 rounded-xl text-[15px] transition-opacity disabled:opacity-60"
                  style={{ background: 'linear-gradient(90deg, #8B3DFF 0%, #E93D8A 100%)' }}
                >
                  {loading ? 'Сохраняем...' : 'Создать профиль'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}