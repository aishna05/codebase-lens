import client from './client'
import axios from 'axios'

export const transcriptsApi = {
  get: (meetingId) => client.get(`/meetings/${meetingId}/transcript`),

  paste: (meetingId, text, speakerMap) =>
    client.post(`/meetings/${meetingId}/transcript/paste`, { text, speaker_map: speakerMap || null }),

  uploadAudio: (meetingId, file, onProgress) => {
    const token = localStorage.getItem('ghost_token')
    const formData = new FormData()
    formData.append('file', file)
    return axios.post(`/api/meetings/${meetingId}/transcript/upload-audio`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${token}`,
      },
      onUploadProgress: onProgress,
    }).then(r => r.data)
  },

  delete: (meetingId) => client.delete(`/meetings/${meetingId}/transcript`),
}
