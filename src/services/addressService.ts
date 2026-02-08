import type { Address } from '../types'
import { request } from './apiClient'

export interface AddressPayload {
  label?: string
  contactName?: string
  contactPhone?: string
  city?: string
  address: string
  notes?: string
  isDefaultShipping?: boolean
  isDefaultBilling?: boolean
}

export const getAddresses = async (): Promise<Address[]> => {
  const result = await request<{ addresses: Address[] }>('/addresses', { method: 'GET' })
  return Array.isArray(result.addresses) ? result.addresses : []
}

export const createAddress = async (payload: AddressPayload): Promise<Address> => {
  const result = await request<{ address: Address }>('/addresses', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
  return result.address
}
