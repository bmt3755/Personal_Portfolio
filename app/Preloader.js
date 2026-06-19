"use client"
import { useEffect, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'

// Full-screen count-up preloader (the one confirmed kriss.ai signature).
// Fails open: a 4s hard cap dismisses it no matter what, so a stalled counter
// can never trap the user behind the overlay.
export default function Preloader() {
  const reduced = useReducedMotion()
  const [pct, setPct] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (reduced) { setDone(true); return }

    document.body.style.overflow = 'hidden'
    let cur = 0
    const tick = setInterval(() => {
      cur = Math.min(100, cur + Math.random() * 9 + 2)
      setPct(Math.round(cur))
      if (cur >= 100) {
        clearInterval(tick)
        setTimeout(() => setDone(true), 350)
      }
    }, 90)

    const hardCap = setTimeout(() => {
      clearInterval(tick)
      setPct(100)
      setDone(true)
    }, 4000)

    return () => {
      clearInterval(tick)
      clearTimeout(hardCap)
      document.body.style.overflow = ''
    }
  }, [reduced])

  useEffect(() => { if (done) document.body.style.overflow = '' }, [done])

  return (
    <AnimatePresence onExitComplete={() => window.dispatchEvent(new Event('intro:start'))}>
      {!done && (
        <motion.div
          initial={{ y: 0 }}
          exit={{ y: '-100%' }}
          transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'radial-gradient(circle at 30% 25%, rgba(216,162,76,0.13), transparent 60%), #160F12',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            padding: '2.5rem',
          }}
        >
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem',
            textTransform: 'uppercase', letterSpacing: '0.12em', color: '#8A7E66',
          }}>
            The Architect's Table
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <span style={{
              fontFamily: 'Fraunces, serif', fontWeight: 300, fontStyle: 'italic',
              fontSize: '1.1rem', color: '#B9AB93',
            }}>
              Precision before anything gets built.
            </span>
            <span style={{
              fontFamily: 'Fraunces, serif', fontWeight: 700,
              fontSize: 'clamp(3rem, 12vw, 7rem)', lineHeight: 0.9, color: '#EFE6CF',
            }}>
              {pct}
              <span style={{ color: '#D8A24C' }}>%</span>
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
