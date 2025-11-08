import type { CartItem, User } from '../types'
import { clearToken as clearAuthToken, getToken, persistToken, request } from './apiClient'

export interface Credentials {
  email: string
  password: string
}

export interface RegistrationPayload extends Credentials {
  name: string
  phone?: string
  city?: string
  address?: string
  channel?: 'email' | 'sms'
}

export interface RegistrationResponse {
  requiresActivation: boolean
  message: string
  email: string
  userId: string
  channel: 'email' | 'sms'
  debug?: ActivationDebug | null
}

export interface ActivationDebug {
  token: string
  code: string
  expiresAt: string
  channel: 'email' | 'sms'
}

export interface ActivationPayload {
  email: string
  token?: string
  code?: string
}

export interface RecoveryRequestPayload {
  email?: string
  phone?: string
  channel?: 'email' | 'sms'
}

export interface ResetPasswordPayload extends ActivationPayload {
  password: string
}

export interface ProfileUpdatePayload {
  name: string
  phone?: string
  city?: string
  address?: string
}

export const GUEST_CART_KEY = 'macla-guest-cart'
const isBrowser = typeof window !== 'undefined'

export const registerUser = async (payload: RegistrationPayload): Promise<RegistrationResponse> => {
  const result = await request<RegistrationResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
  return result
}

export const activateAccount = async (payload: ActivationPayload) => {
  const result = await request<{ token?: string; user?: User; alreadyActive?: boolean }>('/auth/activate', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
  if (result.token && result.user) {
    persistToken(result.token)
  }
  return result
}

export interface ResendActivationResponse {
  message: string
  channel: string
  debug?: ActivationDebug | null
}

export interface RecoveryResponse {
  message: string
  channel: string
  debug?: ActivationDebug | null
}

export const resendActivation = async (email: string) => {
  return request<ResendActivationResponse>('/auth/resend-activation', {
    method: 'POST',
    body: JSON.stringify({ email })
  })
}

export const requestPasswordReset = async (payload: RecoveryRequestPayload) => {
  return request<RecoveryResponse>('/auth/recover', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export const resetPassword = async (payload: ResetPasswordPayload) => {
  const result = await request<{ token: string; user: User }>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(payload)
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

export const updateUserProfile = async (payload: ProfileUpdatePayload): Promise<User> => {
  const result = await request<{ user: User }>('/profile', {
    method: 'PUT',
    body: JSON.stringify(payload)
  })
  return result.user
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
