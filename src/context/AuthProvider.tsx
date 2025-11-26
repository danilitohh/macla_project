import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { AuthContext } from './AuthContext'
import {
  authenticateUser,
  getActiveUser,
  logoutUser,
  registerUser,
  requestPasswordReset as requestPasswordResetService,
  resetPassword as resetPasswordService,
  updateUserProfile,
  type Credentials,
  type ProfileUpdatePayload,
  type RecoveryRequestPayload,
  type RecoveryResponse,
  type RegistrationPayload,
  type ResetPasswordPayload
} from '../services/authService'
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
    async (payload: RegistrationPayload): Promise<User> => {
      try {
        setError(null)
        const result = await registerUser(payload)
        setUser(result.user)
        return result.user
      } catch (err) {
        const message = err instanceof Error ? err.message : 'No pudimos crear tu cuenta. Intenta nuevamente.'
        setError(message)
        throw err
      }
    },
    []
  )

  const requestPasswordReset = useCallback(
    async (payload: RecoveryRequestPayload): Promise<RecoveryResponse> => {
      try {
        setError(null)
        return await requestPasswordResetService(payload)
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'No pudimos iniciar la recuperación. Intenta nuevamente más tarde.'
        setError(message)
        throw err
      }
    },
    []
  )

  const resetPassword = useCallback(async (payload: ResetPasswordPayload) => {
    try {
      setError(null)
      const nextUser = await resetPasswordService(payload)
      setUser(nextUser)
      return nextUser
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No pudimos restablecer tu contraseña.'
      setError(message)
      throw err
    }
  }, [])

  const updateProfile = useCallback(async (payload: ProfileUpdatePayload) => {
    try {
      setError(null)
      const updated = await updateUserProfile(payload)
      setUser(updated)
      return updated
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No pudimos guardar los cambios del perfil.'
      setError(message)
      throw err
    }
  }, [])

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
        requestPasswordReset,
        resetPassword,
        updateProfile,
        logout,
        clearError
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
