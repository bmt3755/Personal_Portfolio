"use client"
import { useRef, useEffect, useState } from "react"
import { motion, useScroll, useTransform, useInView, useReducedMotion, animate } from "framer-motion"

// Experience — single-column timeline. A spine draws as you scroll, the centered
// role brightens (others dim), key metrics count up, framework chips stamp in with
// the HITL tilt, and the live "Present" role pulses. Colors passed in via `c` so the
// section matches the page tokens (same pattern as Dossier.js).

const MONO = "'JetBrains Mono', monospace"
const SERIF = "Fraunces, serif"
const SANS = "Inter, sans-serif"

// Map each experience tag to a framework color key (reuses the page's FW palette).
const TAG_FW = {
  "LangGraph": "langgraph",
  "CrewAI": "crewai",
  "OpenAI": "openai", "OpenAI SDK": "openai", "Function-calling": "openai", "Tool-calling": "openai",
  "RAG": "rag", "React/TS": "rag", "Redux": "rag",
}

// Counts up to `to` once in view; instant under reduced-motion. (Local copy — the
// hardening pass will hoist shared helpers into one module.)
function CountUp({ to, prefix = "", suffix = "" }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.6 })
  const reduced = useReducedMotion()
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!inView) return
    if (reduced) { setVal(to); return }
    const controls = animate(0, to, {
      duration: 1, ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setVal(Math.round(v)),
    })
    return () => controls.stop()
  }, [inView, to, reduced])
  return <span ref={ref}>{prefix}{val}{suffix}</span>
}

// One bullet: a bigger color-coded framework chip leads the text inline (every bullet
// shares one clean left edge). Body text sits smaller so the framework reads first.
// `metric` (optional) counts up inline.
function Item({ item, c, fw, idx, reduced }) {
  const s = fw[TAG_FW[item.tag] || "rag"]
  const chip = {
    fontFamily: MONO, fontSize: "0.74rem", fontWeight: 500, letterSpacing: "0.01em",
    color: s.color, background: s.bg, border: `1px solid ${s.border}`,
    padding: "2px 9px", borderRadius: 4, whiteSpace: "nowrap",
    display: "inline-block", verticalAlign: "middle", marginRight: 11, position: "relative", top: -1,
  }
  const metric = { fontFamily: MONO, fontWeight: 600, color: s.color }
  return (
    <p style={{ fontFamily: SANS, fontSize: "0.79rem", color: c.inkMuted, lineHeight: 1.6, margin: "16px 0 0" }}>
      {item.tag && (
        reduced ? (
          <span style={{ ...chip, transform: "rotate(-0.7deg)" }}>{item.tag}</span>
        ) : (
          <motion.span
            style={chip}
            initial={{ opacity: 0, scale: 0.7, rotate: -8 }}
            whileInView={{ opacity: 1, scale: 1, rotate: -0.7 }}
            viewport={{ once: true, amount: 0.8 }}
            transition={{ duration: 0.4, delay: idx * 0.05, ease: [0.34, 1.56, 0.64, 1] }}
          >
            {item.tag}
          </motion.span>
        )
      )}
      {item.metric
        ? <>{item.pre}<span style={metric}><CountUp to={item.metric.to} prefix={item.metric.prefix || ""} suffix={item.metric.suffix || ""} /></span>{item.post}</>
        : item.text}
    </p>
  )
}

// One role on the spine: dot + header + (client blocks | earlier-role lines).
function Node({ node, c, fw, reduced }) {
  const ref = useRef(null)
  // "Active" when the node sits in the central scroll band → brighten; others dim.
  const centered = useInView(ref, { margin: "-35% 0px -35% 0px" })
  const active = reduced || centered

  return (
    <motion.div
      ref={ref}
      style={{ position: "relative", paddingBottom: 56 }}
      initial={{ opacity: 0, y: reduced ? 0 : 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Dot centered on the spine (track padding is 36; -36 lands it on the line at x≈7) */}
      {node.present && !reduced ? (
        <motion.span
          style={{
            position: "absolute", left: -36, top: 6, width: 14, height: 14, borderRadius: "50%",
            background: c.navy, border: `2px solid ${c.navy}`, boxSizing: "border-box",
          }}
          animate={{ boxShadow: [`0 0 0 0 ${c.navy}55`, `0 0 0 7px ${c.navy}00`] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
        />
      ) : (
        <span style={{
          position: "absolute", left: -36, top: 6, width: 14, height: 14, borderRadius: "50%",
          background: active ? c.navy : c.surface2, border: `2px solid ${active ? c.navy : c.border}`,
          boxSizing: "border-box", transition: "background 0.4s, border-color 0.4s",
        }} />
      )}

      {/* Brightness focus wrapper */}
      <motion.div animate={{ opacity: active ? 1 : 0.5 }} transition={{ duration: 0.4 }}>

        {/* Header */}
        <h3 style={{ fontFamily: SERIF, fontWeight: 600, fontSize: "1.2rem", color: c.ink, lineHeight: 1.2, margin: 0 }}>
          {node.role || node.company}
        </h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem 0.9rem", marginTop: 5 }}>
          {node.role && <span style={{ fontFamily: SANS, fontSize: "0.85rem", fontWeight: 500, color: c.navy }}>{node.company}</span>}
          <span style={{ fontFamily: MONO, fontSize: "0.68rem", color: c.inkFaint }}>
            {node.period}{node.location ? ` · ${node.location}` : ""}
          </span>
        </div>

        {/* Client blocks (current + prior roles) */}
        {node.clients && node.clients.map((cl, i) => (
          <div key={i} style={{ marginTop: i === 0 ? 22 : 30 }}>
            <div style={{ fontFamily: MONO, fontSize: "0.66rem", color: c.inkFaint, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              <span style={{ color: c.ink }}>{cl.name}</span>{cl.location ? ` · ${cl.location}` : ""}
            </div>
            {cl.items.map((it, j) => <Item key={j} item={it} c={c} fw={fw} idx={j} reduced={reduced} />)}
          </div>
        ))}

        {/* Earlier-career compact lines */}
        {node.roles && (
          <div style={{ marginTop: 14 }}>
            {node.roles.map((r, i) => (
              <div key={i} style={{ marginTop: 14 }}>
                <div style={{ fontFamily: SANS, fontSize: "0.9rem", color: c.ink }}>
                  <span style={{ fontWeight: 600 }}>{r.org}</span>
                  <span style={{ color: c.inkMuted }}> — {r.title}</span>
                  <span style={{ fontFamily: MONO, fontSize: "0.66rem", color: c.inkFaint }}> · {r.period}</span>
                </div>
                <p style={{ fontFamily: SANS, fontSize: "0.79rem", color: c.inkMuted, lineHeight: 1.5, margin: "4px 0 0" }}>
                  {r.metric
                    ? <>{r.pre}<span style={{ fontFamily: MONO, fontWeight: 600, color: c.navy }}><CountUp to={r.metric.to} prefix={r.metric.prefix || ""} suffix={r.metric.suffix || ""} /></span>{r.post}</>
                    : r.text}
                </p>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

export default function Experience({ data, c, fw }) {
  const reduced = useReducedMotion()
  const trackRef = useRef(null)
  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start 70%", "end 35%"],
  })
  const spineScale = useTransform(scrollYProgress, [0, 1], [0, 1])

  return (
    <section id="experience" style={{ background: c.bg, scrollMarginTop: 70, padding: "6rem 0" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 2rem" }}>

        {/* Heading */}
        <span style={{ fontFamily: MONO, color: c.navy, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.09em" }}>
          Experience
        </span>
        <h2 style={{ fontFamily: SERIF, fontSize: "2.5rem", lineHeight: 1.1, marginTop: "1rem", letterSpacing: "-0.01em" }}>
          <span style={{ display: "block", fontWeight: 600, color: c.ink }}>Where the systems</span>
          <span style={{ display: "block", fontWeight: 300, fontStyle: "italic", color: c.inkMuted }}>ran in production.</span>
        </h2>

        {/* Timeline — full width so one-liners don't wrap */}
        <div ref={trackRef} style={{ position: "relative", paddingLeft: 36, marginTop: "3rem" }}>
          {/* Spine track (faint) + drawn line (accent) */}
          <div style={{ position: "absolute", left: 6, top: 6, bottom: 6, width: 2, background: c.border }} />
          <motion.div
            style={{
              position: "absolute", left: 6, top: 6, bottom: 6, width: 2,
              background: `linear-gradient(${c.navy}, ${c.navy}00)`,
              transformOrigin: "top", scaleY: reduced ? 1 : spineScale,
            }}
          />
          {data.map((node, i) => <Node key={i} node={node} c={c} fw={fw} reduced={reduced} />)}
        </div>

      </div>
    </section>
  )
}
