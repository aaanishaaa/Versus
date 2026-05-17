const TOKEN_KEY = 'versus_token'

const decodePayload = (token) => {
  try {
    const payload = token.split('.')[1]
    if (!payload) {
      return null
    }
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(decoded)
  } catch (_error) {
    return null
  }
}

export const getToken = () => localStorage.getItem(TOKEN_KEY)

export const setToken = (token) => {
  localStorage.setItem(TOKEN_KEY, token)
}

export const clearToken = () => {
  localStorage.removeItem(TOKEN_KEY)
}

export const isTokenExpired = (token) => {
  const payload = decodePayload(token)
  if (!payload || !payload.exp) {
    return true
  }
  return Date.now() >= payload.exp * 1000
}

export const hasValidToken = () => {
  const token = getToken()
  if (!token) {
    return false
  }

  if (isTokenExpired(token)) {
    clearToken()
    return false
  }

  return true
}
