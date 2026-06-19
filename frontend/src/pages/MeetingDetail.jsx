import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Ghost, FileText, BookOpen, Zap, Users, Trash2, UserPlus } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { meetingsApi } from '../api/meetings'
import { useAuth } from '../context/AuthContext'

export default function MeetingDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [meeting, setMeeting] = useState(null)
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)

  useEffect(() => {
    meetingsApi.get(id)
      .then(setMeeting)
      .catch((e) => { toast.error(e.message); navigate('/dashboard') })
      .finally(() => setLoading(false))
  }, [id])

  const handleDelete = async () => {
    if (!confirm('Delete this meeting and all its data? This cannot be undone.')) return
    try {
      await meetingsApi.delete(id)
      toast.success('Meeting deleted')
      navigate('/dashboard')
    } catch (e) {
      toast.error(e.message)
    }
  }

  const handleInvite = async (e) => {
    e.preventDefault()
    setInviting(true)
    try {
      await meetingsApi.invite(id, inviteEmail)
      toast.success(`${inviteEmail} added`)
      setInviteEmail('')
      const updated = await meetingsApi.get(id)
      setMeeting(updated)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setInviting(false)
    }
  }

  if (loading) return <div className="flex justify-center py-20 text-gray-500">Loading...</div>
  if (!meeting) return null

  const isOwner = meeting.owner_id === user?.id

  const steps = [
    {
      icon: BookOpen,
      label: 'Your private brief',
      desc: 'Tell Ghost your goals, what's at stake, and what arguments you had.',
      done: meeting.has_my_brief,
      href: `/meetings/${id}/brief`,
      action: meeting.has_my_brief ? 'Edit brief' : 'Add brief',
    },
    {
      icon: FileText,
      label: 'Transcript',
      desc: 'Upload an audio file or paste the meeting transcript.',
      done: meeting.has_transcript,
      href: `/meetings/${id}/transcript`,
      action: meeting.has_transcript ? 'View transcript' : 'Add transcript',
      ownerOnly: true,
    },
    {
      icon: Zap,
      label: 'Ghost Report',
      desc: 'Your private debrief — the moments you missed and what to say next time.',
      done: meeting.has_my_report,
      href: `/meetings/${id}/report`,
      action: meeting.has_my_report ? 'View report' : 'Generate report',
      requiresBrief: true,
      requiresTranscript: true,
    },
  ]

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">{meeting.title}</h1>
          {meeting.meeting_date && (
            <p className="text-gray-400 text-sm mt-1">
              {format(new Date(meeting.meeting_date), 'EEEE, MMMM d, yyyy · h:mm a')}
            </p>
          )}
          {meeting.description && (
            <p className="text-gray-500 text-sm mt-2">{meeting.description}</p>
          )}
        </div>
        {isOwner && (
          <button onClick={handleDelete} className="text-gray-600 hover:text-red-400 transition-colors">
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Steps */}
      <div className="space-y-3 mb-8">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Your Ghost flow</h2>
        {steps.map((step) => {
          if (step.ownerOnly && !isOwner) return null
          const locked = (step.requiresBrief && !meeting.has_my_brief) ||
            (step.requiresTranscript && !meeting.has_transcript)

          return (
            <Link
              key={step.label}
              to={locked ? '#' : step.href}
              onClick={locked ? (e) => { e.preventDefault(); toast.error('Complete the previous steps first.') } : undefined}
              className={`card flex items-center gap-4 transition-colors ${
                locked
                  ? 'opacity-40 cursor-not-allowed'
                  : 'hover:border-ghost-700 group'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                step.done ? 'bg-green-900/40 border border-green-800' : 'bg-gray-800 border border-gray-700'
              }`}>
                <step.icon className={`w-5 h-5 ${step.done ? 'text-green-400' : 'text-gray-400'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className={`font-medium ${step.done ? 'text-green-300' : 'text-white'}`}>{step.label}</h3>
                  {step.done && <span className="text-green-500 text-xs">✓ Done</span>}
                </div>
                <p className="text-gray-500 text-sm truncate">{step.desc}</p>
              </div>
              <span className={`text-sm font-medium flex-shrink-0 ${
                step.done ? 'text-gray-400' : 'text-ghost-400 group-hover:text-ghost-300'
              }`}>
                {step.action} →
              </span>
            </Link>
          )
        })}
      </div>

      {/* Participants */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-gray-400" />
          <h2 className="font-medium text-white">Participants</h2>
        </div>
        <div className="space-y-2 mb-4">
          {meeting.participants.map((p) => (
            <div key={p.id} className="flex items-center gap-3">
              <div className="w-8 h-8 bg-ghost-900/40 rounded-full flex items-center justify-center text-ghost-300 text-xs font-bold">
                {p.user_name[0].toUpperCase()}
              </div>
              <div>
                <p className="text-sm text-gray-200">{p.user_name}</p>
                <p className="text-xs text-gray-500">{p.user_email}</p>
              </div>
            </div>
          ))}
        </div>

        {isOwner && (
          <form onSubmit={handleInvite} className="flex gap-2 mt-4 pt-4 border-t border-gray-800">
            <input
              type="email"
              className="input text-sm"
              placeholder="colleague@company.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
            />
            <button type="submit" className="btn-secondary flex items-center gap-1 text-sm whitespace-nowrap" disabled={inviting}>
              <UserPlus className="w-4 h-4" />
              {inviting ? 'Adding...' : 'Invite'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
