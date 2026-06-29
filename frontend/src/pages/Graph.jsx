import { useCallback, useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  ReactFlow, Background, Controls, MiniMap,
  useNodesState, useEdgesState, MarkerType,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import dagre from '@dagrejs/dagre'
import { ArrowLeft, Sun, Moon, X, Loader2, AlertCircle, FileCode } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { scanDirectory, explainFile } from '../api/index'

// ── Language colour map ───────────────────────────────────────────────────────

const LANG_COLOR = {
  Python:       '#3776AB',
  JavaScript:   '#c9a227',
  React:        '#61DAFB',
  TypeScript:   '#3178C6',
  'React/TS':   '#61DAFB',
  C:            '#5c6bc0',
  'C++':        '#00599C',
  'C/C++':      '#5c6bc0',
  Go:           '#00ADD8',
  Rust:         '#CE422B',
  Java:         '#ED8B00',
  Kotlin:       '#7F52FF',
  Ruby:         '#CC342D',
  PHP:          '#777BB4',
  'C#':         '#239120',
  Swift:        '#FA7343',
  Vue:          '#42b883',
  Svelte:       '#FF3E00',
}

function langColor(lang) {
  return LANG_COLOR[lang] || '#71717a'
}

// ── Dagre layout ──────────────────────────────────────────────────────────────

const NODE_W = 190
const NODE_H = 64

function applyLayout(nodes, edges) {
  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: 'LR', ranksep: 90, nodesep: 30 })
  g.setDefaultEdgeLabel(() => ({}))
  nodes.forEach(n => g.setNode(n.id, { width: NODE_W, height: NODE_H }))
  edges.forEach(e => g.setEdge(e.source, e.target))
  dagre.layout(g)
  return nodes.map(n => {
    const pos = g.node(n.id)
    return { ...n, position: { x: pos.x - NODE_W / 2, y: pos.y - NODE_H / 2 } }
  })
}

// ── Custom file node ──────────────────────────────────────────────────────────

function FileNode({ data, selected }) {
  const color = langColor(data.language)
  const dark = document.documentElement.classList.contains('dark')
  return (
    <div
      style={{
        width: NODE_W,
        background: dark ? '#18181b' : '#ffffff',
        border: `1.5px solid ${selected ? color : (dark ? '#3f3f46' : '#e4e4e7')}`,
        borderRadius: 10,
        padding: '8px 12px',
        boxShadow: selected
          ? `0 0 0 3px ${color}33`
          : dark ? 'none' : '0 2px 4px rgba(0,0,0,0.06)',
        cursor: 'pointer',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        userSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <FileCode size={12} style={{ color, flexShrink: 0 }} />
        <span style={{
          fontSize: 12,
          fontWeight: 600,
          color: dark ? '#fafafa' : '#18181b',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: 130,
        }}>
          {data.label}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <span style={{
          fontSize: 9,
          fontWeight: 600,
          padding: '1px 6px',
          borderRadius: 99,
          background: color + '22',
          color,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}>
          {data.language}
        </span>
        <span style={{ fontSize: 10, color: dark ? '#71717a' : '#a1a1aa' }}>
          {data.loc} loc
        </span>
      </div>
    </div>
  )
}

const nodeTypes = { file: FileNode }

// ── Explain side panel ────────────────────────────────────────────────────────

function ExplainPanel({ node, rootPath, onClose }) {
  const [loading, setLoading] = useState(false)
  const [explanation, setExplanation] = useState('')
  const [error, setError] = useState('')
  const dark = document.documentElement.classList.contains('dark')

  useEffect(() => {
    if (!node) return
    setExplanation('')
    setError('')
    setLoading(true)

    // We need the file content — fetch it from the backend via the scan result
    // We pass path only; backend reads the file from the local path
    explainFile(node.data.absPath, node.data.content || '')
      .then(r => setExplanation(r.explanation))
      .catch(e => setError(e.response?.data?.detail || e.message))
      .finally(() => setLoading(false))
  }, [node?.id])

  if (!node) return null
  const color = langColor(node.data.language)

  return (
    <div style={{
      position: 'fixed',
      inset: '0 0 0 auto',
      width: 360,
      display: 'flex',
      flexDirection: 'column',
      zIndex: 50,
      background: dark ? '#18181b' : '#ffffff',
      borderLeft: `1px solid ${dark ? '#27272a' : '#e4e4e7'}`,
      boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px',
        borderBottom: `1px solid ${dark ? '#27272a' : '#e4e4e7'}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <FileCode size={14} style={{ color, flexShrink: 0 }} />
          <span style={{
            fontSize: 13, fontWeight: 600,
            color: dark ? '#fafafa' : '#18181b',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {node.data.label}
          </span>
        </div>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: dark ? '#71717a' : '#a1a1aa',
        }}>
          <X size={15} />
        </button>
      </div>

      {/* Meta */}
      <div style={{
        padding: '10px 16px',
        borderBottom: `1px solid ${dark ? '#27272a' : '#e4e4e7'}`,
        display: 'flex', gap: 10,
      }}>
        <span style={{
          fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
          background: color + '22', color, textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>
          {node.data.language}
        </span>
        <span style={{ fontSize: 11, color: dark ? '#71717a' : '#a1a1aa' }}>
          {node.data.loc} lines
        </span>
        <span style={{ fontSize: 11, color: dark ? '#71717a' : '#a1a1aa' }}>
          {(node.data.size_bytes / 1024).toFixed(1)} KB
        </span>
      </div>

      {/* Path */}
      <div style={{ padding: '8px 16px', borderBottom: `1px solid ${dark ? '#27272a' : '#e4e4e7'}` }}>
        <code style={{
          fontSize: 10, color: dark ? '#a1a1aa' : '#71717a',
          wordBreak: 'break-all',
        }}>
          {node.data.path}
        </code>
      </div>

      {/* Explanation */}
      <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
        <p style={{
          fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
          letterSpacing: '0.08em', color: dark ? '#52525b' : '#a1a1aa',
          marginBottom: 10,
        }}>
          AI Explanation
        </p>

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: dark ? '#71717a' : '#a1a1aa' }}>
            <Loader2 size={14} className="animate-spin" style={{ color }} />
            <span style={{ fontSize: 12 }}>Explaining…</span>
          </div>
        )}

        {error && (
          <div style={{ display: 'flex', gap: 8, color: '#ef4444' }}>
            <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
            <span style={{ fontSize: 12 }}>{error}</span>
          </div>
        )}

        {explanation && (
          <p style={{
            fontSize: 13,
            lineHeight: 1.7,
            color: dark ? '#a1a1aa' : '#52525b',
          }}>
            {explanation}
          </p>
        )}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Graph() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { dark, toggle } = useTheme()

  const dirPath = searchParams.get('path') || ''

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [meta, setMeta] = useState(null)
  const [selectedNode, setSelectedNode] = useState(null)
  // Store raw file content keyed by node id for the explain panel
  const [fileContents, setFileContents] = useState({})

  useEffect(() => {
    if (!dirPath) { navigate('/'); return }
    setLoading(true)
    setError('')

    scanDirectory(dirPath)
      .then(data => {
        setMeta({ root: data.root, file_count: data.file_count })

        // Build content map — we don't have it here; explain endpoint will read from disk
        const rfNodes = applyLayout(
          data.nodes.map(n => ({
            id: n.id,
            type: 'file',
            position: { x: 0, y: 0 },
            data: {
              label: n.label,
              path: n.path,
              absPath: `${data.root}/${n.path}`,
              language: n.language,
              loc: n.loc,
              size_bytes: n.size_bytes,
              content: '',  // backend will read the file fresh
            },
          })),
          data.edges.map(e => ({
            id: e.id,
            source: e.source,
            target: e.target,
          })),
        )

        const rfEdges = data.edges.map(e => ({
          id: e.id,
          source: e.source,
          target: e.target,
          type: 'smoothstep',
          animated: false,
          markerEnd: { type: MarkerType.ArrowClosed, width: 10, height: 10 },
          style: { stroke: dark ? '#3f3f46' : '#d4d4d8', strokeWidth: 1.5 },
        }))

        setNodes(rfNodes)
        setEdges(rfEdges)
      })
      .catch(e => setError(e.response?.data?.detail || e.message))
      .finally(() => setLoading(false))
  }, [dirPath])

  const onNodeClick = useCallback((_, node) => {
    setSelectedNode(node)
  }, [])

  const label = dirPath.split(/[/\\]/).pop() || dirPath

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--app-bg)' }}>

      {/* Top bar */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 20px',
        borderBottom: '1px solid var(--border-line)',
        background: 'var(--surface)',
        flexShrink: 0,
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <button onClick={() => navigate('/')} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-secondary)',
          }}>
            <ArrowLeft size={16} />
          </button>
          <code style={{
            fontSize: 12, color: 'var(--text-secondary)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300,
          }}>
            {label}
          </code>
          {meta && (
            <span style={{
              fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 99,
              background: 'var(--active-bg)', color: 'var(--active-text)',
              border: '1px solid var(--active-border)', flexShrink: 0,
            }}>
              {meta.file_count} files
            </span>
          )}
        </div>

        <button onClick={toggle} style={{
          width: 32, height: 32, borderRadius: '50%',
          border: '1px solid var(--border-line)',
          background: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-secondary)',
        }}>
          {dark ? <Sun size={14} /> : <Moon size={14} />}
        </button>
      </nav>

      {/* Canvas area */}
      <div style={{ flex: 1, position: 'relative' }}>
        {loading && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 12, zIndex: 5,
          }}>
            <Loader2 size={22} className="animate-spin" style={{ color: 'var(--accent-pink)' }} />
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Scanning directory…</p>
          </div>
        )}

        {error && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 10, zIndex: 5, padding: 24,
          }}>
            <AlertCircle size={20} style={{ color: 'var(--accent-pink)' }} />
            <p style={{ fontSize: 13, color: 'var(--accent-pink)', textAlign: 'center', maxWidth: 360 }}>
              {error}
            </p>
            <button onClick={() => navigate('/')} className="gradient-btn"
              style={{ padding: '8px 20px', borderRadius: 10, fontSize: 13, border: 'none', cursor: 'pointer' }}>
              Go back
            </button>
          </div>
        )}

        {!loading && !error && (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.15 }}
            minZoom={0.1}
            maxZoom={2}
            style={{ background: dark ? '#09090b' : '#fafafa' }}
          >
            <Background
              color={dark ? '#27272a' : '#e4e4e7'}
              gap={24}
              size={1}
            />
            <Controls
              style={{
                background: dark ? '#18181b' : '#ffffff',
                border: `1px solid ${dark ? '#27272a' : '#e4e4e7'}`,
                borderRadius: 8,
              }}
            />
            <MiniMap
              nodeColor={n => langColor(n.data?.language)}
              style={{
                background: dark ? '#18181b' : '#ffffff',
                border: `1px solid ${dark ? '#27272a' : '#e4e4e7'}`,
                borderRadius: 8,
              }}
            />
          </ReactFlow>
        )}
      </div>

      {/* Click overlay to close panel */}
      {selectedNode && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 49 }}
          onClick={() => setSelectedNode(null)}
        />
      )}

      {/* Explain panel */}
      {selectedNode && (
        <ExplainPanel
          node={selectedNode}
          rootPath={meta?.root || ''}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  )
}
