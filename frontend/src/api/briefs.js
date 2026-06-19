import client from './client'

export const briefsApi = {
  get: (meetingId) => client.get(`/meetings/${meetingId}/brief`),
  create: (meetingId, data) => client.post(`/meetings/${meetingId}/brief`, data),
  update: (meetingId, data) => client.patch(`/meetings/${meetingId}/brief`, data),
  delete: (meetingId) => client.delete(`/meetings/${meetingId}/brief`),
}
