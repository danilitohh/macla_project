let isInitialized = false

const gaId = import.meta.env.VITE_GA_MEASUREMENT_ID

const loadScript = (src: string) => {
  const existing = document.querySelector(`script[src="${src}"]`)
  if (existing) return
  const script = document.createElement('script')
  script.async = true
  script.src = src
  document.head.appendChild(script)
}

export const initAnalytics = () => {
  if (isInitialized || !gaId) {
    return false
  }

  window.dataLayer = window.dataLayer || []
  function gtag(...args: unknown[]) {
    window.dataLayer?.push(args)
  }
  ;(window as typeof window & { gtag: typeof gtag }).gtag = gtag

  loadScript(`https://www.googletagmanager.com/gtag/js?id=${gaId}`)
  gtag('js', new Date())
  gtag('config', gaId)
  isInitialized = true
  return true
}

export const trackPageview = (path: string) => {
  if (!gaId || typeof window.gtag !== 'function') {
    return
  }
  window.gtag('event', 'page_view', { page_path: path })
}

export const trackEvent = (eventName: string, params?: Record<string, unknown>) => {
  if (!gaId || typeof window.gtag !== 'function') {
    return
  }
  window.gtag('event', eventName, params)
}

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}
