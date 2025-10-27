import type { CartItem, User } from '../types'
import { clearToken as clearAuthToken, getToken, persistToken, request } from './apiClient'

export interface Credentials {
  email: string
  password: string
}

export interface RegistrationPayload extends Credentials {
  name: string
}

export const GUEST_CART_KEY = 'macla-guest-cart'
const isBrowser = typeof window !== 'undefined'

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
  clearAuthToken()
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
    clearAuthToken()
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

export { clearAuthToken as clearToken }
