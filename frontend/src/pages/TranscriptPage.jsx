import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FileAudio, ClipboardPaste, Mic, MicOff, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { transcriptsApi } from '../api/transcripts'
import { meetingsApi } from '../api/meetings'
import { useWebSocket } from '../hooks/useWebSocket'
import { useAuth } from '../context/AuthContext'

const TABS = ['paste', 'upload', 'live']

export default function TranscriptPage() {
  const { id: meetingId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [tab, setTab] = useState('paste')
  const [transcript, setTranscript] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pasteText, setPasteText] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const fileRef = useRef()
  const mediaRef = useRef()
  const recorderRef = useRef()

  const { connected, transcript: liveChunks, connect, disconnect, sendChunk } = useWebSocket(meetingId)

  useEffect(() => {
    transcriptsApi.get(meetingId)
      .then(setTranscript)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [meetingId])

  const handlePasteSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const result = await transcriptsApi.paste(meetingId, pasteText)
      setTranscript(result)
      toast.success('Transcript saved')
      navigate(`/meetings/${meetingId}`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const result = await transcriptsApi.uploadAudio(meetingId, file, (ev) => {
        setUploadProgress(Math.round((ev.loaded / ev.total) * 100))
      })
      setTranscript(result)
      toast.success('Audio transcribed and saved')
      navigate(`/meetings/${meetingId}`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const handleDeleteTranscript = async () => {
    if (!confirm('Delete the transcript? This will also invalidate all Ghost Reports for this meeting.')) return
    try {
      await transcriptsApi.delete(meetingId)
      setTranscript(null)
      toast.success('Transcript deleted')
    } catch (e) {
      toast.error(e.message)
    }
  }

  const startLive = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRef.current = stream
      connect()

      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      recorderRef.current = recorder
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) sendChunk(e.data)
      }
      recorder.start(3000)
    } catch {
      toast.error('Microphone access denied')
    }
  }

  const stopLive = () => {
    recorderRef.current?.stop()
    mediaRef.current?.getTracks().forEach((t) => t.stop())
    disconnect()
  }

  if (loading) return <div className="flex justify-center py-20 text-gray-500">Loading...</div>

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-2">Transcript</h1>
      <p className="text-gray-400 text-sm mb-6">Upload audio, paste text, or record live. Ghost needs this to generate your report.</p>

      {transcript && (
        <div className="card mb-6 border-green-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-400 font-medium text-sm">✓ Transcript uploaded</p>
              <p className="text-gray-500 text-xs mt-0.5">{transcript.turns?.length} speaker turns · Source: {transcript.source}</p>
            </div>
            <button onClick={handleDeleteTranscript} className="text-gray-600 hover:text-red-400 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          {transcript.turns?.slice(0, 3).map((turn) => (
            <div key={turn.id} className="mt-3 text-xs text-gray-500 font-mono">
              <span className="text-ghost-400">[{Math.floor(turn.start_time / 60)}:{String(Math.floor(turn.start_time % 60)).padStart(2, '0')}]</span>{' '}
              <span className="text-gray-300">{turn.speaker_label}:</span> {turn.content.slice(0, 100)}{turn.content.length > 100 ? '...' : ''}
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 p-1 rounded-lg mb-6 border border-gray-800">
        {[
          { key: 'paste', icon: ClipboardPaste, label: 'Paste text' },
          { key: 'upload', icon: FileAudio, label: 'Upload audio' },
          { key: 'live', icon: Mic, label: 'Live record' },
        ].map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === key ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* Paste tab */}
      {tab === 'paste' && (
        <form onSubmit={handlePasteSubmit} className="space-y-4">
          <div>
            <label className="label">Paste your meeting transcript</label>
            <p className="text-gray-600 text-xs mb-2">
              Supports formats like: <span className="font-mono">[00:01:23] Name: text</span> or <span className="font-mono">SPEAKER_00: text</span>
            </p>
            <textarea
              className="textarea font-mono text-xs"
              rows={14}
              placeholder={'[00:00] Sarah: Good morning everyone, let\'s get started...\n[00:15] Marcus: Before we begin, I want to revisit the timeline...'}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save transcript'}
          </button>
        </form>
      )}

      {/* Upload tab */}
      {tab === 'upload' && (
        <div className="card text-center py-10">
          <FileAudio className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-300 font-medium mb-1">Upload audio or video file</p>
          <p className="text-gray-500 text-sm mb-6">MP3, MP4, WAV, WebM — up to 25MB. Transcribed by Whisper.</p>

          {uploading ? (
            <div className="space-y-2">
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-ghost-600 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-gray-400 text-sm">{uploadProgress < 100 ? `Uploading... ${uploadProgress}%` : 'Transcribing with Whisper...'}</p>
            </div>
          ) : (
            <>
              <input
                ref={fileRef}
                type="file"
                accept="audio/*,video/mp4,video/webm"
                className="hidden"
                onChange={handleFileUpload}
              />
              <button className="btn-primary" onClick={() => fileRef.current?.click()}>
                Choose file
              </button>
            </>
          )}
        </div>
      )}

      {/* Live tab */}
      {tab === 'live' && (
        <div className="card text-center py-10">
          {connected ? (
            <>
              <div className="w-12 h-12 bg-red-900/40 border border-red-700 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Mic className="w-6 h-6 text-red-400" />
              </div>
              <p className="text-red-300 font-medium mb-1">Recording live...</p>
              <p className="text-gray-500 text-sm mb-6">{liveChunks.length} segments captured</p>
              <div className="max-h-40 overflow-y-auto text-left space-y-1 mb-6">
                {liveChunks.map((chunk, i) => (
                  <p key={i} className="text-xs text-gray-400 font-mono">{chunk.text}</p>
                ))}
              </div>
              <button className="btn-danger flex items-center gap-2 mx-auto" onClick={stopLive}>
                <MicOff className="w-4 h-4" /> Stop recording
              </button>
            </>
          ) : (
            <>
              <Mic className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-300 font-medium mb-1">Live transcription</p>
              <p className="text-gray-500 text-sm mb-6">Start recording and Ghost will transcribe in real-time via WebSocket + Whisper.</p>
              <button className="btn-primary flex items-center gap-2 mx-auto" onClick={startLive}>
                <Mic className="w-4 h-4" /> Start recording
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
