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

// Case Files 02–06 — same shape as #1 (plain L1 + technical L2). Content from the résumé
// portfolio; proof line only where real tests exist (#5, #6). Sources are the real repos.
const INSURANCE_DOSSIER = {
  subtitle: "LangGraph router · borderline calls go to a human",
  stakes: "Insurance claims come in four very different shapes — auto, health, property, travel — and each needs its own checks. Sorting and processing them by hand is slow, and the decisions come out inconsistent. This build reads a claim, works out which type it is, and hands it to the one specialist that knows how to check that exact kind.",
  decision: "The smart part is keeping the four specialists fully separate. Each only knows its own job, so the auto-claim logic can be fixed or improved without touching health, property, or travel. The router just reads the claim and points it to the right door — and it never forces a verdict it isn't sure about.",
  stamp: "Borderline scores go to a human adjuster",
  hitlNote: "Clear cases get a straight APPROVE or DENY. Anything in the grey middle is marked NEEDS_REVIEW and handed to a person — the system won't guess on a close call.",
  tech: ["Python", "LangGraph", "OpenAI", "Pydantic"],
  source: "https://github.com/bmt3755/insurance-claim-system",
  technical: [
    ["Pattern", "Router → 4 isolated specialist agents (auto / health / property / travel). The router classifies the claim; only the matching specialist runs."],
    ["Decision logic", "Each specialist returns a score: >7 APPROVE, <5 DENY, 5–7 NEEDS_REVIEW (human)."],
    ["Isolation", "Zero cross-agent dependencies — one file per agent, each independently testable and replaceable."],
    ["Validation", "Pydantic schema on every claim input and agent output."],
  ],
}

const BRIEFING_DOSSIER = {
  subtitle: "Parallel agents · PHI redacted before anything runs",
  stakes: "A health-system strategy team needed clear briefings built from patient PDFs — the condition, the standard treatment, what's emerging, and which providers are involved. The catch: those records hold sensitive personal health information that must never reach an outside AI model.",
  decision: "The non-negotiable comes first: strip out every piece of personal health information before any work starts. The system keeps the raw record sealed and only ever shows the agents a redacted copy. Several agents then read it at once, and the final briefing notes which agent found each fact.",
  stamp: "PHI never reaches an LLM",
  hitlNote: "Redaction is a hard checkpoint before the graph runs — the original text stays sealed, only a scrubbed copy moves forward, and every chunk is tagged so one patient's data can't surface in another's query.",
  tech: ["Python", "LangGraph", "ChromaDB", "pymupdf", "pytesseract", "Pydantic", "Gradio"],
  source: "https://github.com/bmt3755/Patient_Briefing_System",
  technical: [
    ["Pattern", "Supervisor + parallel: Condition, Standard-Care, and Provider agents run together; Treatment Research runs once the condition is confirmed; a Debrief agent synthesizes all four."],
    ["Redaction", "State separates original_text (never leaves the system) from redacted_text (what agents see); redaction is confirmed before execution begins."],
    ["Access control", "patient_id + org_id on every state entry, and ACL tags on every ChromaDB chunk to prevent cross-patient leakage."],
    ["Audit", "Per-agent status, timestamp, and error logged; the final briefing cites which agent produced each finding. Gradio clinical UI."],
  ],
}

const LOAN_DOSSIER = {
  subtitle: "5 parallel risk checks · the banker decides",
  stakes: "By the time a borrower misses a payment, it's usually too late. Banks want to catch rising risk early — a dropping credit score, income falling, debt creeping up. This build watches active borrowers and flags trouble before the miss, so someone can step in with a payment plan instead of collections.",
  decision: "The five risk signals don't depend on each other, so the system checks all five at once instead of one after another — a 5× speed-up. A plain math layer (no AI) turns the scores into a clear rating, and the AI only explains it and suggests an action. The banker makes the actual call.",
  stamp: "Banker decides: STABLE / WATCH / AT_RISK / CRITICAL",
  hitlNote: "The system rates the risk and recommends a step — do nothing, send a reminder, offer a payment plan, or escalate — but a banker chooses what actually happens.",
  tech: ["Python", "LangGraph", "ChromaDB", "Pydantic", "LangSmith"],
  source: "https://github.com/bmt3755/Loan_Default_Risk_System",
  technical: [
    ["Pattern", "Supervisor spawns 5 parallel checkers (credit, transactions, payment history, external signals, debt-to-income), then 3 sequential steps: risk calc → explanation → action."],
    ["Risk layer", "A deterministic math calculator (no LLM) averages the scores and applies thresholds → STABLE / WATCH / AT_RISK / CRITICAL. The model never sets the rating."],
    ["Memory", "ChromaDB RAG layer for historical comparison across a borrower's record."],
    ["Guardrails", "Pydantic range checks on every checker; safe-default fallbacks so a failed checker never crashes the run. LangSmith tracing."],
  ],
}

const READMISSION_DOSSIER = {
  subtitle: "6 parallel checks · scored before the patient leaves",
  stakes: "A busy hospital discharges 200+ patients a day. To send the right ones home with extra follow-up, staff need a readmission-risk score fast — within seconds of discharge, not hours later when the window has closed.",
  decision: "Six risk angles, all independent — so the system runs them at the same time to hit an under-5-second target. One after another it'd be roughly 3× slower and miss the moment. A math layer combines the six into one score, the AI explains it, and a router sets the follow-up level. The clinician decides the actual intervention.",
  stamp: "Clinician decides the intervention level",
  hitlNote: "The system scores the risk and routes it — standard discharge, enhanced follow-up, or immediate intervention — but the clinician makes the care decision.",
  proof: "Smoke + end-to-end tests (pytest).",
  tech: ["Python", "LangGraph", "OpenAI", "Pydantic"],
  source: "https://github.com/bmt3755/Patient_Readmission_System",
  technical: [
    ["Pattern", "Supervisor + 6 parallel analyzers (history, current condition, meds, social factors, appointment compliance, disease-specific), then 3 sequential: score → explanation → escalation routing."],
    ["Latency", "All 6 run in parallel to meet a <5s budget at 200+ discharges/day; sequential would be ~3× slower."],
    ["Scoring", "A math calculator (no LLM) composites the six; each agent returns a score (1–10), a LOW/MEDIUM/HIGH label, and a reason."],
    ["Tests", "Smoke + end-to-end (pytest)."],
  ],
}

const RFI_DOSSIER = {
  subtitle: "Router + conditional fork · low confidence goes to a human",
  stakes: "Construction teams get dozens of RFIs a day — each needs the right drawing, spec, or contract clause found, an answer drafted, and a clean record kept. A wrong answer can become evidence in a dispute, so accuracy and a paper trail matter as much as speed.",
  decision: "Two safeguards make it trustworthy. It reads the legal fields with plain code, not an AI, so there's no model guesswork on the record. And before it trusts a priority label, a check confirms the label was actually computed — not left at a default. When confidence is low, it hands the RFI to a person instead of auto-sending.",
  stamp: "Low confidence → human research path, no auto-send",
  hitlNote: "High-confidence answers are drafted with a cite-and-verify check; anything uncertain is routed to a human-research path that lays out the verified facts without auto-sending a reply.",
  proof: "Smoke + end-to-end tests (pytest).",
  tech: ["Python", "LangGraph", "ChromaDB", "Pydantic", "LangSmith"],
  source: "https://github.com/bmt3755/RFI_Triage_System",
  technical: [
    ["Pattern", "Router + conditional fork. Read & Extract (code, no LLM) → parallel keyword + semantic search → priority check → a graph edge validates the label before routing to draft-and-send or hand-research."],
    ["Extraction", "Legal form fields pulled deterministically by code — no model risk on the record."],
    ["Cite-and-verify", "The draft path makes the model name its source, then verifies that source actually appears in the visible reply; bounded retry (2 attempts) on citation failure."],
    ["Search", "Exact-word (keyword) + meaning-based (vector) run in parallel, so an exact code like 'Sheet M202' isn't missed by semantic search alone."],
    ["Tests", "Smoke + end-to-end (pytest). LangSmith tracing."],
  ],
}

const PROJECTS = [
  { tag: "Construction / AEC",        title: "Change Order Management Agent",   body: "Supervisor · LangGraph — checkpoint persistence for a legal audit trail.", hitl: "PM approves before any escalation email sends",        tint: ["#2A2014", "#130D07"], img: "/images/construction.png", dossier: CO_DOSSIER },
  { tag: "Insurance / FinTech",       title: "Insurance Claim Processing Agent", body: "Router · LangGraph — conditional routing to isolated specialists.",        hitl: "NEEDS_REVIEW (5–7) routes to a human adjuster",       tint: ["#26220F", "#110F06"], img: "/images/insurance.png", dossier: INSURANCE_DOSSIER },
  { tag: "Healthcare / MedTech",      title: "Patient Briefing System",          body: "Supervisor + Parallel — PHI redacted before the graph runs.",             hitl: "PHI never reaches an LLM",                            tint: ["#281A2A", "#140D15"], img: "/images/briefing.png", dossier: BRIEFING_DOSSIER },
  { tag: "FinTech / Banking",         title: "Loan Default Risk Monitor",        body: "5 parallel risk dimensions — latency cut 5×.",                            hitl: "Banker decides: STABLE / WATCH / AT_RISK / CRITICAL", tint: ["#2A2017", "#15100A"], img: "/images/loan.png", dossier: LOAN_DOSSIER },
  { tag: "Healthcare / Clinical Ops", title: "Readmission Risk Prediction",      body: "6 parallel dimensions — scored in under 5 seconds.",                      hitl: "Clinician decides intervention level",                tint: ["#2C1D15", "#150D09"], img: "/images/readmission.png", dossier: READMISSION_DOSSIER },
  { tag: "Construction / AEC",        title: "RFI Triage & Response Agent",      body: "Router + conditional fork — validates priority before routing.",           hitl: "Low confidence → human research path, no auto-send",  tint: ["#262011", "#110E06"], img: "/images/rfi.png", dossier: RFI_DOSSIER },
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
