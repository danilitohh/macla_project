import { createContext } from 'react'
import type { User } from '../types'
import type {
  Credentials,
  ProfileUpdatePayload,
  RegistrationPayload,
  RecoveryRequestPayload,
  RecoveryResponse,
  ResetPasswordPayload
} from '../services/authService'

export interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (credentials: Credentials) => Promise<void>
  register: (payload: RegistrationPayload) => Promise<User>
  requestPasswordReset: (payload: RecoveryRequestPayload) => Promise<RecoveryResponse>
  resetPassword: (payload: ResetPasswordPayload) => Promise<User>
  updateProfile: (payload: ProfileUpdatePayload) => Promise<User>
  logout: () => void
  clearError: () => void
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
