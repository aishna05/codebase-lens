import client from './client'

export const analyzeRepo = (repo_url) =>
  client.post('/api/analyze', { repo_url }).then(r => r.data)

export const getSummary = (repo_url) =>
  client.post('/api/summary', { repo_url }).then(r => r.data)

export const getWorkflow = (repo_url) =>
  client.post('/api/workflow', { repo_url }).then(r => r.data)

export const sendChat = (repo_url, messages) =>
  client.post('/api/chat', { repo_url, messages }).then(r => r.data)

export const generateDoc = (repo_url, doc_type, custom_prompt = '') =>
  client.post('/api/generate-doc', { repo_url, doc_type, custom_prompt }).then(r => r.data)

export const scanDirectory = (path) =>
  client.post('/api/scan', { path }).then(r => r.data)

export const explainFile = (path, content) =>
  client.post('/api/explain', { path, content }).then(r => r.data)
