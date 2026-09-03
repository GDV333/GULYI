const ACCENT = '#7C3AED'

export function HowItWorks() {
  const steps = [
    { emoji: '📝', title: 'Опишите мероприятие', desc: 'Дата, город, бюджет и кто нужен — ведущий, диджей, фотограф. Заполняете один раз для всей команды.' },
    { emoji: '🔍', title: 'Отправьте заявки', desc: 'По каждой роли смотрите портфолио, отзывы и цены и отправляете заявку — она сразу привязана к мероприятию.' },
    { emoji: '💬', title: 'Собирайте команду', desc: 'Кто подтвердил — сразу в общем чате мероприятия вместе с вами и остальными исполнителями.' },
    { emoji: '🎉', title: 'Оплатите и проведите', desc: 'Один чек за всех подтверждённых исполнителей. Встречайте гостей, потом оставьте отзыв.' },
  ]
  return (
    <section id="how" style={{ margin: '0 clamp(8px,2vw,16px) clamp(20px,4vw,36px)', borderRadius: 32, padding: 'clamp(36px,5vw,64px) clamp(20px,4vw,48px)', background: '#FFFFFF', border: '1px solid rgba(21,15,46,0.07)', boxShadow: '0 10px 40px rgba(21,15,46,0.06)' }}>
      <h2 style={{ fontFamily: 'var(--font-bricolage),"Bricolage Grotesque",system-ui', fontSize: 'clamp(24px,3.5vw,40px)', fontWeight: 900, color: '#150F2E', maxWidth: '18ch', lineHeight: 1.08, letterSpacing: '-0.025em', marginBottom: 12 }}>
        От идеи до готового события — за четыре шага
      </h2>
      <p style={{ color: 'rgba(21,15,46,0.5)', fontSize: 16, maxWidth: '46ch', lineHeight: 1.7, marginBottom: 36 }}>
        Никаких десятков чатов и таблиц. Всё планирование и бронирование — внутри гуляй.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: 16 }}>
        {steps.map((s,i) => (
          <div key={i} style={{ borderRadius: 20, padding: 'clamp(18px,3vw,26px)', background: '#FBF9FE', border: '1px solid rgba(21,15,46,0.06)' }}>
            <div style={{ fontSize: 28, marginBottom: 14 }}>{s.emoji}</div>
            <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, marginBottom: 14, background: `rgba(124,58,237,0.12)`, color: ACCENT }}>
              {i+1}
            </div>
            <h3 style={{ fontWeight: 700, color: '#150F2E', fontSize: 16, marginBottom: 8 }}>{s.title}</h3>
            <p style={{ color: 'rgba(21,15,46,0.5)', fontSize: 14, lineHeight: 1.65 }}>{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}