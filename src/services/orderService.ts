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

export const validateDiscount = async ({
  code,
  subtotalCents,
  shippingCents
}: {
  code: string
  subtotalCents: number
  shippingCents: number
}) => {
  return request<{ code: string; discount: number; breakdown: { products: number; shipping: number }; estimatedTotal: number }>(
    '/discounts/validate',
    {
      method: 'POST',
      body: JSON.stringify({ code, subtotalCents, shippingCents })
    }
  )
}
