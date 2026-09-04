import type { Metadata } from 'next'
import { Manrope, Bricolage_Grotesque } from 'next/font/google'
import './globals.css'

const manrope = Manrope({ subsets: ['latin', 'cyrillic'], variable: '--font-manrope', display: 'swap' })

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'гуляй — всё для вашего мероприятия в одном месте',
  description: 'Площадки, ведущие, фотографы, диджеи и декор для свадьбы, дня рождения, корпоратива.',
  openGraph: { title: 'гуляй', description: 'Маркетплейс для организации мероприятий', locale: 'ru_RU', type: 'website' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${manrope.variable} ${bricolage.variable}`} suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* без JS — показываем все анимируемые блоки как есть */}
        <noscript>
          <style>{`[data-reveal]{opacity:1!important;transform:none!important}`}</style>
        </noscript>
      </head>
      <body className="antialiased" style={{ background: 'linear-gradient(135deg, #F3E9FC 0%, #FCEAF1 45%, #FFF4EA 100%)', backgroundAttachment: 'fixed', color: '#150F2E' }}>
        {children}
      </body>
    </html>
  )
}