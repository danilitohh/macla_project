import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

interface AdminRouteProps {
  children: ReactNode
  redirectTo?: string
}

const AdminRoute = ({ children, redirectTo = '/cuenta' }: AdminRouteProps) => {
  const { user, isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="page">
        <section className="section section--intro">
          <div className="container">
            <h1>Validando tu sesión…</h1>
            <p>Un momento mientras confirmamos permisos de administrador.</p>
          </div>
        </section>
      </div>
    )
  }

  if (!isAuthenticated || user?.role !== 'admin') {
    return <Navigate to={redirectTo} replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}

export default AdminRoute
