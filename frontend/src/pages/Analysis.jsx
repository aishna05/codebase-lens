import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Sun, Moon, Send, Loader2, X, Copy, Check, AlertCircle, ArrowLeft } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { analyzeRepo, sendChat } from '../api/index'

// ── helpers ──────────────────────────────────────────────────────────────────

function repoSlug(url) {
  try { return new URL(url).pathname.slice(1) } catch { return url }
}

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className="p-1 rounded transition-colors text-text-secondary hover:text-accent-pink"
    >
      {copied ? <Check size={13} style={{ color: 'var(--accent-pink)' }} /> : <Copy size={13} />}
    </button>
  )
}

// ── Markdown renderer (minimal) ───────────────────────────────────────────────

function Md({ text }) {
  const parts = text.split(/(```[\s\S]*?```|`[^`]+`|\*\*[^*]+\*\*)/g)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const code = part.slice(3, -3).replace(/^[a-z]+\n/, '')
          return (
            <pre key={i} className="rounded-lg p-3 overflow-x-auto text-xs font-mono my-2 whitespace-pre-wrap"
              style={{ background: 'var(--app-bg)', border: '1px solid var(--border-line)', color: 'var(--accent-purple)' }}>
              {code}
            </pre>
          )
        }
        if (part.startsWith('`') && part.endsWith('`'))
          return (
            <code key={i} className="text-xs px-1.5 py-0.5 rounded font-mono"
              style={{ background: 'var(--app-bg)', color: 'var(--accent-pink)' }}>
              {part.slice(1, -1)}
            </code>
          )
        if (part.startsWith('**') && part.endsWith('**'))
          return <strong key={i} className="text-text-primary font-semibold">{part.slice(2, -2)}</strong>
        return <span key={i}>{part}</span>
      })}
    </>
  )
}

// ── Shared box shell ──────────────────────────────────────────────────────────

function Box({ title, children }) {
  return (
    <div className="surface-card rounded-2xl p-5 h-full">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary mb-4">
        {title}
      </p>
      {children}
    </div>
  )
}

function BoxLoader() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10">
      <Loader2 size={18} className="animate-spin" style={{ color: 'var(--accent-pink)' }} />
      <p className="text-xs text-text-secondary">Analyzing…</p>
    </div>
  )
}

function BoxError({ msg }) {
  return (
    <div className="flex items-start gap-2 py-6">
      <AlertCircle size={14} className="shrink-0 mt-0.5" style={{ color: 'var(--accent-pink)' }} />
      <p className="text-xs" style={{ color: 'var(--accent-pink)' }}>{msg}</p>
    </div>
  )
}

// ── Summary box ───────────────────────────────────────────────────────────────

function SummaryBox({ data, loading, error }) {
  if (loading) return <Box title="Summary"><BoxLoader /></Box>
  if (error)   return <Box title="Summary"><BoxError msg={error} /></Box>
  if (!data)   return null
  const s = data.summary
  return (
    <Box title="Summary">
      <p className="text-xs text-text-secondary leading-relaxed mb-4">{s.purpose}</p>

      <p className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary mb-2">Stack</p>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {s.tech_stack.map(t => (
          <span key={t.name} className="text-xs px-2.5 py-0.5 rounded-full"
            style={{ background: 'var(--active-bg)', color: 'var(--active-text)', border: '1px solid var(--active-border)' }}>
            {t.name}
          </span>
        ))}
      </div>

      <p className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary mb-2">Key Features</p>
      <ul className="space-y-1.5">
        {s.key_features.map((f, i) => (
          <li key={i} className="text-xs text-text-secondary flex gap-2 leading-relaxed">
            <span style={{ color: 'var(--accent-purple)' }} className="shrink-0">–</span>
            {f}
          </li>
        ))}
      </ul>
    </Box>
  )
}

// ── Workflow box ──────────────────────────────────────────────────────────────

function WorkflowBox({ data, loading, error }) {
  if (loading) return <Box title="Workflow"><BoxLoader /></Box>
  if (error)   return <Box title="Workflow"><BoxError msg={error} /></Box>
  if (!data)   return null
  const w = data.workflow
  return (
    <Box title="Workflow">
      <div className="mb-4">
        <span className="text-xs px-2.5 py-1 rounded-full font-medium"
          style={{ background: 'var(--active-bg)', color: 'var(--active-text)', border: '1px solid var(--active-border)' }}>
          {w.architecture_pattern}
        </span>
      </div>

      <p className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary mb-2">Entry Points</p>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {w.entry_points.map(ep => (
          <code key={ep} className="text-[11px] px-2 py-0.5 rounded font-mono"
            style={{ background: 'var(--app-bg)', border: '1px solid var(--border-line)', color: 'var(--accent-pink)' }}>
            {ep}
          </code>
        ))}
      </div>

      <p className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary mb-2">Data Flow</p>
      <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-line">{w.data_flow}</p>
    </Box>
  )
}

// ── Chat panel ────────────────────────────────────────────────────────────────

function ChatPanel({ repoUrl, onClose }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: `Ready to answer questions about **${repoSlug(repoUrl)}**. Ask me anything about the codebase.` }
  ])
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function send(e) {
    e.preventDefault()
    const q = input.trim()
    if (!q || loading) return
    setInput('')
    const next = [...messages, { role: 'user', content: q }]
    setMessages(next)
    setLoading(true)
    try {
      const res = await sendChat(repoUrl, next)
      setMessages(prev => [...prev, { role: 'assistant', content: res.answer, cited: res.cited_files }])
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${err.response?.data?.detail || err.message}`
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[420px] flex flex-col z-50 shadow-2xl"
      style={{ background: 'var(--surface)', borderLeft: '1px solid var(--border-line)' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: '1px solid var(--border-line)' }}>
        <p className="text-sm font-semibold text-text-primary">Ask anything</p>
        <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : ''}`}>
            {m.role === 'assistant' && (
              <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: 'var(--active-bg)', border: '1px solid var(--active-border)' }}>
                <span className="text-[9px] font-bold" style={{ color: 'var(--active-text)' }}>CL</span>
              </div>
            )}
            <div className="max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed"
              style={m.role === 'user'
                ? { background: 'var(--active-bg)', border: '1px solid var(--active-border)', color: 'var(--text-primary)' }
                : { background: 'var(--app-bg)', border: '1px solid var(--border-line)', color: 'var(--text-secondary)' }
              }>
              <Md text={m.content} />
              {m.cited?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1 pt-2"
                  style={{ borderTop: '1px solid var(--border-line)' }}>
                  {m.cited.map(f => (
                    <span key={f} className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                      style={{ background: 'var(--active-bg)', color: 'var(--active-text)' }}>
                      {f}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2.5">
            <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'var(--active-bg)', border: '1px solid var(--active-border)' }}>
              <Loader2 size={11} className="animate-spin" style={{ color: 'var(--active-text)' }} />
            </div>
            <div className="rounded-xl px-3.5 py-2.5 text-xs text-text-secondary"
              style={{ background: 'var(--app-bg)', border: '1px solid var(--border-line)' }}>
              Thinking…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3" style={{ borderTop: '1px solid var(--border-line)' }}>
        <form onSubmit={send}
          className="input-wrap flex items-center gap-2 px-3.5 py-2.5 rounded-xl border transition-all"
          style={{ background: 'var(--app-bg)', borderColor: 'var(--border-line)' }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask about this repo…"
            className="flex-1 bg-transparent text-sm text-text-primary outline-none placeholder-[color:var(--text-secondary)]"
          />
          <button type="submit" disabled={!input.trim() || loading}
            className="gradient-btn p-1.5 rounded-lg text-white">
            <Send size={12} />
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Analysis() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { dark, toggle } = useTheme()

  const repoUrl  = searchParams.get('repo') || ''
  const features = (searchParams.get('features') || 'summary,workflow,chat').split(',')
  const slug     = repoSlug(repoUrl)

  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [chatOpen, setChatOpen] = useState(false)

  useEffect(() => {
    if (!repoUrl) { navigate('/'); return }
    setLoading(true)
    setError('')
    analyzeRepo(repoUrl)
      .then(d  => setData(d))
      .catch(e => setError(e.response?.data?.detail || e.message))
      .finally(() => setLoading(false))
  }, [repoUrl])

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--app-bg)' }}>

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: '1px solid var(--border-line)' }}>

        {/* Left: back arrow + repo URL */}
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => navigate('/')}
            className="text-text-secondary hover:text-text-primary transition-colors shrink-0">
            <ArrowLeft size={16} />
          </button>
          <code className="text-xs font-mono text-text-secondary truncate max-w-[200px] sm:max-w-sm">
            {slug}
          </code>
          {!loading && data && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0"
              style={{ background: 'var(--active-bg)', color: 'var(--active-text)', border: '1px solid var(--active-border)' }}>
              Ready
            </span>
          )}
        </div>

        {/* Right: toggle + chat */}
        <div className="flex items-center gap-2">
          <button onClick={toggle}
            className="w-8 h-8 rounded-full border border-border-line flex items-center justify-center text-text-secondary hover:border-accent-purple hover:text-accent-purple transition-all">
            {dark ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          {features.includes('chat') && (
            <button onClick={() => setChatOpen(true)}
              className="gradient-btn px-4 py-2 rounded-xl text-xs">
              Chat
            </button>
          )}
        </div>
      </nav>

      {/* ── Boxes ───────────────────────────────────────────────────────────── */}
      <main className="flex-1 p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-4xl mx-auto">
          {features.includes('summary')  && (
            <SummaryBox  data={data} loading={loading} error={error} />
          )}
          {features.includes('workflow') && (
            <WorkflowBox data={data} loading={loading} error={error} />
          )}
        </div>
      </main>

      {/* ── Chat slide-in ────────────────────────────────────────────────────── */}
      {chatOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setChatOpen(false)} />
          <ChatPanel repoUrl={repoUrl} onClose={() => setChatOpen(false)} />
        </>
      )}
    </div>
  )
}
