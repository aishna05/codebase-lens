import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sun, Moon, Search, FolderOpen } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

const FEATURES = [
  { id: 'summary',  label: 'Summary'    },
  { id: 'workflow', label: 'Workflow'   },
  { id: 'chat',     label: 'Ask / Chat' },
]

function parseRepo(raw) {
  const s = raw.trim()
  if (!s) return null
  try {
    const url = s.startsWith('http') ? s : `https://github.com/${s}`
    const u = new URL(url)
    if (u.hostname !== 'github.com') return null
    const parts = u.pathname.split('/').filter(Boolean)
    if (parts.length < 2) return null
    return `https://github.com/${parts[0]}/${parts[1]}`
  } catch { return null }
}

export default function Home() {
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()

  const [mode, setMode]         = useState('github')   // 'github' | 'local'
  const [url, setUrl]           = useState('')
  const [localPath, setLocalPath] = useState('')
  const [error, setError]       = useState('')
  const [selected, setSelected] = useState(['summary', 'workflow', 'chat'])

  function toggleFeature(id) {
    setSelected(prev =>
      prev.includes(id)
        ? prev.length > 1 ? prev.filter(f => f !== id) : prev
        : [...prev, id]
    )
  }

  function handleGitHub(e) {
    e.preventDefault()
    const clean = parseRepo(url)
    if (!clean) {
      setError('Enter a valid GitHub URL — e.g. https://github.com/owner/repo')
      return
    }
    setError('')
    navigate(`/analysis?repo=${encodeURIComponent(clean)}&features=${selected.join(',')}`)
  }

  function handleLocal(e) {
    e.preventDefault()
    const p = localPath.trim()
    if (!p) {
      setError('Enter an absolute path to a local directory')
      return
    }
    setError('')
    navigate(`/graph?path=${encodeURIComponent(p)}`)
  }

  return (
    <div className="min-h-screen bg-app-bg flex flex-col">

      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-4">
        <span className="text-sm font-semibold text-text-primary tracking-tight">
          Codebase<span className="gradient-text">-Lens</span>
        </span>
        <button
          onClick={toggle}
          className="w-8 h-8 rounded-full border border-border-line flex items-center justify-center text-text-secondary hover:border-accent-purple hover:text-accent-purple transition-all"
          aria-label="Toggle theme"
        >
          {dark ? <Sun size={14} /> : <Moon size={14} />}
        </button>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-5 pb-16">
        <div className="w-full max-w-md">
          <div className="surface-card rounded-2xl p-7">

            {/* Heading */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-text-primary tracking-tight mb-1.5">
                {mode === 'github' ? 'Drop your URL' : 'Scan local repo'}
              </h1>
              <p className="text-sm text-text-secondary">
                {mode === 'github'
                  ? 'Get the full context'
                  : 'Visualise imports and file structure'}
              </p>
            </div>

            {/* Mode toggle */}
            <div className="grid grid-cols-2 gap-2 mb-5">
              {[
                { id: 'github', icon: <Search size={13} />, label: 'GitHub Repo' },
                { id: 'local',  icon: <FolderOpen size={13} />, label: 'Local Scan' },
              ].map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => { setMode(m.id); setError('') }}
                  className={`feature-tab py-2.5 rounded-xl text-sm flex items-center justify-center gap-2${mode === m.id ? ' active' : ''}`}
                >
                  {m.icon}
                  {m.label}
                </button>
              ))}
            </div>

            {/* ── GitHub form ── */}
            {mode === 'github' && (
              <form onSubmit={handleGitHub}>
                <div className="input-wrap border border-border-line rounded-xl flex items-center gap-2 px-3.5 py-3 mb-1 transition-all bg-app-bg">
                  <Search size={15} className="text-text-secondary shrink-0" />
                  <input
                    type="text"
                    value={url}
                    onChange={e => { setUrl(e.target.value); setError('') }}
                    placeholder="https://github.com/owner/repo"
                    className="flex-1 bg-transparent text-sm text-text-primary placeholder-[color:var(--text-secondary)] outline-none"
                    autoFocus
                  />
                </div>
                {error && (
                  <p className="text-[11px] mb-3 px-1" style={{ color: 'var(--accent-pink)' }}>
                    {error}
                  </p>
                )}
                <div className="grid grid-cols-3 gap-2.5 mt-4 mb-5">
                  {FEATURES.map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => toggleFeature(f.id)}
                      className={`feature-tab py-2.5 rounded-xl text-sm${selected.includes(f.id) ? ' active' : ''}`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <button type="submit" className="gradient-btn w-full py-3 rounded-xl text-sm">
                  Analyze
                </button>
              </form>
            )}

            {/* ── Local scan form ── */}
            {mode === 'local' && (
              <form onSubmit={handleLocal}>
                <div className="input-wrap border border-border-line rounded-xl flex items-center gap-2 px-3.5 py-3 mb-1 transition-all bg-app-bg">
                  <FolderOpen size={15} className="text-text-secondary shrink-0" />
                  <input
                    type="text"
                    value={localPath}
                    onChange={e => { setLocalPath(e.target.value); setError('') }}
                    placeholder="C:\Users\you\projects\my-app"
                    className="flex-1 bg-transparent text-sm text-text-primary placeholder-[color:var(--text-secondary)] outline-none"
                    autoFocus
                  />
                </div>
                {error && (
                  <p className="text-[11px] mb-3 px-1" style={{ color: 'var(--accent-pink)' }}>
                    {error}
                  </p>
                )}
                <p className="text-[11px] text-text-secondary mb-5 px-0.5 leading-relaxed">
                  Paste the full path to any local directory. The backend will scan source files,
                  detect imports, and draw the dependency graph.
                </p>
                <button type="submit" className="gradient-btn w-full py-3 rounded-xl text-sm">
                  Scan &amp; Visualise
                </button>
              </form>
            )}

          </div>
        </div>
      </main>
    </div>
  )
}
