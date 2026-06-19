import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { meetingsApi } from '../api/meetings'
import toast from 'react-hot-toast'

export default function NewMeeting() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ title: '', description: '', meeting_date: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        title: form.title,
        description: form.description || null,
        meeting_date: form.meeting_date ? new Date(form.meeting_date).toISOString() : null,
      }
      const meeting = await meetingsApi.create(payload)
      toast.success('Meeting created')
      navigate(`/meetings/${meeting.id}`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">New meeting</h1>

      <form onSubmit={handleSubmit} className="card space-y-5">
        <div>
          <label className="label">Meeting title *</label>
          <input
            type="text"
            className="input"
            placeholder="Q4 Roadmap Review"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            required
          />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea
            className="textarea"
            rows={3}
            placeholder="What was this meeting about?"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>
        <div>
          <label className="label">Meeting date</label>
          <input
            type="datetime-local"
            className="input"
            value={form.meeting_date}
            onChange={(e) => setForm((f) => ({ ...f, meeting_date: e.target.value }))}
          />
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            className="btn-secondary flex-1"
            onClick={() => navigate('/dashboard')}
          >
            Cancel
          </button>
          <button type="submit" className="btn-primary flex-1" disabled={loading}>
            {loading ? 'Creating...' : 'Create meeting'}
          </button>
        </div>
      </form>
    </div>
  )
}
