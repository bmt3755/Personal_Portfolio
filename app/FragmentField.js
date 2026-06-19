"use client"

// Drifting "fragment field" — a faint, fixed full-screen backdrop of handwritten
// LLM / RAG terms + loose doodle shapes, like notes scribbled on the architect's
// desk. Drifts behind the whole site AND over the Journey photos (zIndex 1:
// above the Journey z0, behind the translucent content z2).
//
// Pure CSS motion (keyframes in globals.css) — no hooks, no deps. Reduced-motion
// and mobile (fewer fragments, no shapes) handled by media queries in globals.css.

// Single visibility knob: scales every fragment's opacity. Up = more present.
const OP = 3.5
// Drift-speed knob: multiplies every duration. Lower = faster. (1 = original pace.)
const SPEED = 0.22

// 10 fragments, spread across the viewport, biased to the edges so they don't
// crowd the hero name / tile titles. m = hidden on mobile · accent = violet.
const FRAGMENTS = [
  { t: "Agentic RAG",         top: "10%", left: "6%",  size: 0.92, op: 0.16, dx: 22,  dy: 14,  dur: 26 },
  { t: "HyDE",                top: "8%",  left: "44%", size: 0.96, op: 0.16, dx: -12, dy: 18,  dur: 22 },
  { t: "Graph RAG",           top: "14%", left: "74%", size: 0.86, op: 0.14, dx: -18, dy: 20,  dur: 30, m: true },
  { t: "human-in-the-loop →", top: "30%", left: "82%", size: 0.90, op: 0.17, dx: -16, dy: 18,  dur: 24, accent: true },
  { t: "checkpoint persists", top: "40%", left: "5%",  size: 0.82, op: 0.13, dx: 18,  dy: 16,  dur: 30 },
  { t: "RAG-Fusion",          top: "52%", left: "78%", size: 0.88, op: 0.14, dx: -22, dy: -14, dur: 27, m: true },
  { t: "Corrective RAG",      top: "70%", left: "10%", size: 0.90, op: 0.13, dx: 16,  dy: -18, dur: 28 },
  { t: "embeddings",          top: "76%", left: "46%", size: 0.84, op: 0.13, dx: -16, dy: 16,  dur: 25 },
  { t: "Self-RAG",            top: "82%", left: "70%", size: 0.84, op: 0.12, dx: -20, dy: -12, dur: 24, m: true },
  { t: "function-calling",    top: "88%", left: "24%", size: 0.82, op: 0.12, dx: 16,  dy: -12, dur: 28, m: true },
]

export default function FragmentField({ c }) {
  const violet = "#B095D9" // the theme's violet undertone (matches FW.openai)
  return (
    <div className="fragfield" aria-hidden="true" style={{
      position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none", overflow: "hidden",
    }}>
      {/* Faint violet orbit ring — slow rotation; an ellipse so the motion reads. */}
      <div className="shape" style={{
        position: "absolute", top: "50%", left: "50%",
        width: "72vw", height: "64vh", marginTop: "-32vh", marginLeft: "-36vw",
        transformOrigin: "center", animation: "orbitSpin 28s linear infinite",
      }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `1px solid ${violet}22` }} />
        <div style={{ position: "absolute", top: -3, left: "50%", width: 5, height: 5, marginLeft: -2.5, borderRadius: "50%", background: `${violet}66` }} />
      </div>

      {/* The drifting handwritten term fragments. */}
      {FRAGMENTS.map((f, i) => {
        const op = Math.min(f.op * OP, 0.55)
        return (
        <span
          key={i}
          className={`frag${f.m ? " frag-m" : ""}`}
          style={{
            position: "absolute", top: f.top, left: f.left,
            fontFamily: "'Caveat', cursive", fontWeight: 400,
            fontSize: `${(f.size * 1.35).toFixed(2)}rem`, letterSpacing: "0", whiteSpace: "nowrap",
            color: f.accent ? violet : c.inkFaint,
            opacity: op,
            textShadow: "0 1px 12px rgba(0,0,0,0.5)", // legible over bright photo areas
            "--op": op, "--dx": `${f.dx}px`, "--dy": `${f.dy}px`,
            animation: `fragDrift ${(f.dur * SPEED).toFixed(1)}s ease-in-out infinite`,
            animationDelay: `-${(i * 1.7).toFixed(1)}s`,
            willChange: "transform",
          }}
        >
          {f.t}
        </span>
        )
      })}
    </div>
  )
}
