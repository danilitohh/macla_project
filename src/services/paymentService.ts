import { request } from './apiClient'

export interface WompiConfig {
  publicKey: string
  redirectUrl: string
  environment: string
  currency: string
}

export const getWompiConfig = async (): Promise<WompiConfig> => {
  const result = await request<WompiConfig>('/payments/wompi/config', { method: 'GET' })
  return result
}

export const verifyWompiTransaction = async (payload: { transactionId: string; orderCode: string }) => {
  return request<{ status: string; transaction: unknown }>('/payments/wompi/verify', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}
