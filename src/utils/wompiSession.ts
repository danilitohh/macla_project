const STORAGE_KEY = 'macla-wompi-intent'
const isBrowser = typeof window !== 'undefined'

export interface WompiIntent {
  orderCode: string
  total: number
  currency: string
  createdAt: string
}

export const saveWompiIntent = (intent: WompiIntent): void => {
  if (!isBrowser) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(intent))
  } catch (_error) {
    // Ignored: storage is best-effort
  }
}

export const getWompiIntent = (): WompiIntent | null => {
  if (!isBrowser) return null
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed.orderCode === 'string') {
      return parsed as WompiIntent
    }
  } catch (_error) {
    return null
  }
  return null
}

export const clearWompiIntent = (): void => {
  if (!isBrowser) return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch (_error) {
    // Ignored
  }
}
