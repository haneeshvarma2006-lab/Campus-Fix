const TOKEN_KEY = 'campusfix.token'

export const getToken = () => {
  try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}

export const setToken = (token) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch { /* private browsing — the session just won't persist */ }
}

export class ApiError extends Error {
  constructor(message, status, field) {
    super(message)
    this.status = status
    this.field = field
  }
}

/**
 * Thin fetch wrapper: attaches the bearer token, sends JSON unless given a
 * FormData body, and turns any non-2xx into an ApiError carrying the server's
 * own message so forms can show something useful.
 */
async function request(path, { method = 'GET', body, signal } = {}) {
  const headers = {}
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let payload = body
  if (body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  let res
  try {
    res = await fetch(`/api${path}`, { method, headers, body: payload, signal })
  } catch (err) {
    if (err.name === 'AbortError') throw err
    throw new ApiError('Could not reach the server. Is the API running?', 0)
  }

  if (res.status === 204) return null

  const text = await res.text()
  let data = null
  try { data = text ? JSON.parse(text) : null } catch { /* non-JSON error page */ }

  if (!res.ok) {
    throw new ApiError(data?.error || `Request failed (${res.status})`, res.status, data?.field)
  }
  return data
}

const qs = (params) => {
  const search = new URLSearchParams()
  for (const [k, v] of Object.entries(params || {})) {
    if (v !== undefined && v !== null && v !== '') search.set(k, v)
  }
  const s = search.toString()
  return s ? `?${s}` : ''
}

export const api = {
  signup: (body) => request('/auth/signup', { method: 'POST', body }),
  login: (body) => request('/auth/login', { method: 'POST', body }),
  me: (signal) => request('/auth/me', { signal }),
  providers: (signal) => request('/auth/providers', { signal }),

  listReports: (params, signal) => request(`/reports${qs(params)}`, { signal }),
  getReport: (id, signal) => request(`/reports/${id}`, { signal }),
  createReport: (formData) => request('/reports', { method: 'POST', body: formData }),
  setStatus: (id, body) => request(`/reports/${id}/status`, { method: 'PATCH', body }),
  setPriority: (id, body) => request(`/reports/${id}/priority`, { method: 'PATCH', body }),
  deleteReport: (id) => request(`/reports/${id}`, { method: 'DELETE' }),
  vote: (id) => request(`/reports/${id}/vote`, { method: 'POST' }),
  comment: (id, body) => request(`/reports/${id}/comments`, { method: 'POST', body }),

  listCategories: (signal) => request('/categories', { signal }),
  listLocations: (signal) => request('/categories/locations', { signal }),
  addCategory: (body) => request('/categories', { method: 'POST', body }),
  deleteCategory: (id) => request(`/categories/${id}`, { method: 'DELETE' }),

  listUsers: (signal) => request('/users', { signal }),
  setRole: (id, body) => request(`/users/${id}/role`, { method: 'PATCH', body }),

  stats: (signal) => request('/stats', { signal }),
}
