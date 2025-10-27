import type { OrderPayload, OrderSummary } from '../types'
import { request } from './apiClient'

export const submitOrder = async (payload: OrderPayload): Promise<OrderSummary> => {
  const result = await request<{ order: OrderSummary }>('/orders', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
  return result.order
}

export const getUserOrders = async (): Promise<OrderSummary[]> => {
  const result = await request<{ orders: OrderSummary[] }>('/orders', {
    method: 'GET'
  })
  return Array.isArray(result.orders) ? result.orders : []
}
