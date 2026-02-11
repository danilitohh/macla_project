import { request } from './apiClient'
import type { Announcement, Product, Review } from '../types'
import type { DiscountCode } from '../types'

export const getProducts = async (): Promise<Product[]> => {
  const result = await request<{ products: Product[] }>('/products', { method: 'GET' })
  return Array.isArray(result.products) ? result.products : []
}

export const getProductById = async (id: string): Promise<Product | null> => {
  const result = await request<{ product: Product }>(`/products/${id}`, { method: 'GET' })
  return result.product ?? null
}

export const getProductReviews = async (productId: string): Promise<Review[]> => {
  const result = await request<{ reviews: Review[] }>(`/products/${productId}/reviews`, { method: 'GET' })
  return Array.isArray(result.reviews) ? result.reviews : []
}

export const getAnnouncements = async (): Promise<Announcement[]> => {
  const result = await request<{ announcements: Announcement[] }>('/announcements', { method: 'GET' })
  return Array.isArray(result.announcements) ? result.announcements : []
}

export const getAdminProducts = async (): Promise<Product[]> => {
  const result = await request<{ products: Product[] }>('/admin/products', { method: 'GET' })
  return Array.isArray(result.products) ? result.products : []
}

export const createAdminProduct = async (payload: Partial<Product>): Promise<Product> => {
  const result = await request<{ product: Product }>('/admin/products', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
  return result.product
}

export const updateAdminProduct = async (id: string, payload: Partial<Product>): Promise<Product> => {
  const result = await request<{ product: Product }>(`/admin/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  })
  return result.product
}

export const deleteAdminProduct = async (id: string): Promise<void> => {
  await request<void>(`/admin/products/${id}`, { method: 'DELETE' })
}

export const getAdminAnnouncements = async (): Promise<Announcement[]> => {
  const result = await request<{ announcements: Announcement[] }>('/admin/announcements', { method: 'GET' })
  return Array.isArray(result.announcements) ? result.announcements : []
}

export const getAdminDiscounts = async (): Promise<DiscountCode[]> => {
  const result = await request<{ discounts: DiscountCode[] }>('/admin/discounts', { method: 'GET' })
  return Array.isArray(result.discounts) ? result.discounts : []
}

export const upsertAdminDiscount = async (payload: DiscountCode): Promise<DiscountCode> => {
  const result = await request<{ discount: DiscountCode }>('/admin/discounts', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
  return result.discount
}

export const deleteAdminDiscount = async (code: string): Promise<void> => {
  await request<void>(`/admin/discounts/${encodeURIComponent(code)}`, { method: 'DELETE' })
}

export const getAdminReviews = async (productId: string): Promise<Review[]> => {
  const result = await request<{ reviews: Review[] }>(`/admin/products/${productId}/reviews`, { method: 'GET' })
  return Array.isArray(result.reviews) ? result.reviews : []
}

export const createAdminReview = async (
  productId: string,
  payload: Partial<Review>
): Promise<Review> => {
  const result = await request<{ review: Review }>(`/admin/products/${productId}/reviews`, {
    method: 'POST',
    body: JSON.stringify(payload)
  })
  return result.review
}

export const deleteAdminReview = async (productId: string, reviewId: number): Promise<void> => {
  await request<void>(`/admin/products/${productId}/reviews/${reviewId}`, { method: 'DELETE' })
}

export const createAdminAnnouncement = async (payload: Partial<Announcement>): Promise<Announcement> => {
  const result = await request<{ announcement: Announcement }>('/admin/announcements', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
  return result.announcement
}

export const updateAdminAnnouncement = async (
  id: string,
  payload: Partial<Announcement>
): Promise<Announcement> => {
  const result = await request<{ announcement: Announcement }>(`/admin/announcements/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  })
  return result.announcement
}

export const deleteAdminAnnouncement = async (id: string): Promise<void> => {
  await request<void>(`/admin/announcements/${id}`, { method: 'DELETE' })
}
