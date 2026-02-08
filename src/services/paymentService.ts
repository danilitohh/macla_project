import { request } from './apiClient'

export interface WompiConfig {
  configured: boolean
  publicKey: string
  redirectUrl: string
  environment: string
  currency: string
  message?: string | null
  integrityRequired?: boolean
}

export const getWompiConfig = async (): Promise<WompiConfig> => {
  const result = await request<WompiConfig>('/payments/wompi/config', { method: 'GET' })
  return result
}

export interface WompiVerificationResult {
  status: 'paid' | 'pending' | 'failed'
  transaction: unknown
}

export const getWompiSignature = async (payload: { orderCode: string }) => {
  return request<{ signature: string; amountInCents: number; currency: string }>('/payments/wompi/signature', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export const verifyWompiTransaction = async (payload: { transactionId: string; orderCode: string }) => {
  return request<WompiVerificationResult>('/payments/wompi/verify', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}
