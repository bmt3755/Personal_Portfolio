"use client"
import { useEffect, useRef, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"

const MONO = "'JetBrains Mono', monospace"
const SERIF = "Fraunces, serif"
const CMD = "Who_Am_I"
let introDone = false // module-level: once the reveal has played, re-mounts show the final state

// Terminal-style name reveal on the laptop screen. Waits for the preloader to finish
// (window 'intro:start'), then "types" the command and prints the name as the output —
// so the animation is actually visible instead of playing behind the loader.
export default function CodeIntro({ c }) {
  const reduced = useReducedMotion()
  const [typed, setTyped] = useState("")
  const [out, setOut] = useState(false)
  const started = useRef(false)

  useEffect(() => {
    if (reduced || introDone) { setTyped(CMD); setOut(true); introDone = true; return }

    const start = () => {
      if (started.current) return
      started.current = true
      let i = 0
      const t = setInterval(() => {
        i += 1
        setTyped(CMD.slice(0, i))
        if (i >= CMD.length) { clearInterval(t); setTimeout(() => { setOut(true); introDone = true }, 320) }
      }, 60)
    }

    window.addEventListener("intro:start", start)
    const fallback = setTimeout(start, 4500) // if the loader event is ever missed
    return () => { window.removeEventListener("intro:start", start); clearTimeout(fallback) }
  }, [reduced])

  return (
    <div style={{ width: "min(560px, 84vw)", textAlign: "left" }}>
      {/* command line */}
      <div style={{ fontFamily: MONO, fontSize: "0.9rem", fontWeight: 500, color: c.inkMuted, letterSpacing: "0.03em" }}>
        <span style={{ color: c.navy }}>$ </span>{typed}
        <span style={{
          display: "inline-block", width: 7, height: "1.05em", marginLeft: 3, verticalAlign: "-3px",
          background: c.navy, animation: reduced ? "none" : "caretBlink 1.05s step-end infinite",
        }} />
      </div>

      {/* printed output */}
      <motion.div
        initial={reduced ? false : { opacity: 0 }}
        animate={out ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.4 }}
        style={{ marginTop: 16 }}
      >
        <div style={{ fontFamily: SERIF, fontWeight: 600, fontSize: "clamp(2.1rem, 6.5vw, 4.2rem)", color: c.ink, lineHeight: 1.02, letterSpacing: "-0.015em", animation: (out && !reduced) ? "nameGlow 0.9s ease-out" : "none" }}>
          Manjeera Thogarcheti
        </div>
        <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: "0.78rem", color: c.navy, textTransform: "uppercase", letterSpacing: "0.14em", marginTop: 14 }}>
          AI & Systems Lead
        </div>
        <div style={{ fontFamily: MONO, fontSize: "0.7rem", fontWeight: 500, color: c.inkMuted, textTransform: "uppercase", letterSpacing: "0.12em", marginTop: 30 }}>
          scroll ↓
        </div>
      </motion.div>
    </div>
  )
}
