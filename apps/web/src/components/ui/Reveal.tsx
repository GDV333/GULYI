'use client'
import { useEffect, useRef, useState } from 'react'

interface RevealProps {
  children: React.ReactNode
  /** задержка появления, мс — для лёгкого каскада внутри секции */
  delay?: number
  /** насколько поднимать при появлении, px */
  y?: number
  className?: string
  style?: React.CSSProperties
}

/**
 * Мягкое появление блока при вскролле: fade + подъём.
 * Безопасно деградирует — если нет IntersectionObserver, стоит reduced-motion
 * или что-то пошло не так, содержимое просто показывается (страховочный таймер).
 */
export function Reveal({ children, delay = 0, y = 18, className, style }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (!el || reduce || typeof IntersectionObserver === 'undefined') {
      setShown(true)
      return
    }
    const io = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting)) {
          setShown(true)
          io.disconnect()
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
    )
    io.observe(el)
    // страховка: показать в любом случае
    const t = window.setTimeout(() => setShown(true), 900)
    return () => {
      io.disconnect()
      window.clearTimeout(t)
    }
  }, [])

  return (
    <div
      ref={ref}
      data-reveal
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? 'none' : `translateY(${y}px)`,
        transition: `opacity .55s ease ${delay}ms, transform .65s cubic-bezier(.22,.68,.2,1) ${delay}ms`,
        willChange: shown ? 'auto' : 'opacity, transform',
        ...style,
      }}
    >
      {children}
    </div>
  )
}
