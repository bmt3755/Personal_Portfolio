"use client"
import { useEffect, useRef, useState } from "react"
import { motion, useScroll, useTransform, useInView, animate, useReducedMotion } from "framer-motion"
import { useLenis } from "lenis/react"
import { ArrowUpRight, Mail, Github, Linkedin } from "lucide-react"

// Scroll-driven dive journey (desk photo → 6 projects → desk).
import Journey from "./Journey"
// Drifting LLM/RAG fragment field — fixed global backdrop.
import FragmentField from "./FragmentField"
// Reusable project deep-dive panel (plain + technical), shared with the Case Files.
import Dossier from "./Dossier"

// ─── Design Tokens ────────────────────────────────────────────────────────────

// ── Theme tokens (warm/purple dark) ──
const C = {
  bg:          "#1A1019",
  surface:     "#251726",
  surface2:    "#301E31",
  ink:         "#EFE6CF",
  inkMuted:    "#AAA296",
  inkFaint:    "#837C70",
  navy:        "#D79A4F",
  navyDim:     "rgba(215,154,79,0.12)",
  gold:        "#D8A24C",
  stamp:       "#D8A36E",
  stampBg:     "rgba(216,163,110,0.10)",
  border:      "#352C22",
  borderLight: "#211B14",
}

const FW = {
  langgraph: { color: "#D9A45A", bg: "rgba(217,164,90,0.10)", border: "rgba(217,164,90,0.30)" },
  crewai:    { color: "#C9885E", bg: "rgba(201,136,94,0.10)", border: "rgba(201,136,94,0.30)" },
  openai:    { color: "#C39177", bg: "rgba(195,145,119,0.10)", border: "rgba(195,145,119,0.30)" },
  rag:       { color: "#B3A084", bg: "rgba(179,160,132,0.10)", border: "rgba(179,160,132,0.30)" },
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

// Career skeleton (employers + dates) — the thin strip above the table.
// Project depth now lives in the clickable Framework rows, not a separate section.
const career = [
  { org: "Zignow LLC", note: "Orange Carrot · iCashout", period: "Sep 2023 — Present" },
  { org: "Cloud Integrator / BestBuy", note: "Frontend & AI integration", period: "2022 — 23" },
  { org: "Trimble · Hyland · Cloud Integrator", note: "QA · Product · Integrations", period: "2016 — 22" },
]

// Per-project deep dives for the clickable Framework rows (keyed by row.project).
// Real client work → no public "View Source". HITL stamp only where it genuinely applies.
const dossiers = {
  "Payment ID Sync": {
    subtitle: "Orange Carrot · payment reconciliation · LangGraph checkpointing",
    stakes: "On a live payment system, a server crash mid-transaction can double-charge a customer or lose track of which payment belonged to whom. Support was logging around 45 of these reconciliation errors a month.",
    decision: "Built on LangGraph so the process saves its place as it runs — if it crashes, it resumes exactly where it stopped instead of starting over. A plain Python script keeps its state in memory, so a crash loses everything; that's why it was the wrong tool here despite being simpler.",
    proof: "Reconciliation errors ~45/month → near zero within 6 weeks of deploy.",
    tech: ["Python", "LangGraph", "Checkpointer", "CRM API"],
    technical: [
      ["Pattern", "Stateful sync graph with checkpoint persistence across distributed API nodes and backend CRM endpoints."],
      ["Why not a plain script", "In-memory state is lost on crash, risking double charges on restart. LangGraph's checkpointer persists state to durable storage, so a resumed run continues mid-payment safely."],
      ["Result", "Support-logged reconciliation errors dropped from ~45/mo to near zero within 6 weeks."],
    ],
  },
  "SKU Sync (ActiveCampaign)": {
    subtitle: "Orange Carrot · WordPress→ActiveCampaign · CrewAI checker/executor",
    stakes: "When a customer bought something, their product details had to copy cleanly from the website into the email marketing tool. Bad or incomplete data was getting silently rejected, so welcome emails quietly failed and nobody noticed.",
    decision: "This is a simple assembly line — clean the data, then push it. Built it as a two-agent CrewAI pair: one checks the data against the rules, the other sends it. LangGraph's crash-recovery and saved state would have been overkill here — there's nothing to pause and pick back up — so the simpler tool was the right call.",
    proof: "Zero campaign failures in the 4 weeks after launch.",
    tech: ["Python", "CrewAI", "RAG", "ActiveCampaign API"],
    technical: [
      ["Pattern", "CrewAI sequential crew — a Checker agent validates each payload against a RAG-retrieved copy of the ActiveCampaign API rulebook, then an Executor agent pushes the clean record."],
      ["Why not LangGraph", "No state to persist and nothing to pause or resume across time; a linear two-step pipeline doesn't need a graph or a checkpointer. CrewAI's sequential process maps to the work directly."],
      ["Result", "Eliminated the silent rejections that were breaking welcome emails — zero campaign failures over the 4-week post-deploy window."],
    ],
  },
  "Affiliate Traffic Tracking": {
    subtitle: "Orange Carrot · server-side attribution · LangGraph state",
    stakes: "There's often a 20-minute gap between someone clicking an affiliate link and actually checking out. Ad-blockers and iPhone privacy updates were wiping the tracking in between, so real sales weren't getting credited to the partners who drove them.",
    decision: "The tracking had to remember a visitor across that 20-minute gap and survive a page reload. Built on LangGraph because it can hold that state and resume later. CrewAI runs start-to-finish in one pass — it can't pause and wait across time — so it was the wrong fit.",
    proof: "~40% more attributed sales vs the old cookie setup (30-day window).",
    tech: ["Python", "LangGraph", "Conditional edges", "First-touch reducer"],
    technical: [
      ["Pattern", "Server-side tracking graph with a first-touch state reducer and conditional edges, holding attribution state across the 20-minute landing→checkout window."],
      ["Why not CrewAI", "CrewAI executes a crew once and finishes; it has no durable, resumable state to bridge a 20-minute gap or a page reload. LangGraph's persisted state is exactly that bridge."],
      ["Why server-side", "Moving attribution off the browser made it immune to ad-blockers and iOS cookie loss — where the prior setup was leaking sales."],
      ["Result", "Recovered ~40% more attributed conversions than the cookie-based setup over a matched 30-day window."],
    ],
  },
  "Website Speed Audit": {
    subtitle: "Orange Carrot · Core Web Vitals · CrewAI auditor/strategist",
    stakes: "Slow pages cost search ranking and sales. The team needed a repeatable way to find what's slow on a page and produce a concrete fix plan — without guesswork.",
    decision: "Built a two-agent CrewAI pipeline: an Auditor reads the performance data, a Strategist turns it into a specific fix plan. It's a strict two-step sequence with no branching or saved state, so CrewAI was cleaner than LangGraph.",
    stamp: "A PERSON REVIEWS EVERY FIX BEFORE IT SHIPS",
    hitlNote: "The AI writes the fix plan — it never deploys on its own. A human reviews it, runs it on a staging copy first, and only then pushes to production.",
    proof: "Mobile PageSpeed went mid-50s → low-70s (~25% faster).",
    tech: ["Python", "CrewAI", "Google PageSpeed API", "WP-CLI"],
    technical: [
      ["Pattern", "CrewAI Auditor/Strategist pipeline on the Google PageSpeed API; output is WP-CLI + CSS fix blueprints, not direct edits to the live site."],
      ["Human in the loop", "The generated blueprint is reviewed by a person, executed on staging, validated, then shipped to production — nothing auto-deploys."],
      ["Why not LangGraph", "Two agents in a fixed order, no routing or persistent state — a graph would add machinery with nothing to coordinate."],
      ["Result", "Mobile PageSpeed improved from the mid-50s to the low-70s (~25% gain); built with a FastAPI + DigitalOcean scale-out for multi-client rollout."],
    ],
  },
  "DoorDash Integration": {
    subtitle: "iCashout · 10 partners · OpenAI function-calling",
    stakes: "Ten partners each sent order data in their own messy format. DoorDash only accepts one strict format, so mismatched payloads were getting silently rejected and orders stalled.",
    decision: "This is a translation problem, not a multi-step workflow. The AI reads each messy payload and calls the right function to reshape it into DoorDash's schema. There's no orchestration or saved state to manage, so a full multi-agent framework would only add weight.",
    proof: "Silent API rejections eliminated across all 10 partner integrations.",
    tech: ["Python", "OpenAI function-calling", "Java/Spring"],
    technical: [
      ["Pattern", "OpenAI function-calling maps each partner's payload onto DoorDash's strict schema, choosing the right transformation per field; runs across Java/Spring systems."],
      ["Why not LangGraph/CrewAI", "There's no workflow to orchestrate and no state to keep between calls — it's field mapping. Function-calling does it directly; a framework would be overhead."],
      ["Result", "Zero rejection errors in post-deploy API logs across all 10 partner integrations — the silent failures that had blocked order flow were gone."],
    ],
  },
  "Merchant Onboarding": {
    subtitle: "iCashout · account · terminal · store provisioning",
    stakes: "Getting a new merchant live meant a backend checklist — create the account, configure the card terminal, connect their store — before they could take payments. Done by hand it was slow and inconsistent.",
    decision: "Built it on the OpenAI SDK so the terminal config and store connection run at the same time, before payment activation, with precise step-by-step logic per terminal type (Pax vs Valor). CrewAI's fixed sequence couldn't handle that conditional, parallel setup as cleanly.",
    proof: "~20% faster merchant activation vs the prior manual process.",
    tech: ["Python", "OpenAI SDK", "Parallel tasks"],
    technical: [
      ["Pattern", "Onboarding supervisor on the OpenAI SDK runs terminal configuration and store connection in parallel, then gates payment activation; conditional branches per terminal type (Pax vs Valor)."],
      ["Why not CrewAI", "The checklist is state-dependent with parallel branches and per-terminal conditionals — CrewAI's straight sequential process doesn't express that cleanly."],
      ["Result", "Cut merchant activation time ~20% against the prior manual onboarding average tracked by support."],
    ],
  },
  "Support Escalations": {
    subtitle: "iCashout · 500-page Pax/Valor manuals · ChromaDB RAG",
    stakes: "Support kept escalating the same terminal-setup questions, with the answers buried in 500-page Pax and Valor manuals. Slow for merchants, repetitive for the team.",
    decision: "This is a lookup problem, not a task to run. Built a RAG assistant that retrieves the 2–3 most relevant paragraphs for a question and answers from those only. A multi-agent framework would add coordination machinery with nothing to coordinate.",
    proof: "Terminal-setup tickets dropped ~40 → ~34/month (15%) over 6 weeks.",
    tech: ["Python", "ChromaDB", "RAG", "OpenAI"],
    technical: [
      ["Pattern", "ChromaDB retrieval over the chunked Pax/Valor manuals; the LLM answers strictly from the top 2–3 retrieved paragraphs — grounded, no free-form generation."],
      ["Why not a multi-agent framework", "There's no task to execute or hand off — just retrieve-then-answer. Multiple agents would be overhead for a single-step lookup."],
      ["Result", "Terminal-config ticket volume fell from ~40 to ~34 per month over the 6 weeks after deploy."],
    ],
  },
  "Merchant Troubleshooting": {
    subtitle: "iCashout · self-service diagnostics · OpenAI tool-calling",
    stakes: "When a merchant's setup broke, they sat waiting on support while basic things — terminal connection, API key, plugin status — went unchecked.",
    decision: "Built a diagnostic that checks terminal connection, API key, and WooCommerce plugin status all at once and reports back a single diagnosis. The checks are independent and there's no state to keep between runs, so LangGraph's persistence wasn't needed.",
    proof: "Cut merchant downtime per incident from hours to minutes.",
    tech: ["Python", "OpenAI tool-calling", "WooCommerce"],
    technical: [
      ["Pattern", "OpenAI tool-calling fires independent diagnostic checks (terminal connection, API key, WooCommerce plugin) in parallel, then fans in to one diagnosis."],
      ["Why not LangGraph", "Parallel, stateless checks that converge once — no persistent state or checkpointing to justify a graph."],
      ["Result", "Merchants resolved backend errors themselves, cutting average downtime per incident from hours to minutes."],
    ],
  },
}

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

// Rejected option: strike draws across once the table settles into view, staggered
// row by row, then STAYS struck (decision record — every rejected option is crossed out).
function RejectedStrike({ text, reduced, started, idx = 0 }) {
  return (
    <span style={{ position: 'relative', display: 'inline-block', whiteSpace: 'nowrap' }}>
      <Mono style={{ fontSize: '0.72rem', color: C.inkFaint }}>{text}</Mono>
      <motion.span
        aria-hidden
        style={{
          position: 'absolute', left: 0, right: 0, top: '52%', height: 1.2,
          background: 'rgba(131,124,112,0.8)', transformOrigin: 'left',
        }}
        initial={{ scaleX: reduced ? 1 : 0 }}
        animate={{ scaleX: (reduced || started) ? 1 : 0 }}
        transition={{ duration: 0.45, ease: 'easeInOut', delay: reduced ? 0 : 0.7 + idx * 0.12 }}
      />
    </span>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const lenis = useLenis()
  const reduced = useReducedMotion()

  // Which Framework row's deep-dive panel is open (index into fwRows), or null.
  const [openRow, setOpenRow] = useState(null)

  // While the panel is open: freeze page scroll and let Escape close it.
  useEffect(() => {
    if (openRow == null) return
    lenis?.stop()
    const onKey = (e) => { if (e.key === 'Escape') setOpenRow(null) }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); lenis?.start() }
  }, [openRow, lenis])

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

  // One shared trigger for all the rejected-strike animations: fire once the table
  // is in view, then each line draws in staggered (see RejectedStrike).
  const fwTableRef = useRef(null)
  const fwTableInView = useInView(fwTableRef, { once: true, amount: 0.2 })

  return (
    <div style={{ position: 'relative' }}>

      {/* JOURNEY — lowest layer (zIndex 0); the fragment field drifts over its photos */}
      <div style={{ position: 'relative', zIndex: 0 }}>
        <Journey />
      </div>

      {/* Drifting LLM/RAG fragment field — fixed backdrop, above the Journey, behind content */}
      <FragmentField c={C} />

      {/* Content — zIndex 2, above the field; translucent section bgs let the field show through */}
      <div style={{ position: 'relative', zIndex: 2 }}>

      {/* NAV */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(26,16,25,0.85)',
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

      {/* HERO */}
      <section style={{
        minHeight: '100vh',
        display: 'flex', alignItems: 'center',
        paddingTop: '80px', paddingBottom: '4rem',
        background: `radial-gradient(120% 80% at 20% -10%, rgba(216,162,76,0.12), transparent 55%), rgba(26,16,25,0.66)`,
      }}>
        <motion.div
          variants={heroContainer} initial="hidden" animate="show"
          style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 2rem', width: '100%' }}
        >

          {/* Eyebrow */}
          <motion.div variants={heroItem} style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
            <span style={{ display: 'block', width: '2.5rem', borderTop: `1.5px solid ${C.gold}` }} />
            <Mono style={{ color: C.gold, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.09em' }}>
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
        background: 'rgba(37,23,38,0.66)', scrollMarginTop: '70px',
        padding: '6rem 0',
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 2rem' }}>
          <R>
            <Mono style={{ color: C.gold, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.09em' }}>
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
              The right tool depends on the problem — not familiarity. Here's the full decision record. <span style={{ color: C.navy }}>Click any row for the full story.</span>
            </p>

            {/* Career strip — employers + dates, the work-history skeleton */}
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: '0.5rem 2rem',
              marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: `1px solid ${C.borderLight}`,
            }}>
              {career.map((j) => (
                <div key={j.org} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Mono style={{ fontSize: '0.7rem', color: C.ink }}>{j.org}</Mono>
                  <Mono style={{ fontSize: '0.62rem', color: C.inkFaint, letterSpacing: '0.04em' }}>
                    {j.note} · {j.period}
                  </Mono>
                </div>
              ))}
            </div>

            <div ref={fwTableRef} className="fwtablewrap" style={{ marginTop: '2.5rem' }}>
              <table style={{
                width: '100%', minWidth: '680px', borderCollapse: 'collapse',
                fontFamily: 'Inter, sans-serif',
              }}>
                <thead>
                  <tr>
                    {['Project', 'Company', 'Chosen', 'Rejected', 'Why', ''].map((h, hi) => (
                      <th key={hi} style={{
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
                  {fwRows.map((row, i) => {
                    const hasDossier = !!dossiers[row.project]
                    return (
                    <tr key={i} className="fwrow"
                      onClick={hasDossier ? () => setOpenRow(i) : undefined}
                      style={{ cursor: hasDossier ? 'pointer' : 'default' }}
                    >
                      <td style={{
                        padding: '0.9rem 1rem', borderBottom: `1px solid ${C.borderLight}`,
                        fontSize: '0.85rem', color: C.ink, fontWeight: 500, verticalAlign: 'top',
                      }}>
                        {hasDossier && !reduced ? (
                          <motion.span
                            style={{ display: 'inline-block' }}
                            animate={{ opacity: [1, 0.5, 1] }}
                            transition={{ duration: 1.9, repeat: Infinity, ease: 'easeInOut' }}
                          >
                            {row.project}
                          </motion.span>
                        ) : row.project}
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
                        <RejectedStrike text={row.rejected} reduced={reduced} started={fwTableInView} idx={i} />
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
                      <td style={{
                        padding: '0.9rem 1rem', borderBottom: `1px solid ${C.borderLight}`,
                        verticalAlign: 'top', textAlign: 'right', whiteSpace: 'nowrap',
                      }}>
                        {hasDossier && (
                          <span className="openpill" style={{
                            fontFamily: "'JetBrains Mono', monospace", fontSize: '0.62rem', fontWeight: 500,
                            letterSpacing: '0.06em', color: C.navy,
                            border: `1px solid ${C.navy}55`, borderRadius: 20, padding: '4px 11px',
                          }}>
                            OPEN →
                          </span>
                        )}
                      </td>
                    </tr>
                    )
                  })}
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

      {/* CONTACT + FOOTER */}
      <section id="contact" style={{
        background: 'rgba(37,23,38,0.66)', scrollMarginTop: '70px',
        padding: '6rem 0 0',
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 2rem' }}>
          <R>
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: '3rem',
              justifyContent: 'space-between', alignItems: 'flex-start',
            }}>
              {/* Left — invitation */}
              <div style={{ maxWidth: '480px' }}>
                <Mono style={{ color: C.gold, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.09em' }}>
                  Contact
                </Mono>
                <h2 style={{
                  fontFamily: 'Fraunces, serif', fontSize: '2.5rem', lineHeight: 1.1,
                  marginTop: '1rem', letterSpacing: '-0.01em',
                }}>
                  <span style={{ display: 'block', fontWeight: 600, color: C.ink }}>Let&apos;s talk</span>
                  <span style={{ display: 'block', fontWeight: 300, fontStyle: 'italic', color: C.inkMuted }}>about hard problems.</span>
                </h2>
                <p style={{
                  fontFamily: 'Inter, sans-serif', fontSize: '0.95rem', color: C.inkMuted,
                  marginTop: '1.25rem', lineHeight: 1.6,
                }}>
                  Open to AI &amp; systems roles · Fremont, CA
                </p>
              </div>

              {/* Right — direct links */}
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: '300px', flex: '1 1 300px', maxWidth: '420px' }}>
                {[
                  { Icon: Mail,     label: 'Email',    value: 'bramara.thogarcheti@gmail.com', href: 'mailto:bramara.thogarcheti@gmail.com' },
                  { Icon: Github,   label: 'GitHub',   value: 'github.com/bmt3755',            href: 'https://github.com/bmt3755' },
                  { Icon: Linkedin, label: 'LinkedIn', value: 'linkedin.com/in/bmt-humane-ai', href: 'https://linkedin.com/in/bmt-humane-ai' },
                ].map(({ Icon, label, value, href }) => {
                  const ext = href.startsWith('http')
                  return (
                    <a key={label} href={href}
                      target={ext ? '_blank' : undefined}
                      rel={ext ? 'noopener noreferrer' : undefined}
                      className="contactrow"
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.9rem',
                        padding: '0.95rem 0.5rem', borderBottom: `1px solid ${C.borderLight}`,
                        textDecoration: 'none', color: C.ink,
                      }}>
                      <Icon size={18} color={C.navy} strokeWidth={1.6} />
                      <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Mono style={{ fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: C.inkFaint }}>{label}</Mono>
                        <Mono style={{ fontSize: '0.82rem', color: C.ink }}>{value}</Mono>
                      </span>
                      <ArrowUpRight size={15} color={C.inkFaint} style={{ marginLeft: 'auto' }} />
                    </a>
                  )
                })}
              </div>
            </div>

            {/* Footer */}
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: '1rem',
              justifyContent: 'space-between', alignItems: 'center',
              marginTop: '5rem', paddingTop: '1.5rem', paddingBottom: '2.5rem',
              borderTop: `1px solid ${C.border}`,
            }}>
              <span style={{ fontFamily: 'Fraunces, serif', fontWeight: 600, fontSize: '1rem', color: C.ink }}>
                Manjeera Thogarcheti
              </span>
              <Mono style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: C.inkFaint }}>
                AI &amp; Systems Lead · 2026
              </Mono>
            </div>
          </R>
        </div>
      </section>

      {/* Framework row deep-dive — slide-in panel reusing the Case File Dossier */}
      {openRow != null && (
        <div
          data-lenis-prevent
          onClick={() => setOpenRow(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(6,5,9,0.74)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)',
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          }}
        >
          <motion.div
            data-lenis-prevent
            onClick={(e) => e.stopPropagation()}
            initial={{ x: reduced ? 0 : 60, opacity: reduced ? 1 : 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            style={{
              width: 'min(560px, 100%)', height: '100%', overflowY: 'auto', overscrollBehavior: 'contain',
              background: C.bg, borderLeft: `1px solid ${C.border}`,
              boxShadow: '-30px 0 80px rgba(0,0,0,0.6)', padding: '4.5rem 2rem 3rem',
            }}
          >
            <button onClick={() => setOpenRow(null)} aria-label="Close" style={{
              position: 'absolute', top: '1.25rem', right: '1.5rem',
              background: 'none', border: 'none', color: C.inkFaint, cursor: 'pointer',
              fontSize: '1.3rem', lineHeight: 1, padding: 4,
            }}>✕</button>
            <Dossier
              project={{ tag: fwRows[openRow].fw, title: fwRows[openRow].project }}
              data={dossiers[fwRows[openRow].project]}
              n={openRow + 1}
              total={fwRows.length}
              c={C}
            />
          </motion.div>
        </div>
      )}

      </div>
    </div>
  )
}
