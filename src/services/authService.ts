import type { CartItem, User } from '../types'

export interface Credentials {
  email: string
  password: string
}

export interface RegistrationPayload extends Credentials {
  name: string
}

const isBrowser = typeof window !== 'undefined'
const TOKEN_KEY = 'macla-auth-token'
export const GUEST_CART_KEY = 'macla-guest-cart'
const DEFAULT_API_BASE = 'http://localhost:4000/api'

const getApiBaseUrl = () => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) {
    return String(import.meta.env.VITE_API_URL).replace(/\/$/, '')
  }
  return DEFAULT_API_BASE
}

const getToken = (): string | null => {
  if (!isBrowser) {
    return null
  }
  return window.localStorage.getItem(TOKEN_KEY)
}

const persistToken = (token: string) => {
  if (!isBrowser) {
    return
  }
  window.localStorage.setItem(TOKEN_KEY, token)
}

export const clearToken = () => {
  if (!isBrowser) {
    return
  }
  window.localStorage.removeItem(TOKEN_KEY)
}

interface ApiErrorPayload {
  message?: string
}

const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const baseUrl = getApiBaseUrl()
  const token = getToken()
  const headers = new Headers(options.headers)

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers
  })

  const contentType = response.headers.get('Content-Type') ?? ''
  const isJson = contentType.includes('application/json')
  const payload = isJson ? ((await response.json()) as ApiErrorPayload) : null

  if (!response.ok) {
    const errorMessage = payload?.message || 'No pudimos procesar tu solicitud.'
    const error = new Error(errorMessage)
    if (response.status === 401) {
      clearToken()
    }
    throw error
  }

  return (payload as T) ?? (undefined as T)
}

export const registerUser = async ({ name, email, password }: RegistrationPayload): Promise<User> => {
  const result = await request<{ token: string; user: User }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password })
  })
  persistToken(result.token)
  return result.user
}

export const authenticateUser = async ({ email, password }: Credentials): Promise<User> => {
  const result = await request<{ token: string; user: User }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  })
  persistToken(result.token)
  return result.user
}

export const logoutUser = (): void => {
  clearToken()
}

export const getActiveUser = async (): Promise<User | null> => {
  if (!getToken()) {
    return null
  }
  try {
    const result = await request<{ user: User }>('/auth/profile', {
      method: 'GET'
    })
    return result.user
  } catch (error) {
    clearToken()
    console.warn('[authService] Error recuperando sesión:', error)
    return null
  }
}

export const getUserCart = async (): Promise<CartItem[]> => {
  const result = await request<{ items: CartItem[] }>('/cart', { method: 'GET' })
  return Array.isArray(result.items) ? result.items : []
}

export const saveUserCart = async (items: CartItem[]): Promise<void> => {
  await request<void>('/cart', {
    method: 'PUT',
    body: JSON.stringify({ items })
  })
}

const withGuestBoundary = <T>(fn: () => T, fallback: T): T => {
  try {
    return fn()
  } catch (error) {
    console.warn('[authService] Error accessing guest storage', error)
    return fallback
  }
}

export const getGuestCart = (): CartItem[] =>
  withGuestBoundary(() => {
    if (!isBrowser) {
      return []
    }
    const raw = window.localStorage.getItem(GUEST_CART_KEY)
    if (!raw) {
      return []
    }
    const parsed = JSON.parse(raw) as { items?: CartItem[] }
    if (!parsed || !Array.isArray(parsed.items)) {
      return []
    }
    return parsed.items
  }, [])

export const saveGuestCart = (items: CartItem[]): void => {
  if (!isBrowser) {
    return
  }
  const payload = { items }
  window.localStorage.setItem(GUEST_CART_KEY, JSON.stringify(payload))
}

export const clearGuestCart = (): void => {
  if (!isBrowser) {
    return
  }
  window.localStorage.removeItem(GUEST_CART_KEY)
}
