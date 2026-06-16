"use client"
import { ReactLenis } from 'lenis/react'
import { useEffect, useState } from 'react'

// Smooth-scroll momentum (kriss.ai feel). Drops out entirely under reduced-motion.
// Initial render keeps lenis ON so server + first client markup match (no hydration flash);
// it switches off after mount if the user prefers reduced motion.
export default function SmoothScroll({ children }) {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const onChange = (e) => setReduced(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  if (reduced) return <>{children}</>

  return (
    <ReactLenis root options={{ lerp: 0.1, smoothWheel: true }}>
      {children}
    </ReactLenis>
  )
}
