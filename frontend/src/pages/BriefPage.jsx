import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { briefsApi } from '../api/briefs'

const FIELDS = [
  {
    key: 'role',
    label: 'Your role in this meeting *',
    placeholder: 'Product Manager presenting Q4 roadmap for approval',
    rows: 2,
    required: true,
  },
  {
    key: 'goals',
    label: 'What do you want to achieve? *',
    placeholder: 'Get sign-off on the 3 priority features. Defend the timeline against pushback from engineering.',
    rows: 3,
    required: true,
  },
  {
    key: 'relationships',
    label: 'Who else is in the room? (your relationship with each)',
    placeholder: 'Marcus (VP Eng) — often challenges my data. David (Design Lead) — ally. Lisa (CFO) — unknown, new attendee.',
    rows: 3,
  },
  {
    key: 'stakes',
    label: "What's at stake for you?",
    placeholder: "This roadmap directly impacts my team's headcount ask. If the timeline slips, I lose credibility with the exec team.",
    rows: 3,
  },
  {
    key: 'ammunition',
    label: 'Data, research, or arguments you have available',
    placeholder: 'Q2 user research: 67% churn cites the auth gap. Competitor analysis showing 3 rivals shipped this feature. Q3 support tickets: 142 related to this.',
    rows: 4,
  },
  {
    key: 'ideas',
    label: 'Ideas or proposals you want to put forward',
    placeholder: "Phased rollout approach: ship auth in Q4, full feature in Q1. I've already scoped this with engineering.",
    rows: 3,
  },
]

export default function BriefPage() {
  const { id: meetingId } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    role: '', goals: '', relationships: '', stakes: '', ammunition: '', ideas: '',
  })
  const [existing, setExisting] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    briefsApi.get(meetingId)
      .then((brief) => {
        setExisting(brief)
        setForm({
          role: brief.role || '',
          goals: brief.goals || '',
          relationships: brief.relationships || '',
          stakes: brief.stakes || '',
          ammunition: brief.ammunition || '',
          ideas: brief.ideas || '',
        })
      })
      .catch(() => {}) // 404 = no brief yet, fine
      .finally(() => setLoading(false))
  }, [meetingId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        role: form.role,
        goals: form.goals,
        relationships: form.relationships || null,
        stakes: form.stakes || null,
        ammunition: form.ammunition || null,
        ideas: form.ideas || null,
      }
      if (existing) {
        await briefsApi.update(meetingId, payload)
        toast.success('Brief updated')
      } else {
        await briefsApi.create(meetingId, payload)
        toast.success('Brief saved')
      }
      navigate(`/meetings/${meetingId}`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex justify-center py-20 text-gray-500">Loading...</div>

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-2">
        <Lock className="w-5 h-5 text-ghost-400" />
        <h1 className="text-2xl font-bold text-white">Your private brief</h1>
      </div>
      <p className="text-gray-400 text-sm mb-8">
        This is only visible to you and Ghost. Not the meeting owner. Not other participants. Ever.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {FIELDS.map((field) => (
          <div key={field.key}>
            <label className="label">{field.label}</label>
            <textarea
              className="textarea"
              rows={field.rows}
              placeholder={field.placeholder}
              value={form[field.key]}
              onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
              required={field.required}
            />
          </div>
        ))}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            className="btn-secondary flex-1"
            onClick={() => navigate(`/meetings/${meetingId}`)}
          >
            Cancel
          </button>
          <button type="submit" className="btn-primary flex-1" disabled={saving}>
            {saving ? 'Saving...' : existing ? 'Update brief' : 'Save brief'}
          </button>
        </div>
      </form>
    </div>
  )
}
