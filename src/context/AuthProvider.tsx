import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { AuthContext } from './AuthContext'
import { authenticateUser, getActiveUser, logoutUser, registerUser, type Credentials, type RegistrationPayload } from '../services/authService'
import type { User } from '../types'

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const fetchActiveUser = async () => {
      try {
        const active = await getActiveUser()
        if (isMounted) {
          setUser(active)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    fetchActiveUser()

    return () => {
      isMounted = false
    }
  }, [])

  const login = useCallback(
    async (credentials: Credentials) => {
      try {
        setError(null)
        const authenticated = await authenticateUser(credentials)
        setUser(authenticated)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'No pudimos iniciar sesión. Intenta nuevamente.'
        setError(message)
        throw err
      }
    },
    []
  )

  const register = useCallback(
    async (payload: RegistrationPayload) => {
      try {
        setError(null)
        const registered = await registerUser(payload)
        setUser(registered)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'No pudimos crear tu cuenta. Intenta nuevamente.'
        setError(message)
        throw err
      }
    },
    []
  )

  const logout = useCallback(() => {
    logoutUser()
    setUser(null)
    setError(null)
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isLoading,
        error,
        login,
        register,
        logout,
        clearError
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
