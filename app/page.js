"use client"
import { useEffect, useRef, useState } from "react"
import { motion, useScroll, useTransform, useInView, animate, useReducedMotion } from "framer-motion"
import { useLenis } from "lenis/react"
import { ArrowUpRight, Mail, Github, Linkedin } from "lucide-react"

// Scroll-driven dive journey (desk photo → 6 projects → desk).
import Journey from "./Journey"

// ─── Design Tokens ────────────────────────────────────────────────────────────

// ── Theme tokens (warm/purple dark) ──
const C = {
  bg:          "#16131D",
  surface:     "#1E1A28",
  surface2:    "#272132",
  ink:         "#F2ECE1",
  inkMuted:    "#B3A8B8",
  inkFaint:    "#7E7388",
  navy:        "#8AA9D6",
  navyDim:     "rgba(138,169,214,0.10)",
  stamp:       "#D8A36E",
  stampBg:     "rgba(216,163,110,0.10)",
  border:      "#322B3D",
  borderLight: "#252031",
}

const FW = {
  langgraph: { color: "#8AA9D6", bg: "rgba(138,169,214,0.10)", border: "rgba(138,169,214,0.30)" },
  crewai:    { color: "#5FBBA0", bg: "rgba(95,187,160,0.10)",  border: "rgba(95,187,160,0.30)" },
  openai:    { color: "#B095D9", bg: "rgba(176,149,217,0.10)", border: "rgba(176,149,217,0.30)" },
  rag:       { color: "#9AA4BC", bg: "rgba(154,164,188,0.10)", border: "rgba(154,164,188,0.30)" },
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const projects = [
  {
    domain: "Construction / AEC",
    title: "Change Order Management Agent",
    pattern: "Supervisor · LangGraph",
    stack: ["Python", "LangGraph", "ChromaDB", "SQLite", "Pydantic", "LangSmith"],
    stakes: "A $400M hospital build. 400–600 hours manually processing 200 change orders. A $2M dispute went to litigation because no one could find the original approval email.",
    chosen: "LangGraph",
    rejected: "CrewAI",
    why: "Checkpoint persistence survives server crashes. Legal audit trail required deterministic SQLite state — not role-based assembly.",
    hitl: "PM approves before any escalation email sends",
    tests: "20/20 tests passing",
  },
  {
    domain: "Insurance / FinTech",
    title: "Insurance Claim Processing Agent",
    pattern: "Router · LangGraph",
    stack: ["Python", "LangGraph", "OpenAI", "Pydantic"],
    stakes: "Four claim types — auto, health, property, travel — each with domain-specific validation. Manual triage was slow and produced inconsistent decisions.",
    chosen: "LangGraph Router",
    rejected: "Monolithic agent",
    why: "Conditional routing to isolated specialist agents. Each specialist is independently testable and replaceable without touching the others.",
    hitl: "NEEDS_REVIEW (score 5–7) routes to human adjuster",
    tests: null,
  },
  {
    domain: "Healthcare / MedTech",
    title: "Healthcare Patient Briefing System",
    pattern: "Supervisor + Parallel · LangGraph",
    stack: ["Python", "LangGraph", "ChromaDB", "pymupdf", "pytesseract", "Pydantic", "Gradio"],
    stakes: "A health system strategy team needed structured briefings from PHI-sensitive PDFs — condition, standard of care, emerging treatments, provider context.",
    chosen: "LangGraph",
    rejected: "Single-pass summarization",
    why: "PHI redaction must happen before graph execution begins. State schema separates original_text from redacted_text. Per-agent audit trail required for compliance.",
    hitl: "PHI never reaches an LLM — redacted before graph runs",
    tests: null,
  },
  {
    domain: "FinTech / Banking",
    title: "Loan Default Risk Monitor",
    pattern: "Supervisor + 5 Parallel · LangGraph",
    stack: ["Python", "LangGraph", "ChromaDB", "Pydantic", "LangSmith"],
    stakes: "Banks need to catch rising default risk before a missed payment. Income drops, credit deterioration, debt-to-income changes — after the fact is too late.",
    chosen: "LangGraph",
    rejected: "Sequential checks",
    why: "5 risk dimensions are fully independent — parallel execution cuts latency 5×. ChromaDB RAG enables historical comparison across borrower records.",
    hitl: "Action recommended — STABLE / WATCH / AT_RISK / CRITICAL. Banker decides.",
    tests: null,
  },
  {
    domain: "Healthcare / Clinical Ops",
    title: "Patient Readmission Risk Prediction",
    pattern: "Supervisor + 6 Parallel · LangGraph",
    stack: ["Python", "LangGraph", "OpenAI", "Pydantic"],
    stakes: "200+ patient discharges per day. Readmission risk scores needed in under 5 seconds to trigger appropriate follow-up care.",
    chosen: "LangGraph",
    rejected: "Sequential pipeline",
    why: "6 dimensions are independent — parallelism is what hits the 5-second target. Sequential would take 3× longer and miss the clinical window.",
    hitl: "Risk scored — clinician decides intervention level",
    tests: null,
  },
  {
    domain: "Construction / AEC",
    title: "RFI Triage and Response Agent",
    pattern: "Router + Conditional Fork · LangGraph",
    stack: ["Python", "LangGraph", "ChromaDB", "Pydantic", "LangSmith"],
    stakes: "Dozens of RFIs daily. Each requires finding the right drawing, spec, or contract clause. A wrong answer is evidence in a construction dispute.",
    chosen: "LangGraph",
    rejected: "Single search + auto-send",
    why: "Conditional edge validates priority label integrity before routing — catches default-value-as-answer failures. Two search types (semantic + keyword) prevent exact-code lookup gaps.",
    hitl: "Low confidence → human research path, no auto-send",
    tests: null,
  },
]

const fwRows = [
  {
    project: "Payment ID Sync",
    company: "Orange Carrot",
    fw: "LangGraph",
    fwKey: "langgraph",
    rejected: "Plain Python script",
    why: "RID had to survive server crashes mid-payment. Checkpointing prevented double charges on restart.",
  },
  {
    project: "SKU Sync (ActiveCampaign)",
    company: "Orange Carrot",
    fw: "CrewAI",
    fwKey: "crewai",
    rejected: "LangGraph",
    why: "Simple assembly line: clean data, push it. No state persistence needed. CrewAI's sequential process was the right fit.",
  },
  {
    project: "Affiliate Traffic Tracking",
    company: "Orange Carrot",
    fw: "LangGraph",
    fwKey: "langgraph",
    rejected: "CrewAI",
    why: "State had to survive 20 minutes between landing and checkout. CrewAI can't pause and resume across time.",
  },
  {
    project: "Website Speed Audit",
    company: "Orange Carrot",
    fw: "CrewAI",
    fwKey: "crewai",
    rejected: "LangGraph",
    why: "Two agents, strict sequence. No routing, no state persistence. CrewAI's sequential process was cleaner.",
  },
  {
    project: "DoorDash Integration",
    company: "iCashout",
    fw: "OpenAI Function-calling",
    fwKey: "openai",
    rejected: "LangGraph / CrewAI",
    why: "Field mapping problem, not orchestration. AI reads messy payload and calls the right transformation function.",
  },
  {
    project: "Merchant Onboarding",
    company: "iCashout",
    fw: "OpenAI SDK",
    fwKey: "openai",
    rejected: "CrewAI",
    why: "State-dependent checklist with parallel terminal + store setup. Precise conditional logic per terminal type (Pax vs Valor).",
  },
  {
    project: "Support Escalations",
    company: "iCashout",
    fw: "RAG",
    fwKey: "rag",
    rejected: "Multi-agent framework",
    why: "Information retrieval problem, not task execution. ChromaDB retrieves 2–3 paragraphs. LLM answers from those only.",
  },
  {
    project: "Merchant Troubleshooting",
    company: "iCashout",
    fw: "OpenAI Tool-calling",
    fwKey: "openai",
    rejected: "LangGraph",
    why: "Parallel diagnostic checks (terminal, API key, plugin) fan in to one diagnosis. No persistent state needed.",
  },
]

const experience = [
  {
    role: "AI & Systems Lead — Multi-Agent Systems",
    company: "Orange Carrot (via Zignow LLC)",
    period: "Sep 2023 — Present",
    location: "West Palm Beach, FL",
    items: [
      { tag: "CrewAI",    text: "Improved Core Web Vitals 25% via automated image compression and font preloading workflows." },
      { tag: "LangGraph", text: "Eliminated payment ID mismatches with checkpoint-based state sync — 98% reduction in reconciliation errors." },
      { tag: "CrewAI",    text: "Automated WordPress-to-ActiveCampaign SKU sync with 100% data accuracy, resolving silent API failures." },
      { tag: "LangGraph", text: "Built multi-channel attribution with conditional routing — improved affiliate tracking accuracy by 40%." },
    ],
  },
  {
    role: "AI & Systems Lead — Agentic API & Integrations",
    company: "iCashout (via Zignow LLC)",
    period: "Sep 2023 — Present",
    location: "Jersey City, NJ",
    items: [
      { tag: "Function-calling", text: "Engineered DoorDash API integration for 10 partners, standardizing real-time data exchange across Java/Spring systems." },
      { tag: "OpenAI SDK",       text: "Accelerated merchant activation by 20% by automating state-dependent backend technical lifecycles." },
      { tag: "RAG",              text: "Reduced support escalations by 15% with RAG-powered documentation for Pax and Valor terminal setup." },
      { tag: "Tool-calling",     text: "Improved merchant self-service by providing real-time automated backend troubleshooting on WooCommerce." },
    ],
  },
  {
    role: "Software Engineer — Frontend & AI Integration",
    company: "BestBuy (via Cloud Integrator Inc.)",
    period: "Jan 2022 — Aug 2023",
    location: "Remote",
    items: [
      { tag: "OpenAI",        text: "Automated GraphQL schema mapping with experimental prompt-chaining — proved faster feature delivery to the team." },
      { tag: "React/TS",      text: "Engineered high-fidelity dynamic components from Figma designs into production-ready code." },
      { tag: "Component Lib", text: "Built universal Component Library (React/TypeScript) — reduced frontend integration time by 15%." },
      { tag: "Redux",         text: "Enhanced analytics data capture with Redux Toolkit, ensuring reliable performance monitoring." },
    ],
  },
  {
    role: "Earlier Career",
    company: "Trimble · Hyland Software · Cloud Integrator",
    period: "2016 — 2022",
    location: "OH / VA",
    items: [
      { tag: "Quality Eng",  text: "Managed quality engineering strategy at Trimble in SAFe environment — accelerated issue resolution by 25%." },
      { tag: "Product",      text: "Validated feature development against requirements at Hyland, bridging stakeholders and engineering." },
      { tag: "Integrations", text: "Architected Salesforce and ServiceNow integrations via Dell Boomi — reduced manual processing by 30%." },
    ],
  },
]

const skills = [
  {
    label: "AI & Orchestration",
    items: [
      "LangGraph (Supervisor, Router, Conditional edges)",
      "CrewAI (Sequential, Parallel crews)",
      "OpenAI SDK (Function-calling, Tool-calling)",
      "ChromaDB · RAG pipelines · LangSmith",
    ],
  },
  {
    label: "Safety & Compliance",
    items: [
      "PHI/PII redaction by design",
      "Human-in-the-loop interrupt + resume",
      "Deterministic audit logging (SQLite)",
      "Pydantic v2 — strict validation, enums, range checks",
    ],
  },
  {
    label: "Engineering",
    items: [
      "Python · React · TypeScript · Node.js",
      "Java · Spring · GraphQL · Dell Boomi",
      "LangGraph checkpoint persistence",
      "pytest (smoke + end-to-end)",
    ],
  },
  {
    label: "Product & Strategy",
    items: [
      "PSPO I (Professional Scrum Product Owner)",
      "Roadmap mapping · BPMN process design",
      "Salesforce · ServiceNow · AWS (exposure)",
      "CI/CD · Jenkins · System stability strategy",
    ],
  },
]

// ─── Scroll Reveal ────────────────────────────────────────────────────────────

// Reveal-on-scroll, framer-motion. Same API as before; honors reduced-motion.
function R({ children, style, className = '' }) {
  const reduced = useReducedMotion()
  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0, y: reduced ? 0 : 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

// Counts up to `to` when scrolled into view (e.g. 0 → 8). Instant under reduced-motion.
function CountUp({ to, suffix = '' }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.5 })
  const reduced = useReducedMotion()
  const [val, setVal] = useState(0)

  useEffect(() => {
    if (!inView) return
    if (reduced) { setVal(to); return }
    const controls = animate(0, to, {
      duration: 1.2, ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setVal(Math.round(v)),
    })
    return () => controls.stop()
  }, [inView, to, reduced])

  return <span ref={ref}>{val}{suffix}</span>
}

// ─── Helper Components ────────────────────────────────────────────────────────

function Badge({ label, fwKey }) {
  const s = FW[fwKey] || FW.rag
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: '3px',
      fontFamily: "'JetBrains Mono', monospace", fontSize: '0.68rem', fontWeight: 500,
      color: s.color, background: s.bg, border: `1px solid ${s.border}`, whiteSpace: 'nowrap'
    }}>
      {label}
    </span>
  )
}

function Stamp({ text }) {
  return (
    <span className="hitl">
      <span style={{ fontSize: '0.75rem' }}>⊕</span>
      {text}
    </span>
  )
}

function Mono({ children, style = {} }) {
  return (
    <span style={{ fontFamily: "'JetBrains Mono', monospace", ...style }}>
      {children}
    </span>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const lenis = useLenis()
  const reduced = useReducedMotion()

  // Route nav/CTA anchors through lenis so they keep the momentum feel and
  // clear the fixed 60px nav (offset replaces the old scrollMarginTop trick).
  const go = (e, href) => {
    e.preventDefault()
    const el = document.querySelector(href)
    if (!el) return
    if (lenis) lenis.scrollTo(el, { offset: -70 })
    else el.scrollIntoView({ behavior: 'smooth' })
  }

  // Hero entrance: stagger children in after the preloader lifts.
  const heroContainer = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: reduced ? 0 : 0.12,
        delayChildren: reduced ? 0 : 1.1,
      },
    },
  }
  const heroItem = {
    hidden: { opacity: 0, y: reduced ? 0 : 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
  }

  // Subtle parallax drift on the framework heading.
  const fwHeadingRef = useRef(null)
  const { scrollYProgress } = useScroll({
    target: fwHeadingRef,
    offset: ['start end', 'end start'],
  })
  const fwY = useTransform(scrollYProgress, [0, 1], [reduced ? 0 : 28, reduced ? 0 : -28])

  return (
    <div style={{ position: 'relative' }}>

      {/* Old robotic 3D table removed — the real-photo Journey is the cinematic now. */}

      <div style={{ position: 'relative', zIndex: 1 }}>

      {/* NAV */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(22,19,29,0.85)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderBottom: `1px solid ${C.borderLight}`,
      }}>
        <div style={{
          maxWidth: '1100px', margin: '0 auto', padding: '0 2rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: '60px',
        }}>
          <span style={{ fontFamily: 'Fraunces, serif', fontWeight: 600, fontSize: '1rem', color: C.ink }}>
            Manjeera T.
          </span>
          <div className="navlinks" style={{ display: 'flex', gap: '2rem' }}>
            {[
              { label: 'Framework',  href: '#framework'  },
              { label: 'Cases',      href: '#projects'   },
              { label: 'Experience', href: '#experience' },
              { label: 'Contact',    href: '#contact'    },
            ].map(({ label, href }) => (
              <a key={href} href={href} onClick={(e) => go(e, href)} className="navlink" style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: '0.86rem', fontWeight: 500,
                color: C.inkMuted, textDecoration: 'none',
              }}>
                {label}
              </a>
            ))}
          </div>
        </div>
      </nav>

      {/* IMMERSIVE JOURNEY — the architect's desk greets first (desk → 6 projects → desk) */}
      <Journey />

      {/* HERO */}
      <section style={{
        minHeight: '100vh',
        display: 'flex', alignItems: 'center',
        paddingTop: '80px', paddingBottom: '4rem',
        background: `radial-gradient(120% 80% at 20% -10%, rgba(150,110,210,0.14), transparent 55%), ${C.bg}`,
      }}>
        <motion.div
          variants={heroContainer} initial="hidden" animate="show"
          style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 2rem', width: '100%' }}
        >

          {/* Eyebrow */}
          <motion.div variants={heroItem} style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
            <span style={{ display: 'block', width: '2.5rem', borderTop: `1.5px solid ${C.navy}` }} />
            <Mono style={{ color: C.navy, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.09em' }}>
              AI & Systems Lead · Fremont, CA
            </Mono>
          </motion.div>

          {/* Philosophy (leads — the name now lives in the entry intro) */}
          <motion.div variants={heroItem} style={{ marginBottom: '2.5rem', lineHeight: 1.4 }}>
            <span style={{
              display: 'block',
              fontFamily: 'Fraunces, serif', fontWeight: 300, fontStyle: 'italic',
              color: C.inkMuted, fontSize: '1.2rem',
            }}>
              I build systems powerful enough to replace humans.
            </span>
            <span style={{
              display: 'block',
              fontFamily: 'Fraunces, serif', fontWeight: 400,
              color: C.ink, fontSize: '1.2rem',
            }}>
              So I design them not to.
            </span>
          </motion.div>

          {/* CTAs */}
          <motion.div variants={heroItem} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '4rem' }}>
            <a href="#projects" onClick={(e) => go(e, '#projects')} style={{
              display: 'inline-flex', alignItems: 'center',
              padding: '0.7rem 1.5rem', background: C.navy, color: C.bg,
              borderRadius: '4px', textDecoration: 'none',
              fontFamily: "'JetBrains Mono', monospace", fontSize: '0.78rem',
              border: `1px solid ${C.navy}`,
            }}>
              View Cases →
            </a>
            <a href="mailto:bramara.thogarcheti@gmail.com" className="ghostbtn" style={{
              display: 'inline-flex', alignItems: 'center',
              padding: '0.7rem 1.5rem',
              border: `1px solid ${C.border}`, color: C.inkMuted,
              borderRadius: '4px', textDecoration: 'none',
              fontFamily: "'JetBrains Mono', monospace", fontSize: '0.78rem',
            }}>
              Get in touch
            </a>
          </motion.div>

          {/* Stats strip */}
          <motion.div variants={heroItem} className="statsrow" style={{
            display: 'flex', gap: '3rem',
            borderTop: `1px solid ${C.border}`, paddingTop: '2rem',
          }}>
            {[
              { to: 8, suffix: '',  label: 'Production-grade agent systems'          },
              { to: 5, suffix: '',  label: 'Frameworks — each choice defended'        },
              { to: 7, suffix: '+', label: 'Years at the intersection of AI & systems' },
            ].map(s => (
              <div key={s.label}>
                <div style={{
                  fontFamily: 'Fraunces, serif', fontWeight: 700,
                  fontSize: '2.75rem', color: C.ink, lineHeight: 1,
                }}>
                  <CountUp to={s.to} suffix={s.suffix} />
                </div>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: '0.63rem',
                  textTransform: 'uppercase', color: C.inkFaint,
                  marginTop: '0.4rem', letterSpacing: '0.06em',
                }}>
                  {s.label}
                </div>
              </div>
            ))}
          </motion.div>

        </motion.div>
      </section>

      {/* FRAMEWORK INTELLIGENCE */}
      <section id="framework" style={{
        background: C.surface, scrollMarginTop: '70px',
        padding: '6rem 0',
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 2rem' }}>
          <R>
            <Mono style={{ color: C.navy, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.09em' }}>
              Framework Intelligence
            </Mono>

            <motion.h2 ref={fwHeadingRef} style={{
              fontFamily: 'Fraunces, serif', fontSize: '2.5rem', lineHeight: 1.1,
              marginTop: '1rem', letterSpacing: '-0.01em', y: fwY,
            }}>
              <span style={{ display: 'block', fontWeight: 600, color: C.ink }}>Eight projects. Five frameworks.</span>
              <span style={{ display: 'block', fontWeight: 300, fontStyle: 'italic', color: C.inkMuted }}>Every choice explained.</span>
            </motion.h2>

            <p style={{
              fontFamily: 'Inter, sans-serif', fontSize: '0.95rem', color: C.inkMuted,
              marginTop: '1.25rem', maxWidth: '620px', lineHeight: 1.6,
            }}>
              The right tool depends on the problem — not familiarity. Here's the full decision record.
            </p>

            <div className="fwtablewrap" style={{ marginTop: '2.5rem' }}>
              <table style={{
                width: '100%', minWidth: '680px', borderCollapse: 'collapse',
                fontFamily: 'Inter, sans-serif',
              }}>
                <thead>
                  <tr>
                    {['Project', 'Company', 'Chosen', 'Rejected', 'Why'].map(h => (
                      <th key={h} style={{
                        textAlign: 'left', padding: '0.75rem 1rem',
                        background: C.surface2, color: C.inkMuted,
                        fontFamily: "'JetBrains Mono', monospace", fontSize: '0.62rem',
                        fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em',
                        borderBottom: `1px solid ${C.border}`,
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fwRows.map((row, i) => (
                    <tr key={i} className="fwrow">
                      <td style={{
                        padding: '0.9rem 1rem', borderBottom: `1px solid ${C.borderLight}`,
                        fontSize: '0.85rem', color: C.ink, fontWeight: 500, verticalAlign: 'top',
                      }}>
                        {row.project}
                      </td>
                      <td style={{
                        padding: '0.9rem 1rem', borderBottom: `1px solid ${C.borderLight}`,
                        fontSize: '0.82rem', color: C.inkMuted, verticalAlign: 'top', whiteSpace: 'nowrap',
                      }}>
                        {row.company}
                      </td>
                      <td style={{
                        padding: '0.9rem 1rem', borderBottom: `1px solid ${C.borderLight}`,
                        verticalAlign: 'top',
                      }}>
                        <Badge label={row.fw} fwKey={row.fwKey} />
                      </td>
                      <td style={{
                        padding: '0.9rem 1rem', borderBottom: `1px solid ${C.borderLight}`,
                        verticalAlign: 'top',
                      }}>
                        <Mono style={{
                          fontSize: '0.72rem', color: C.inkFaint,
                          textDecoration: 'line-through', whiteSpace: 'nowrap',
                        }}>
                          {row.rejected}
                        </Mono>
                      </td>
                      <td style={{
                        padding: '0.9rem 1rem', borderBottom: `1px solid ${C.borderLight}`,
                        verticalAlign: 'top',
                      }}>
                        <div style={{
                          maxWidth: '260px', fontSize: '0.82rem',
                          color: C.inkMuted, lineHeight: 1.5,
                        }}>
                          {row.why}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: '1.5rem',
              marginTop: '1.75rem',
            }}>
              {[
                { key: 'langgraph', name: 'LangGraph' },
                { key: 'crewai',    name: 'CrewAI'    },
                { key: 'openai',    name: 'OpenAI SDK' },
                { key: 'rag',       name: 'RAG'       },
              ].map(({ key, name }) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{
                    width: '9px', height: '9px', borderRadius: '50%',
                    background: FW[key].color, display: 'inline-block',
                  }} />
                  <Mono style={{ fontSize: '0.7rem', color: C.inkMuted }}>{name}</Mono>
                </div>
              ))}
            </div>
          </R>
        </div>
      </section>

      </div>
    </div>
  )
}
