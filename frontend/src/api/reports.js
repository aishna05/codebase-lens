import client from './client'

export const reportsApi = {
  get: (meetingId) => client.get(`/meetings/${meetingId}/report`),
  generate: (meetingId) => client.post(`/meetings/${meetingId}/report/generate`),
}
