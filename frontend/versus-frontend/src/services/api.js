import { clearToken, getToken, hasValidToken } from './auth.js'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'

const buildHeaders = (headers = {}) => {
  const finalHeaders = {
    'Content-Type': 'application/json',
    ...headers,
  }

  if (hasValidToken()) {
    finalHeaders.Authorization = `Bearer ${getToken()}`
  }

  return finalHeaders
}

const request = async (endpoint, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: buildHeaders(options.headers),
  })

  let payload = {}
  try {
    payload = await response.json()
  } catch (_error) {
    payload = {}
  }

  if (!response.ok) {
    const message = payload.message || 'Request failed'
    const error = new Error(message)
    error.status = response.status

    if (response.status === 401) {
      clearToken()
    }

    throw error
  }

  return payload
}

export const register = async (email, password) => {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export const login = async (email, password) => {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export const me = async () => {
  return request('/auth/me')
}

export const getMatch = async (matchId) => {
  return request(`/match/${matchId}`)
}

export const submitCode = async (matchId, code, language) => {
  return request('/submit', {
    method: 'POST',
    body: JSON.stringify({ matchId, code, language }),
  })
}

export const giveUpMatch = async (matchId) => {
  return request(`/match/${matchId}/give-up`, {
    method: 'POST',
  })
}

export const getExecutionHealth = async () => {
  return request('/execution/health')
}

export const getMatchResult = async (matchId) => {
  return request(`/match/${matchId}/result`)
}

export const getLeaderboard = async () => {
  return request('/leaderboard')
}

export const getProfile = async (userId) => {
  return request(`/profile/${userId}`)
}
