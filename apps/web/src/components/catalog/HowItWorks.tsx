const ACCENT = '#7C3AED'

const steps = [
  { emoji: '📝', title: 'Опишите мероприятие', desc: 'Дата, город, бюджет и кто нужен — ведущий, диджей, фотограф. Заполняете один раз для всей команды.' },
  { emoji: '🔍', title: 'Отправьте заявки', desc: 'По каждой роли смотрите портфолио, отзывы и цены и отправляете заявку — она сразу привязана к мероприятию.' },
  { emoji: '💬', title: 'Собирайте команду', desc: 'Кто подтвердил — сразу в общем чате мероприятия вместе с вами и остальными исполнителями.' },
  { emoji: '🎉', title: 'Оплатите и проведите', desc: 'Один чек за всех подтверждённых исполнителей. Встречайте гостей, потом оставьте отзыв.' },
]

export function HowItWorks() {
  return (
    <section id="how" style={{ margin: '0 clamp(8px,2vw,16px) clamp(16px,3vw,28px)', borderRadius: 28, padding: 'clamp(28px,4vw,48px) clamp(20px,4vw,40px)', background: '#FFFFFF', border: '1px solid rgba(21,15,46,0.07)', boxShadow: '0 10px 40px rgba(21,15,46,0.06)' }}>
      <h2 style={{ fontFamily: 'var(--font-bricolage),"Bricolage Grotesque",system-ui', fontSize: 'clamp(23px,3.2vw,36px)', fontWeight: 900, color: '#150F2E', maxWidth: '18ch', lineHeight: 1.1, letterSpacing: '-0.025em', marginBottom: 10 }}>
        От идеи до готового события — за четыре шага
      </h2>
      <p style={{ color: 'rgba(21,15,46,0.5)', fontSize: 15, maxWidth: '46ch', lineHeight: 1.6, marginBottom: 26 }}>
        Никаких десятков чатов и таблиц. Всё планирование и бронирование — внутри гуляй.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px,1fr))', gap: 14 }}>
        {steps.map((s, i) => (
          <div key={i} className="how-step"
            style={{ borderRadius: 18, padding: 'clamp(16px,2.4vw,22px)', background: '#FBF9FE', border: '1px solid rgba(21,15,46,0.06)', transition: 'transform .2s cubic-bezier(.2,.7,.2,1), box-shadow .2s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, background: 'rgba(124,58,237,0.12)', color: ACCENT, flexShrink: 0 }}>
                {i + 1}
              </span>
              <span style={{ fontSize: 22 }}>{s.emoji}</span>
            </div>
            <h3 style={{ fontWeight: 700, color: '#150F2E', fontSize: 15, marginBottom: 6 }}>{s.title}</h3>
            <p style={{ color: 'rgba(21,15,46,0.5)', fontSize: 13.5, lineHeight: 1.6 }}>{s.desc}</p>
          </div>
        ))}
      </div>
      <style>{`
        .how-step:hover { transform: translateY(-3px); box-shadow: 0 10px 26px rgba(124,58,237,0.12); }
      `}</style>
    </section>
  )
}
