"use client"
import { useRef, useState, useEffect } from "react"
import { motion, useScroll, useTransform, useMotionTemplate, useReducedMotion, useMotionValueEvent } from "framer-motion"
import Dossier from "./Dossier"
import CodeIntro from "./CodeIntro"

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
  bg: "#14110C", ink: "#EFE6CF", inkMuted: "#B0A697", inkFaint: "#7C7264",
  navy: "#D79A4F", stamp: "#D6A271", border: "#332D24",
}

// Persistent warm blend over every photo tile — keeps cool-toned shots (medical blue,
// rainy blue scenes) on-palette even at full zoom. Two stacked layers:
//   • "color" shifts the actual hue of blue areas warm (works on dark photos where overlay can't)
//   • "overlay" adds warmth/richness to the midtones
// Tuning knobs: nudge op up = warmer (color drives hue, overlay drives glow).
const WARM = [
  { color: "#C9803A", blend: "color",   op: 0.22 },
  { color: "#CC8438", blend: "overlay", op: 0.26 },
]

// Full dossier content for Case File 01 (the vertical slice). Others get the short overlay until built.
const CO_DOSSIER = {
  subtitle: "LangGraph workflow · human approval built in",
  stakes: "On big construction jobs, change orders are where money gets lost and fights start. Each one takes hours to review by hand, and a single misplaced approval can turn into an expensive legal dispute. This build handles one start to finish: it reads the change order, checks it against the contract, estimates the cost, decides if it's in scope, and routes it to the right person to approve.",
  decision: "The hard part: it has to pause for a human to approve, then resume exactly where it left off — a basic script can't do that. Built on LangGraph, it saves its progress as it goes, so it survives the wait (or a crash) and picks back up. And when it isn't sure, it stops and asks a person instead of guessing.",
  stamp: "A person approves before any escalation email sends",
  hitlNote: "The system does all the work, then stops — the email sits as a draft until a human says yes (or rejects it).",
  proof: "20 automated tests pass — including 2 that run the whole thing end to end.",
  tech: ["Python", "LangGraph", "SQLite", "ChromaDB", "Pydantic", "LangSmith"],
  source: "https://github.com/bmt3755/change-order-agent",
  technical: [
    ["Pattern", "Fixed LangGraph workflow: read → (check contract + estimate cost in parallel) → scope ruling → confidence gate → route → (assemble + audit in parallel) → pause for human approval."],
    ["State", "Typed state (Pydantic). Progress is saved to SQLite under each order's ID, so it resumes exactly where it paused — even after a crash."],
    ["Human gate", "Two checkpoints: a low-confidence gate that halts for a person, and an interrupt that pauses before completion for sign-off."],
    ["Tests", "18 unit checks + 2 end-to-end runs against live OpenAI + ChromaDB."],
  ],
}

const PROJECTS = [
  { tag: "Construction / AEC",        title: "Change Order Management Agent",   body: "Supervisor · LangGraph — checkpoint persistence for a legal audit trail.", hitl: "PM approves before any escalation email sends",        tint: ["#2A2014", "#130D07"], img: "/images/construction.png", dossier: CO_DOSSIER },
  { tag: "Insurance / FinTech",       title: "Insurance Claim Processing Agent", body: "Router · LangGraph — conditional routing to isolated specialists.",        hitl: "NEEDS_REVIEW (5–7) routes to a human adjuster",       tint: ["#26220F", "#110F06"], img: "/images/insurance.png" },
  { tag: "Healthcare / MedTech",      title: "Patient Briefing System",          body: "Supervisor + Parallel — PHI redacted before the graph runs.",             hitl: "PHI never reaches an LLM",                            tint: ["#281A2A", "#140D15"], img: "/images/briefing.png" },
  { tag: "FinTech / Banking",         title: "Loan Default Risk Monitor",        body: "5 parallel risk dimensions — latency cut 5×.",                            hitl: "Banker decides: STABLE / WATCH / AT_RISK / CRITICAL", tint: ["#2A2017", "#15100A"], img: "/images/loan.png" },
  { tag: "Healthcare / Clinical Ops", title: "Readmission Risk Prediction",      body: "6 parallel dimensions — scored in under 5 seconds.",                      hitl: "Clinician decides intervention level",                tint: ["#2C1D15", "#150D09"], img: "/images/readmission.png" },
  { tag: "Construction / AEC",        title: "RFI Triage & Response Agent",      body: "Router + conditional fork — validates priority before routing.",           hitl: "Low confidence → human research path, no auto-send",  tint: ["#262011", "#110E06"], img: "/images/rfi.png" },
]

const COLS = 3, ROWS = 2
const PITCH = 1.15      // tile spacing in viewports (>1 → gaps show only in overview)
const S_O = 0.28        // overview scale: whole board fits on screen
const TRACK_VH = 1200   // total scroll length of the journey

// Per-project share of the 0→1 timeline. GRID_IN = grid revealed; GRID_OUT = last exit.
const GRID_IN = 0.32, GRID_OUT = 0.90
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
      border: `1px solid ${D.border}`, background: "linear-gradient(160deg, #2a2114 0%, #120d07 100%)",
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
      {/* persistent warm blend — subtly shifts cool photos toward the palette, even at full zoom */}
      {project.img && WARM.map((w, wi) => (
        <div key={`warm${wi}`} style={{ position: "absolute", inset: 0, background: w.color, mixBlendMode: w.blend, opacity: w.op, pointerEvents: "none" }} />
      ))}
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

// Full case-file dossier overlay (project #1) — holds steady in focus and is interactive
// (expander + source link). pointer-events only enabled while this project is in focus.
function DossierOverlay({ progress, k, project, n }) {
  const b = blockStart(k)
  const opacity = useTransform(progress, [b + 0.02, b + 0.05, b + 0.085, b + 0.11], [0, 1, 1, 0])
  const [inFocus, setInFocus] = useState(false)
  useMotionValueEvent(progress, "change", (v) => {
    const on = v >= b + 0.035 && v <= b + 0.10
    setInFocus((prev) => (prev === on ? prev : on))
  })
  return (
    <motion.div style={{
      position: "absolute", inset: 0, opacity, display: "flex", alignItems: "center", justifyContent: "center",
      background: "radial-gradient(120% 95% at 50% 50%, rgba(10,8,14,0.9) 0%, rgba(8,6,11,0.97) 100%)",
      pointerEvents: "none",
    }}>
      <div style={{ pointerEvents: inFocus ? "auto" : "none", maxWidth: 680, width: "100%", padding: "3vh 2rem" }}>
        <Dossier data={project.dossier} project={project} n={n} c={D} panel />
      </div>
    </motion.div>
  )
}

// Static stacked gallery — reduced-motion + small screens. No scroll-jacking.
// Real photo header; #1 shows the full dossier, the rest the short blurb (until built).
function FlatFallback() {
  return (
    <section style={{ background: D.bg, padding: "4rem 1rem" }}>
      {PROJECTS.map((p, i) => {
        const headerBg = p.img
          ? { backgroundImage: `url(${p.img})`, backgroundSize: "cover", backgroundPosition: "center" }
          : { background: `radial-gradient(120% 120% at 50% 45%, ${p.tint[0]} 0%, ${p.tint[1]} 75%)` }
        return (
          <div key={i} style={{ maxWidth: 760, margin: "0 auto 2.5rem", border: `1px solid ${D.border}`, borderRadius: 10, overflow: "hidden" }}>
            <div style={{ height: "28vh", ...headerBg }} />
            <div style={{ padding: "1.75rem" }}>
              {p.dossier ? (
                <Dossier data={p.dossier} project={p} n={i + 1} c={D} />
              ) : (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.68rem", color: D.navy, textTransform: "uppercase", letterSpacing: "0.1em" }}>{String(i + 1).padStart(2, "0")} · {p.tag}</div>
                  <div style={{ fontFamily: "Fraunces, serif", fontWeight: 600, fontSize: "1.4rem", color: D.ink, marginTop: 8 }}>{p.title}</div>
                  <p style={{ fontFamily: "Inter, sans-serif", fontWeight: 300, color: D.inkMuted, margin: "12px 0 18px", lineHeight: 1.5 }}>{p.body}</p>
                  <Stamp text={p.hitl} />
                </div>
              )}
            </div>
          </div>
        )
      })}
    </section>
  )
}

export default function Journey() {
  const reduced = useReducedMotion()
  const [small, setSmall] = useState(false)
  const [introOn, setIntroOn] = useState(true)
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

  // Desk camera: laptop close-up (0) → out to full desk (~0.20) → into the monitor (~0.30) → grid.
  // Desk reappears for the outro. Pan via translate (laptop = left, monitor = center).
  const KP = [0, 0.10, 0.20, 0.30, 0.90, 1.0]
  const deskScale = useTransform(scrollYProgress, KP, [2.4, 2.35, 1.0, 2.6, 1.35, 1.0])
  const deskX = useTransform(scrollYProgress, KP, [57.6, 56, 0, -10.4, 0, 0])
  const deskY = useTransform(scrollYProgress, KP, [14.4, 14, 0, 41.6, 0, 0])
  const deskTransform = useMotionTemplate`translate(${deskX}%, ${deskY}%) scale(${deskScale})`
  const deskOpacity = useTransform(scrollYProgress, [0, 0.27, 0.31, 0.90, 0.94, 1], [1, 1, 0, 0, 1, 1])
  const codeIntroOpacity = useTransform(scrollYProgress, [0, 0.10, 0.17], [1, 1, 0])
  const boardOpacity = useTransform(scrollYProgress, [0.28, 0.33, 0.88, 0.92], [0, 1, 1, 0])

  // Hard-remove the code intro past the laptop phase so it can never ghost over the grid.
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    setIntroOn((prev) => { const on = v < 0.18; return prev === on ? prev : on })
  })

  if (reduced || small) return <FlatFallback />

  return (
    <section ref={trackRef} style={{ position: "relative", height: `${TRACK_VH}vh`, background: D.bg }}>
      <div style={{ position: "sticky", top: 0, height: "100vh", overflow: "hidden" }}>

        {/* DESK — real photo. Camera: laptop close-up → out to full desk → into the monitor. */}
        <motion.div style={{ position: "absolute", inset: 0, opacity: deskOpacity }}>
          <motion.div style={{ position: "absolute", inset: 0, transformOrigin: "center", transform: deskTransform, backgroundImage: "url(/images/hero.png)", backgroundSize: "cover", backgroundPosition: "center", willChange: "transform" }} />
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(125% 100% at 50% 45%, rgba(10,8,14,0.35) 0%, rgba(8,6,11,0.78) 100%)" }} />
        </motion.div>

        {/* CODE INTRO — name printed on the laptop screen; UNMOUNTS past the intro (no stranded layer/ghost). */}
        {introOn && (
          <motion.div style={{ position: "absolute", inset: 0, opacity: codeIntroOpacity, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 2rem", pointerEvents: "none" }}>
            <CodeIntro c={D} />
          </motion.div>
        )}

        {/* BOARD — the zooming grid of tiles */}
        <motion.div style={{ position: "absolute", inset: 0, opacity: boardOpacity }}>
          <motion.div style={{ position: "absolute", left: 0, top: 0, width: "100vw", height: "100vh", transformOrigin: "center", transform: boardTransform, willChange: "transform" }}>
            {PROJECTS.map((project, i) => (
              <Tile key={i} project={project} n={i + 1} i={i} labelOpacity={labelOpacity} />
            ))}
          </motion.div>
        </motion.div>

        {/* DETAIL — crisp, unscaled overlays, one per tile (#1 = full dossier) */}
        {PROJECTS.map((project, i) => (
          project.dossier
            ? <DossierOverlay key={i} progress={scrollYProgress} k={i} project={project} n={i + 1} />
            : <DetailOverlay key={i} progress={scrollYProgress} k={i} project={project} n={i + 1} />
        ))}

      </div>
    </section>
  )
}
