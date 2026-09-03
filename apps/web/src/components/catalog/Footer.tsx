import Link from 'next/link'

const LINKS = {
  'Категории': [['Площадки','/catalog?cat=venue'],['Диджеи','/catalog?cat=dj'],['Ведущие','/catalog?cat=host'],['Фотографы','/catalog?cat=photo'],['Кейтеринг','/catalog?cat=catering']],
  'Компания': [['О нас','/about'],['Исполнителям','/#pro'],['Блог','/blog'],['Вакансии','/jobs']],
  'Поддержка': [['Помощь','/help'],['Безопасность','/safety'],['Контакты','/contacts'],['Условия','/terms']],
}

export function Footer() {
  return (
    <footer style={{ borderTop: '1px solid rgba(21,15,46,0.08)', background: '#FCFAFF', paddingTop: 48, paddingBottom: 32 }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 clamp(16px,4vw,40px)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 32, marginBottom: 40 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <span style={{ fontWeight: 900, fontSize: 20, color: '#150F2E', letterSpacing: '-0.03em' }}>гуляй</span>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#7C3AED', display: 'inline-block' }} />
            </div>
            <p style={{ color: 'rgba(21,15,46,0.45)', fontSize: 14, lineHeight: 1.7, maxWidth: '28ch' }}>
              Маркетплейс для организации мероприятий. Площадки и исполнители для праздника любого масштаба.
            </p>
          </div>
          {Object.entries(LINKS).map(([title, links]) => (
            <div key={title}>
              <h4 style={{ color: 'rgba(21,15,46,0.4)', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 14 }}>{title}</h4>
              {links.map(([label, href]) => (
                <Link key={label} href={href} style={{ display: 'block', color: 'rgba(21,15,46,0.55)', fontSize: 14, textDecoration: 'none', padding: '4px 0' }}>{label}</Link>
              ))}
            </div>
          ))}
        </div>
        <div style={{ borderTop: '1px solid rgba(21,15,46,0.08)', paddingTop: 24, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ color: 'rgba(21,15,46,0.35)', fontSize: 13 }}>© 2026 гуляй. Все права защищены.</span>
          <span style={{ color: 'rgba(21,15,46,0.35)', fontSize: 13 }}>Сделано с теплом ✦</span>
        </div>
      </div>
    </footer>
  )
}