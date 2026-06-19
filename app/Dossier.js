"use client"
import { useState, useEffect } from "react"
import { Github } from "lucide-react"
import { useLenis } from "lenis/react"

// Reusable, data-driven case-file dossier: L1 plain (everyone) → L2 technical (engineers
// expand) → L3 source link. Colors passed in via `c` so it matches whatever surface it sits on.
// Used inside the Journey slide AND the reduced-motion fallback.

const MONO = "'JetBrains Mono', monospace"
const SERIF = "Fraunces, serif"
const SANS = "Inter, sans-serif"

export default function Dossier({ data, project, n, total = 6, c, panel = false }) {
  const [open, setOpen] = useState(false)
  const lenis = useLenis()
  const para = { fontFamily: SANS, fontSize: "0.88rem", color: "#F6F1E8", marginTop: 12, lineHeight: 1.55 }

  // While the technical panel is open in a slide, freeze the journey: stop lenis (kills its
  // programmatic scroll) AND block native wheel everywhere except inside the panel card.
  useEffect(() => {
    if (!(panel && open)) return
    lenis?.stop()
    const onWheel = (e) => {
      if (e.target?.closest?.("[data-dossier-scroll]")) return // allow panel's own scroll
      e.preventDefault()
    }
    window.addEventListener("wheel", onWheel, { passive: false, capture: true })
    return () => {
      window.removeEventListener("wheel", onWheel, { capture: true })
      lenis?.start()
    }
  }, [panel, open, lenis])

  return (
    <div style={{ maxWidth: 620, margin: "0 auto", textAlign: "left" }}>

      {/* Header */}
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <span style={{ fontFamily: MONO, fontSize: "0.68rem", color: c.navy, textTransform: "uppercase", letterSpacing: "0.1em" }}>{project.tag}</span>
        <span style={{ fontFamily: MONO, fontSize: "0.68rem", color: c.inkFaint }}>{String(n).padStart(2, "0")} / {String(total).padStart(2, "0")}</span>
      </div>
      <h3 style={{ fontFamily: SERIF, fontWeight: 600, fontSize: "clamp(1.5rem, 3vw, 2.2rem)", color: c.ink, lineHeight: 1.1, letterSpacing: "-0.01em", marginTop: 6 }}>{project.title}</h3>
      <div style={{ fontFamily: MONO, fontSize: "0.68rem", color: c.inkFaint, marginTop: 7, letterSpacing: "0.04em" }}>{data.subtitle}</div>

      {/* L1 — stakes + decision */}
      <p style={para}>{data.stakes}</p>
      <p style={para}>{data.decision}</p>

      {/* HITL stamp + plain note — only where the project genuinely has a human gate */}
      {data.stamp && (
        <div style={{ marginTop: 16 }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px",
            border: `1.5px solid ${c.stamp}80`, borderRadius: 3, color: c.stamp, background: `${c.stamp}1A`,
            transform: "rotate(-0.7deg)", fontFamily: MONO, fontSize: "0.6rem", letterSpacing: "0.07em", textTransform: "uppercase",
          }}>
            <span style={{ fontSize: "0.75rem" }}>⊕</span>{data.stamp}
          </span>
          {data.hitlNote && <p style={{ fontFamily: SANS, fontSize: "0.8rem", color: "#DCD3C8", marginTop: 9, lineHeight: 1.5 }}>{data.hitlNote}</p>}
        </div>
      )}

      {/* Proof */}
      {data.proof && <p style={{ fontFamily: MONO, fontSize: "0.7rem", color: c.ink, marginTop: 14 }}>✓ {data.proof}</p>}

      {/* Tech tags */}
      {data.tech?.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 11 }}>
          {data.tech.map((t) => (
            <span key={t} style={{ fontFamily: MONO, fontSize: "0.58rem", color: c.inkMuted, border: `1px solid ${c.border}`, borderRadius: 3, padding: "2px 7px" }}>{t}</span>
          ))}
        </div>
      )}

      {/* L2 — technical detail. In a slide it opens a scrollable panel (holds the journey);
          on the flat page it just expands inline. */}
      <button onClick={() => setOpen((o) => !o)} style={{
        marginTop: 16, cursor: "pointer",
        display: "inline-flex", alignItems: "center", gap: 8,
        fontFamily: MONO, fontSize: "0.7rem", color: c.navy, letterSpacing: "0.06em", textTransform: "uppercase",
        background: `${c.navy}14`, border: `1px solid ${c.navy}66`, borderRadius: 20, padding: "6px 13px",
      }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: c.navy, animation: "dossierPulse 1.15s ease-in-out infinite" }} />
        {open && !panel ? "Hide technical detail" : "Technical detail"}
      </button>

      {/* inline expand — flat page only */}
      {open && !panel && (
        <div style={{ marginTop: 11, borderLeft: `2px solid ${c.border}`, paddingLeft: 13, display: "grid", gap: 9 }}>
          {data.technical.map(([label, text]) => (
            <div key={label}>
              <div style={{ fontFamily: MONO, fontSize: "0.58rem", color: c.navy, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
              <div style={{ fontFamily: SANS, fontSize: "0.8rem", color: c.inkMuted, marginTop: 3, lineHeight: 1.5 }}>{text}</div>
            </div>
          ))}
        </div>
      )}

      {/* scrollable panel — in a slide. Its own scroll + data-lenis-prevent so the journey
          stays put while reading; ✕ or backdrop closes. */}
      {open && panel && (
        <div data-lenis-prevent onClick={() => setOpen(false)} style={{
          position: "absolute", inset: 0, zIndex: 50, background: "rgba(6,5,9,0.72)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: "4vh 1.5rem",
        }}>
          <div data-dossier-scroll data-lenis-prevent onClick={(e) => e.stopPropagation()} style={{
            maxWidth: 600, width: "100%", maxHeight: "82vh", overflowY: "auto", overscrollBehavior: "contain",
            background: c.bg, border: `1px solid ${c.border}`, borderRadius: 10,
            padding: "1.4rem 1.5rem 1.75rem", boxShadow: "0 30px 80px rgba(0,0,0,0.6)", textAlign: "left",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <span style={{ fontFamily: MONO, fontSize: "0.7rem", color: c.navy, textTransform: "uppercase", letterSpacing: "0.1em" }}>Technical detail</span>
              <button onClick={() => setOpen(false)} aria-label="Close" style={{ background: "none", border: "none", color: c.inkFaint, cursor: "pointer", fontSize: "1.1rem", lineHeight: 1, padding: 4 }}>✕</button>
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              {data.technical.map(([label, text]) => (
                <div key={label}>
                  <div style={{ fontFamily: MONO, fontSize: "0.58rem", color: c.navy, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
                  <div style={{ fontFamily: SANS, fontSize: "0.84rem", color: c.inkMuted, marginTop: 3, lineHeight: 1.55 }}>{text}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* L3 — source (omitted for proprietary client work) */}
      {data.source && (
        <div style={{ marginTop: 16 }}>
          <a href={data.source} target="_blank" rel="noopener noreferrer" style={{
            display: "inline-flex", alignItems: "center", gap: 7, fontFamily: MONO, fontSize: "0.68rem",
            color: c.navy, textDecoration: "none", borderBottom: `1px solid ${c.navy}55`, paddingBottom: 2,
          }}>
            <Github size={14} /> VIEW SOURCE
          </a>
        </div>
      )}
    </div>
  )
}
