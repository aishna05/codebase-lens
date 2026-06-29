import axios from 'axios'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8004',
  timeout: 120_000, // repo analysis can take ~30-60s
})

export default client
