import client from './client'

export const authApi = {
  register: (email, name, password) => client.post('/auth/register', { email, name, password }),
  login: (email, password) => client.post('/auth/login', { email, password }),
  me: () => client.get('/auth/me'),
}
