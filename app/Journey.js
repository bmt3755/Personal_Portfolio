"use client"
import { useRef, useState, useEffect } from "react"
import { motion, useScroll, useTransform, useMotionTemplate, useReducedMotion } from "framer-motion"

// ─── Phase 0: grid-hub dive engine (Option A) ───────────────────────────────────
// Desk → dive into the monitor → the screen becomes a 3×2 GRID of project tiles.
// Scroll zooms INTO a tile (fills screen, detail overlays) → back OUT to the grid →
// into the next → … → out of the monitor → rest on the desk.
//
// Mechanic: ONE "board" of six viewport-sized tiles. Rest = zoomed-out overview
// (whole board scaled down so all 6 show). Focus = board scaled to 1× and shifted
// so tile N lands dead-center. Uniform scale throughout → no image distortion.
// All geometry in vw/vh (no window measurement) so useScroll binds on first render.
// Engine: framer-motion transforms only. Zero new deps. Real images land in Phase 1.

const D = {
  bg: "#14110C", ink: "#F2ECE1", inkMuted: "#B0A697", inkFaint: "#7C7264",
  navy: "#7FA8D4", stamp: "#D6A271", border: "#332D24",
}

const PROJECTS = [
  { tag: "Construction / AEC",        title: "Change Order Management Agent",   body: "Supervisor · LangGraph — checkpoint persistence for a legal audit trail.", hitl: "PM approves before any escalation email sends",        tint: ["#1B2535", "#0F131B"], img: "/images/construction.png" },
  { tag: "Insurance / FinTech",       title: "Insurance Claim Processing Agent", body: "Router · LangGraph — conditional routing to isolated specialists.",        hitl: "NEEDS_REVIEW (5–7) routes to a human adjuster",       tint: ["#15271F", "#0D1512"], img: "/images/insurance.png" },
  { tag: "Healthcare / MedTech",      title: "Patient Briefing System",          body: "Supervisor + Parallel — PHI redacted before the graph runs.",             hitl: "PHI never reaches an LLM",                            tint: ["#251B30", "#140F1A"], img: "/images/briefing.png" },
  { tag: "FinTech / Banking",         title: "Loan Default Risk Monitor",        body: "5 parallel risk dimensions — latency cut 5×.",                            hitl: "Banker decides: STABLE / WATCH / AT_RISK / CRITICAL", tint: ["#2A2017", "#15100A"], img: "/images/loan.png" },
  { tag: "Healthcare / Clinical Ops", title: "Readmission Risk Prediction",      body: "6 parallel dimensions — scored in under 5 seconds.",                      hitl: "Clinician decides intervention level",                tint: ["#1C2733", "#0E141A"], img: "/images/readmission.png" },
  { tag: "Construction / AEC",        title: "RFI Triage & Response Agent",      body: "Router + conditional fork — validates priority before routing.",           hitl: "Low confidence → human research path, no auto-send",  tint: ["#142621", "#0C1411"], img: "/images/rfi.png" },
]

const COLS = 3, ROWS = 2
const PITCH = 1.15      // tile spacing in viewports (>1 → gaps show only in overview)
const S_O = 0.28        // overview scale: whole board fits on screen
const TRACK_VH = 1200   // total scroll length of the journey

// Per-project share of the 0→1 timeline. GRID_IN = grid revealed; GRID_OUT = last exit.
const GRID_IN = 0.12, GRID_OUT = 0.90
const BLOCK = (GRID_OUT - GRID_IN) / PROJECTS.length
const blockStart = (k) => GRID_IN + k * BLOCK

// Tile center offset from board center, in vw / vh.
const offX = (i) => (i % COLS - (COLS - 1) / 2) * PITCH * 100
const offY = (i) => (Math.floor(i / COLS) - (ROWS - 1) / 2) * PITCH * 100

// Camera keyframes: overview (o) ↔ each tile, returning to overview between each.
const STOPS = (() => {
  const s = [{ p: 0, t: "o" }, { p: 0.07, t: "o" }, { p: GRID_IN, t: "o" }]
  for (let k = 0; k < PROJECTS.length; k++) {
    const b = blockStart(k)
    s.push({ p: b + 0.045, t: k }, { p: b + 0.085, t: k }, { p: b + BLOCK, t: "o" })
  }
  s.push({ p: 1, t: "o" })
  return s
})()
const P_KEYS = STOPS.map(s => s.p)
const SC_KEYS = STOPS.map(s => (s.t === "o" ? S_O : 1))
const TX_KEYS = STOPS.map(s => (s.t === "o" ? 0 : -offX(s.t)))
const TY_KEYS = STOPS.map(s => (s.t === "o" ? 0 : -offY(s.t)))

function Monitor() {
  return (
    <div style={{
      width: "min(46vw, 520px)", aspectRatio: "16 / 10", borderRadius: 10,
      border: `1px solid ${D.border}`, background: "linear-gradient(160deg, #1d2a3a 0%, #0e1320 100%)",
      boxShadow: "0 30px 80px rgba(0,0,0,0.55)", padding: "14px 16px",
      display: "flex", flexDirection: "column", gap: 8,
    }}>
      {[0.7, 0.45, 0.55, 0.3].map((w, i) => (
        <span key={i} style={{ height: 5, width: `${w * 100}%`, borderRadius: 3, background: i === 3 ? D.navy : "rgba(242,236,225,0.22)" }} />
      ))}
    </div>
  )
}

function Stamp({ text }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px",
      border: `1.5px solid ${D.stamp}66`, borderRadius: 3, color: D.stamp, background: `${D.stamp}1A`,
      transform: "rotate(-0.7deg)", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.62rem",
      letterSpacing: "0.09em", textTransform: "uppercase",
    }}>
      <span style={{ fontSize: "0.75rem" }}>⊕</span>{text}
    </span>
  )
}

// A tile in the board: real photo (or placeholder tint) + a grid label that fades on zoom-in.
function Tile({ project, n, i, labelOpacity }) {
  const bg = project.img
    ? { backgroundImage: `url(${project.img})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { background: `radial-gradient(120% 120% at 50% 45%, ${project.tint[0]} 0%, ${project.tint[1]} 75%)` }
  return (
    <div style={{
      position: "absolute", left: 0, top: 0, width: "100vw", height: "100vh",
      transform: `translate(${offX(i)}vw, ${offY(i)}vh)`,
      display: "flex", alignItems: "center", justifyContent: "center", ...bg,
    }}>
      {/* scrim keeps the grid label readable over a photo; fades out as the tile fills the screen */}
      <motion.div style={{ position: "absolute", inset: 0, opacity: labelOpacity, background: "radial-gradient(120% 100% at 50% 50%, rgba(20,17,12,0.25) 0%, rgba(20,17,12,0.72) 100%)" }} />
      <motion.div style={{ position: "relative", opacity: labelOpacity, textAlign: "center", padding: "0 6%" }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.62rem", color: D.navy, textTransform: "uppercase", letterSpacing: "0.1em" }}>
          {String(n).padStart(2, "0")} · {project.tag}
        </div>
        <div style={{ fontFamily: "Fraunces, serif", fontWeight: 600, fontSize: "2.6rem", color: D.ink, marginTop: 10, lineHeight: 1.05 }}>
          {project.title}
        </div>
      </motion.div>
    </div>
  )
}

// Crisp (unscaled) detail layer for a tile — fades in only during that tile's focus.
function DetailOverlay({ progress, k, project, n }) {
  const b = blockStart(k)
  const opacity = useTransform(progress, [b + 0.02, b + 0.05, b + 0.085, b + 0.11], [0, 1, 1, 0])
  return (
    <motion.div style={{
      position: "absolute", inset: 0, opacity, pointerEvents: "none",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "radial-gradient(110% 80% at 50% 50%, rgba(14,11,8,0.66) 0%, rgba(14,11,8,0.86) 100%)",
    }}>
      <div style={{ maxWidth: 640, textAlign: "center", padding: "0 2rem", textShadow: "0 2px 22px rgba(0,0,0,0.75)" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 14, marginBottom: 16 }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.7rem", color: D.navy, textTransform: "uppercase", letterSpacing: "0.1em" }}>{project.tag}</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.7rem", color: D.inkFaint }}>{String(n).padStart(2, "0")} / 06</span>
        </div>
        <h3 style={{ fontFamily: "Fraunces, serif", fontWeight: 600, fontSize: "clamp(1.9rem, 4.5vw, 3.2rem)", color: D.ink, lineHeight: 1.08, letterSpacing: "-0.01em" }}>{project.title}</h3>
        <p style={{ fontFamily: "Inter, sans-serif", fontWeight: 400, fontSize: "1.05rem", color: "#E6DFD3", marginTop: 18, lineHeight: 1.5 }}>{project.body}</p>
        <div style={{ marginTop: 26 }}><Stamp text={project.hitl} /></div>
      </div>
    </motion.div>
  )
}

// Static stacked gallery — reduced-motion + small screens. No scroll-jacking.
function FlatFallback() {
  return (
    <section style={{ background: D.bg, padding: "4rem 1rem" }}>
      {PROJECTS.map((p, i) => (
        <div key={i} style={{ maxWidth: 760, margin: "0 auto 2.5rem", border: `1px solid ${D.border}`, borderRadius: 10, overflow: "hidden" }}>
          <div style={{ height: "34vh", display: "flex", alignItems: "center", justifyContent: "center", background: `radial-gradient(120% 120% at 50% 45%, ${p.tint[0]} 0%, ${p.tint[1]} 75%)` }}>
            <div style={{ fontFamily: "Fraunces, serif", fontWeight: 600, fontSize: "1.8rem", color: D.ink, textAlign: "center", padding: "0 1rem" }}>{p.title}</div>
          </div>
          <div style={{ padding: "1.5rem", textAlign: "center" }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.68rem", color: D.navy, textTransform: "uppercase", letterSpacing: "0.1em" }}>{String(i + 1).padStart(2, "0")} · {p.tag}</div>
            <p style={{ fontFamily: "Inter, sans-serif", fontWeight: 300, color: D.inkMuted, margin: "12px 0 18px", lineHeight: 1.5 }}>{p.body}</p>
            <Stamp text={p.hitl} />
          </div>
        </div>
      ))}
    </section>
  )
}

export default function Journey() {
  const reduced = useReducedMotion()
  const [small, setSmall] = useState(false)
  const trackRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: trackRef, offset: ["start start", "end end"] })

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)")
    const update = () => setSmall(mq.matches)
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])

  // Board "camera" + layer opacities (all hooks run unconditionally, before any return).
  const boardScale = useTransform(scrollYProgress, P_KEYS, SC_KEYS)
  const boardX = useTransform(scrollYProgress, P_KEYS, TX_KEYS)
  const boardY = useTransform(scrollYProgress, P_KEYS, TY_KEYS)
  const boardTransform = useMotionTemplate`translate(${boardX}vw, ${boardY}vh) scale(${boardScale})`
  const labelOpacity = useTransform(boardScale, [S_O, S_O + (1 - S_O) * 0.45], [1, 0])
  const deskOpacity = useTransform(scrollYProgress, [0, 0.045, 0.075, 0.93, 0.965, 1], [1, 1, 0, 0, 1, 1])
  const deskScale = useTransform(scrollYProgress, [0, 0.08, 0.93, 1], [1, 1.6, 1.25, 1])
  const boardOpacity = useTransform(scrollYProgress, [0.05, 0.085, 0.92, 0.95], [0, 1, 1, 0])

  if (reduced || small) return <FlatFallback />

  return (
    <section ref={trackRef} style={{ position: "relative", height: `${TRACK_VH}vh`, background: D.bg }}>
      <div style={{ position: "sticky", top: 0, height: "100vh", overflow: "hidden" }}>

        {/* DESK — real photo, scroll dives into it; intro + outro rest */}
        <motion.div style={{ position: "absolute", inset: 0, opacity: deskOpacity }}>
          <motion.div style={{ position: "absolute", inset: 0, scale: deskScale, backgroundImage: "url(/images/hero.png)", backgroundSize: "cover", backgroundPosition: "center", willChange: "transform" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(20,17,12,0.15) 0%, rgba(20,17,12,0) 35%, rgba(20,17,12,0.55) 100%)" }} />
          <div style={{ position: "absolute", left: 0, right: 0, bottom: "8%", textAlign: "center" }}>
            <h2 style={{ fontFamily: "Fraunces, serif", fontWeight: 600, fontSize: "clamp(1.8rem, 4vw, 3rem)", color: D.ink }}>The Architect's Desk</h2>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.72rem", color: D.inkFaint, textTransform: "uppercase", letterSpacing: "0.12em", marginTop: 12 }}>scroll to enter the monitor</p>
          </div>
        </motion.div>

        {/* BOARD — the zooming grid of tiles */}
        <motion.div style={{ position: "absolute", inset: 0, opacity: boardOpacity }}>
          <motion.div style={{ position: "absolute", left: 0, top: 0, width: "100vw", height: "100vh", transformOrigin: "center", transform: boardTransform, willChange: "transform" }}>
            {PROJECTS.map((project, i) => (
              <Tile key={i} project={project} n={i + 1} i={i} labelOpacity={labelOpacity} />
            ))}
          </motion.div>
        </motion.div>

        {/* DETAIL — crisp, unscaled overlays, one per tile */}
        {PROJECTS.map((project, i) => (
          <DetailOverlay key={i} progress={scrollYProgress} k={i} project={project} n={i + 1} />
        ))}

      </div>
    </section>
  )
}
