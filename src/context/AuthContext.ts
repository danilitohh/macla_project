import { createContext } from 'react'
import type { User } from '../types'
import type {
  ActivationPayload,
  Credentials,
  ProfileUpdatePayload,
  RegistrationPayload,
  RegistrationResponse,
  RecoveryRequestPayload,
  RecoveryResponse,
  ResendActivationResponse,
  ResetPasswordPayload
} from '../services/authService'

export interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (credentials: Credentials) => Promise<void>
  register: (payload: RegistrationPayload) => Promise<RegistrationResponse>
  activate: (payload: ActivationPayload) => Promise<{ user?: User; alreadyActive?: boolean }>
  resendActivation: (email: string) => Promise<ResendActivationResponse>
  requestPasswordReset: (payload: RecoveryRequestPayload) => Promise<RecoveryResponse>
  resetPassword: (payload: ResetPasswordPayload) => Promise<User>
  updateProfile: (payload: ProfileUpdatePayload) => Promise<User>
  logout: () => void
  clearError: () => void
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
