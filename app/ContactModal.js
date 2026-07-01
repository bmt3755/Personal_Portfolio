"use client"
import { useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { X, Send } from "lucide-react"

// Centered contact modal. Form POSTs to /api/contact, which holds the Web3Forms
// key server-side — the email address never reaches the browser. Honeypot field
// catches dumb bots; success/error states handled inline.
export default function ContactModal({ open, onClose, c }) {
  const reduced = useReducedMotion()
  const [status, setStatus] = useState('idle')   // idle | sending | success | error
  const [error, setError] = useState('')

  if (!open) return null

  async function handleSubmit(e) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    if (fd.get('botcheck')) { setStatus('success'); return }   // honeypot tripped
    setStatus('sending'); setError('')
    const key = process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY
    if (!key) { setStatus('error'); setError('Contact form is not configured yet.'); return }
    // Submit as multipart FormData (a "simple" request → no CORS preflight). The access
    // key is public by design; the email it routes to lives on Web3Forms' side, never here.
    const name = (fd.get('name') || '').toString().trim()
    fd.append('access_key', key)
    fd.append('subject', `Portfolio message from ${name}`)
    fd.append('from_name', 'Manjeera Portfolio')
    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: fd,                        // no Content-Type header — browser sets multipart
        headers: { Accept: 'application/json' },
      })
      const data = await res.json()
      if (data.success) setStatus('success')
      else { setStatus('error'); setError(data.message || 'Something went wrong.') }
    } catch {
      setStatus('error'); setError('Network error — please try again.')
    }
  }

  const labelS = {
    fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem', textTransform: 'uppercase',
    letterSpacing: '0.08em', color: c.inkFaint, display: 'block', marginBottom: '0.35rem',
  }
  const fieldS = {
    width: '100%', background: c.surface, border: `1px solid ${c.border}`, borderRadius: '5px',
    padding: '0.6rem 0.7rem', color: c.ink, fontFamily: 'Inter, sans-serif', fontSize: '0.88rem', outline: 'none',
  }

  return (
    <div
      data-lenis-prevent
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(6,5,9,0.74)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem',
      }}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ y: reduced ? 0 : 20, opacity: reduced ? 1 : 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        style={{
          width: 'min(460px, 100%)', background: c.bg, border: `1px solid ${c.border}`,
          borderRadius: '10px', padding: '2rem', position: 'relative',
          boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
        }}
      >
        <button onClick={onClose} aria-label="Close" style={{
          position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none',
          color: c.inkFaint, cursor: 'pointer', padding: 4, lineHeight: 1,
        }}><X size={18} /></button>

        {status === 'success' ? (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: '1.5rem', color: c.ink, marginBottom: '0.5rem' }}>Message sent.</div>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.9rem', color: c.inkMuted, lineHeight: 1.6 }}>
              Thanks for reaching out — I&apos;ll get back to you soon.
            </p>
            <button onClick={onClose} style={{
              marginTop: '1.5rem', padding: '0.6rem 1.4rem', background: 'none', border: `1px solid ${c.border}`,
              color: c.inkMuted, borderRadius: '5px', cursor: 'pointer',
              fontFamily: "'JetBrains Mono', monospace", fontSize: '0.78rem',
            }}>Close</button>
          </div>
        ) : (
          <>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: '1.5rem', fontWeight: 600, color: c.ink, marginBottom: '0.3rem' }}>Send a message</div>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.85rem', color: c.inkMuted, marginBottom: '1.5rem', lineHeight: 1.5 }}>
              Goes straight to my inbox — no address to copy.
            </p>
            <form onSubmit={handleSubmit}>
              {/* honeypot — hidden from humans, tempting to bots */}
              <input type="checkbox" name="botcheck" tabIndex={-1} autoComplete="off" aria-hidden style={{ display: 'none' }} />
              <div style={{ marginBottom: '1rem' }}>
                <label style={labelS}>Name</label>
                <input name="name" type="text" required style={fieldS} />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={labelS}>Email</label>
                <input name="email" type="email" required style={fieldS} />
              </div>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={labelS}>Message</label>
                <textarea name="message" required rows={4} style={{ ...fieldS, resize: 'vertical' }} />
              </div>
              {status === 'error' && (
                <div style={{ color: '#E0795A', fontFamily: 'Inter, sans-serif', fontSize: '0.8rem', marginBottom: '0.9rem' }}>{error}</div>
              )}
              <button type="submit" disabled={status === 'sending'} style={{
                width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                padding: '0.8rem', background: c.navy, color: c.bg, border: 'none', borderRadius: '5px',
                cursor: status === 'sending' ? 'default' : 'pointer', opacity: status === 'sending' ? 0.7 : 1,
                fontFamily: "'JetBrains Mono', monospace", fontSize: '0.82rem', fontWeight: 500,
              }}>
                <Send size={15} /> {status === 'sending' ? 'Sending…' : 'Send message'}
              </button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  )
}
