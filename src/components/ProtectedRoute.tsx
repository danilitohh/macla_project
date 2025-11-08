import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

interface ProtectedRouteProps {
  children: ReactNode
  redirectTo?: string
  loadingMessage?: string
}

const ProtectedRoute = ({
  children,
  redirectTo = '/cuenta',
  loadingMessage = 'Validando tu sesión…'
}: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()
  const target = `${location.pathname}${location.search}${location.hash}`

  if (isLoading) {
    return (
      <div className="page">
        <section className="section section--intro">
          <div className="container">
            <h1>{loadingMessage}</h1>
            <p>Un momento mientras recuperamos tu información.</p>
          </div>
        </section>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace state={{ from: target }} />
  }

  return children
}

export default ProtectedRoute
