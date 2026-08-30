const AUTH_MODE = import.meta.env.VITE_AUTH_MODE || 'mock'
const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

const TOKEN_KEY = 'amati_token'
const USER_KEY = 'amati_user'

function getStorage(rememberMe) {
  return rememberMe ? localStorage : sessionStorage
}

function clearLegacySession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(USER_KEY)
}

function persistSession({ token, user, rememberMe }) {
  clearLegacySession()
  const storage = getStorage(rememberMe)
  storage.setItem(TOKEN_KEY, token)
  storage.setItem(USER_KEY, JSON.stringify(user))
}

function getTokenFromStorage() {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY)
}

export function getAccessToken() {
  return getTokenFromStorage()
}

function getUserFromStorage() {
  const userJson = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY)
  if (!userJson) return null

  try {
    return JSON.parse(userJson)
  } catch {
    return null
  }
}

export async function login({ username, password, rememberMe }) {
  const trimmedUsername = username.trim()

  if (!trimmedUsername || !password) {
    throw new Error('Debes ingresar usuario y contraseña.')
  }

  if (AUTH_MODE === 'mock') {
    if (trimmedUsername === 'admin' && password === 'admin123') {
      const session = {
        token: 'mock-token',
        user: { id: '1', username: 'admin', role: 'admin' },
      }

      persistSession({ ...session, rememberMe })
      return session
    }

    throw new Error('Credenciales inválidas (modo mock: admin / admin123).')
  }

  if (!API_URL) {
    throw new Error('Falta configurar VITE_API_URL para autenticar en la nube.')
  }

  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      usernameOrEmail: trimmedUsername,
      password,
    }),
  })

  let payload = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok) {
    throw new Error(payload?.message || 'No fue posible iniciar sesión.')
  }

  const token = payload?.token
  const user = payload?.user || { username: trimmedUsername }

  if (!token) {
    throw new Error('La API no devolvió token de sesión.')
  }

  persistSession({ token, user, rememberMe })
  return { token, user }
}

export function logout() {
  clearLegacySession()
}

export function isAuthenticated() {
  return Boolean(getTokenFromStorage())
}

export function getCurrentUser() {
  return getUserFromStorage()
}
