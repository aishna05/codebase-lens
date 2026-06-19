import { useRef, useState, useCallback } from 'react'

export function useWebSocket(meetingId) {
  const wsRef = useRef(null)
  const [connected, setConnected] = useState(false)
  const [transcript, setTranscript] = useState([])
  const [error, setError] = useState(null)

  const connect = useCallback(() => {
    const token = localStorage.getItem('ghost_token')
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const url = `${proto}://${window.location.host}/ws/transcribe/${meetingId}?token=${encodeURIComponent(token)}`

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => setConnected(true)
    ws.onclose = () => setConnected(false)
    ws.onerror = () => setError('WebSocket connection failed')

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === 'transcript') {
        setTranscript((prev) => [...prev, { text: data.text, timestamp: data.timestamp }])
      } else if (data.type === 'error') {
        setError(data.message)
      }
    }
  }, [meetingId])

  const disconnect = useCallback(() => {
    wsRef.current?.close()
  }, [])

  const sendChunk = useCallback((audioBlob) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(audioBlob)
    }
  }, [])

  return { connected, transcript, error, connect, disconnect, sendChunk }
}
