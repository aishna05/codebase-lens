import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Ghost, RefreshCw, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { reportsApi } from '../api/reports'

const TYPE_LABELS = {
  missed_defense: { label: 'Missed Defense', emoji: '🔴' },
  unclaimed_idea: { label: 'Unclaimed Idea', emoji: '🟡' },
  missed_opportunity: { label: 'Missed Opportunity', emoji: '🟢' },
  power_dynamic: { label: 'Power Dynamic', emoji: '⚡' },
  positive_moment: { label: 'Well Played', emoji: '✨' },
}

const SEVERITY_CLASS = {
  red: 'border-red-800 bg-red-950/30',
  yellow: 'border-yellow-800 bg-yellow-950/30',
  green: 'border-green-800 bg-green-950/30',
}

const BADGE_CLASS = {
  red: 'badge-red',
  yellow: 'badge-yellow',
  green: 'badge-green',
}

function ReportItem({ item }) {
  const type = TYPE_LABELS[item.item_type] || { label: item.item_type, emoji: '•' }
  return (
    <div className={`border rounded-lg p-5 ${SEVERITY_CLASS[item.severity]}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className={BADGE_CLASS[item.severity]}>
          {type.emoji} {type.label}
        </span>
        <span className="text-gray-500 text-sm font-mono">{item.timestamp_label}</span>
      </div>

      {item.context_quote && (
        <blockquote className="text-gray-400 text-sm italic border-l-2 border-gray-700 pl-3 mb-3">
          "{item.context_quote}"
        </blockquote>
      )}

      <h3 className="font-semibold text-white mb-1">{item.title}</h3>
      <p className="text-gray-300 text-sm mb-4">{item.description}</p>

      {item.suggested_response && (
        <div className="bg-gray-800/60 rounded-lg p-3 border-l-2 border-ghost-500">
          <p className="text-xs text-ghost-400 font-medium mb-1 uppercase tracking-wide">What you could have said</p>
          <p className="text-ghost-200 text-sm italic">"{item.suggested_response}"</p>
        </div>
      )}
    </div>
  )
}

export default function ReportPage() {
  const { id: meetingId } = useParams()
  const navigate = useNavigate()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  const fetchReport = useCallback(async (silent = false) => {
    try {
      const r = await reportsApi.get(meetingId)
      setReport(r)
      return r
    } catch (err) {
      if (!silent) setReport(null)
      return null
    }
  }, [meetingId])

  useEffect(() => {
    fetchReport().finally(() => setLoading(false))
  }, [fetchReport])

  // Poll while generating
  useEffect(() => {
    if (report?.status !== 'generating') return
    const interval = setInterval(async () => {
      const updated = await fetchReport(true)
      if (updated?.status !== 'generating') clearInterval(interval)
    }, 3000)
    return () => clearInterval(interval)
  }, [report?.status, fetchReport])

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const r = await reportsApi.generate(meetingId)
      setReport(r)
      toast.success('Ghost is analyzing your meeting...')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setGenerating(false)
    }
  }

  if (loading) return <div className="flex justify-center py-20 text-gray-500">Loading...</div>

  // No report yet
  if (!report) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center">
        <Ghost className="w-16 h-16 text-gray-700 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">No report yet</h1>
        <p className="text-gray-400 text-sm mb-8">
          Make sure you've added your private brief and the transcript is uploaded, then let Ghost analyze the meeting.
        </p>
        <button className="btn-primary flex items-center gap-2 mx-auto" onClick={handleGenerate} disabled={generating}>
          <Ghost className="w-4 h-4" />
          {generating ? 'Starting...' : 'Generate Ghost Report'}
        </button>
      </div>
    )
  }

  // Generating
  if (report.status === 'generating') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 bg-ghost-900/40 border border-ghost-700 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
          <Ghost className="w-8 h-8 text-ghost-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Ghost is watching...</h1>
        <p className="text-gray-400 text-sm">Reading the full transcript with your private brief. This takes ~30-60 seconds.</p>
        <div className="mt-4 flex justify-center">
          <Clock className="w-4 h-4 text-gray-600 animate-spin" />
        </div>
      </div>
    )
  }

  // Failed
  if (report.status === 'failed') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-white mb-2">Report generation failed</h1>
        <p className="text-red-400 text-sm mb-6">{report.error_message}</p>
        <button className="btn-primary" onClick={handleGenerate}>
          Try again
        </button>
      </div>
    )
  }

  // Ready
  const redItems = report.items.filter((i) => i.severity === 'red')
  const yellowItems = report.items.filter((i) => i.severity === 'yellow')
  const greenItems = report.items.filter((i) => i.severity === 'green')

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Ghost className="w-5 h-5 text-ghost-400" />
            <h1 className="text-2xl font-bold text-white">Your Ghost Report</h1>
          </div>
          <p className="text-gray-500 text-xs">Private — only visible to you</p>
        </div>
        <button
          onClick={handleGenerate}
          className="text-gray-600 hover:text-ghost-400 transition-colors"
          title="Regenerate report"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Summary */}
      {report.summary && (
        <div className="card mb-6 border-ghost-800">
          <p className="text-gray-300 text-sm leading-relaxed">{report.summary}</p>
        </div>
      )}

      {/* Stat bar */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="card text-center border-red-900">
          <p className="text-2xl font-bold text-red-400">{redItems.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Critical</p>
        </div>
        <div className="card text-center border-yellow-900">
          <p className="text-2xl font-bold text-yellow-400">{yellowItems.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Notable</p>
        </div>
        <div className="card text-center border-green-900">
          <p className="text-2xl font-bold text-green-400">{greenItems.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Minor / Wins</p>
        </div>
      </div>

      {/* Items sorted by timestamp */}
      <div className="space-y-4">
        {report.items.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <CheckCircle className="w-10 h-10 mx-auto mb-3 text-green-600" />
            <p>Ghost found nothing to flag. Clean meeting.</p>
          </div>
        ) : (
          report.items.map((item) => <ReportItem key={item.id} item={item} />)
        )}
      </div>
    </div>
  )
}
