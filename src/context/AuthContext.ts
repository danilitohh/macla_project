import { createContext } from 'react'
import type { User } from '../types'
import type { Credentials, RegistrationPayload } from '../services/authService'

export interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (credentials: Credentials) => Promise<void>
  register: (payload: RegistrationPayload) => Promise<void>
  logout: () => void
  clearError: () => void
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
