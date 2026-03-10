const isBrowser = typeof window !== 'undefined'
const TOKEN_KEY = 'macla-auth-token'
const DEFAULT_API_BASE = 'http://localhost:4000/api'

const getApiBaseUrl = () => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) {
    return String(import.meta.env.VITE_API_URL).replace(/\/$/, '')
  }
  return DEFAULT_API_BASE
}

export const getToken = (): string | null => {
  if (!isBrowser) {
    return null
  }
  return window.localStorage.getItem(TOKEN_KEY)
}

export const persistToken = (token: string): void => {
  if (!isBrowser) {
    return
  }
  window.localStorage.setItem(TOKEN_KEY, token)
}

export const clearToken = (): void => {
  if (!isBrowser) {
    return
  }
  window.localStorage.removeItem(TOKEN_KEY)
}

interface ApiErrorPayload {
  message?: string
  [key: string]: unknown
}

export const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
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
    if (response.status === 401) {
      clearToken()
    }
    const error = new Error(errorMessage) as Error & { status?: number; data?: ApiErrorPayload | null }
    error.status = response.status
    error.data = payload
    throw error
  }

  return (payload as T) ?? (undefined as T)
}

export const apiClient = {
  request,
  getToken,
  persistToken,
  clearToken
}
