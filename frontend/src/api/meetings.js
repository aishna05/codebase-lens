import client from './client'

export const meetingsApi = {
  list: () => client.get('/meetings'),
  create: (data) => client.post('/meetings', data),
  get: (id) => client.get(`/meetings/${id}`),
  update: (id, data) => client.patch(`/meetings/${id}`, data),
  delete: (id) => client.delete(`/meetings/${id}`),
  invite: (id, email) => client.post(`/meetings/${id}/invite?email=${encodeURIComponent(email)}`),
  updateSpeakerMap: (id, speakerMap) => client.patch(`/meetings/${id}/speaker-map`, { speaker_map: speakerMap }),
}
