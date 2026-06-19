import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Ghost, Calendar, FileText, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { meetingsApi } from '../api/meetings'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'

const STATUS_LABELS = {
  pending: { label: 'No transcript', color: 'text-gray-500' },
  transcribed: { label: 'Ready to brief', color: 'text-yellow-400' },
  analyzing: { label: 'Analyzing...', color: 'text-ghost-400' },
  ready: { label: 'Report ready', color: 'text-green-400' },
}

export default function Dashboard() {
  const { user } = useAuth()
  const [meetings, setMeetings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    meetingsApi.list()
      .then(setMeetings)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Your meetings</h1>
          <p className="text-gray-400 text-sm mt-1">Hey {user?.name?.split(' ')[0]} — what did Ghost catch this week?</p>
        </div>
        <Link to="/meetings/new" className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New meeting
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card animate-pulse h-20 bg-gray-900" />
          ))}
        </div>
      ) : meetings.length === 0 ? (
        <div className="card text-center py-16">
          <Ghost className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-400 mb-2">No meetings yet</h2>
          <p className="text-gray-600 text-sm mb-6">Create a meeting and upload a transcript to get your first Ghost Report.</p>
          <Link to="/meetings/new" className="btn-primary inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> Create your first meeting
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {meetings.map((meeting) => {
            const status = STATUS_LABELS[meeting.status] || STATUS_LABELS.pending
            return (
              <Link
                key={meeting.id}
                to={`/meetings/${meeting.id}`}
                className="card flex items-center justify-between hover:border-ghost-700 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-ghost-900/40 border border-ghost-800 rounded-lg flex items-center justify-center">
                    <Ghost className="w-5 h-5 text-ghost-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white group-hover:text-ghost-300 transition-colors">
                      {meeting.title}
                    </h3>
                    <div className="flex items-center gap-3 mt-0.5">
                      {meeting.meeting_date && (
                        <span className="text-gray-500 text-xs flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(meeting.meeting_date), 'MMM d, yyyy')}
                        </span>
                      )}
                      <span className={`text-xs font-medium ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-ghost-400 transition-colors" />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
