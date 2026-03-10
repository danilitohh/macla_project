import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { initAnalytics, trackPageview } from '../utils/analytics'

const AnalyticsTracker = () => {
  const location = useLocation()

  useEffect(() => {
    initAnalytics()
  }, [])

  useEffect(() => {
    trackPageview(location.pathname + location.search)
  }, [location.pathname, location.search])

  return null
}

export default AnalyticsTracker
