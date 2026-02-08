export type Category =
  | 'planchas'
  | 'secadoras'
  | 'onduladoras'
  | 'bolsos'

export interface Product {
  id: string
  name: string
  shortDescription: string
  description: string
  category: Category
  price: number
  currency: 'COP'
  stock: number
  images: string[]
  features: string[]
  highlights: string[]
  tags?: string[]
  specs?: Record<string, string | number>
  isActive?: boolean
}

export interface CartItem {
  product: Product
  quantity: number
}

export interface User {
  id: string
  name: string
  email: string
  role?: 'customer' | 'admin'
  phone?: string | null
  city?: string | null
  address?: string | null
  emailVerified?: boolean
}

export interface ShippingOption {
  id: string
  label: string
  description: string
  price: number
  regions: string[]
}

export interface PaymentMethod {
  id: string
  label: string
  description: string
}

export interface OrderCustomer {
  name: string
  email: string
  phone: string
  city: string
  address: string
  notes?: string
}

export interface OrderPayload {
  customer: OrderCustomer
  shippingOptionId: string | null
  paymentMethodId: string | null
  addressId?: number | null
  discountCode?: string | null
  items?: CartItem[]
}

export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'cancelled'

export interface OrderProductSnapshot extends Record<string, unknown> {
  id: string
  name: string
  price: number
  currency: 'COP'
  images?: string[]
  image?: string | null
  imageUrl?: string | null
}

export interface OrderItemSummary {
  product: OrderProductSnapshot
  quantity: number
  unitPrice: number
  lineTotal: number
}

export interface OrderSummary {
  id: number
  code: string
  status: OrderStatus
  submittedAt: string | null
  subtotal: number
  shippingCost: number
  discount: number
  total: number
  currency: 'COP'
  customerName: string
  customerCity: string
  notes: string | null
  discountCode?: string | null
  paymentMethod: { id: string; label: string; description?: string | null } | null
  shippingOption: { id: string; label: string; description?: string | null; price: number | null } | null
  items: OrderItemSummary[]
}

export interface Address {
  id: number
  label: string
  contactName: string
  contactPhone: string
  city: string
  address: string
  notes?: string | null
  isDefaultShipping: boolean
  isDefaultBilling: boolean
}

export interface Announcement {
  id: string
  title: string
  description: string
  badge?: string | null
  ctaLabel?: string | null
  ctaUrl?: string | null
  imageUrl?: string | null
  sortOrder: number
  isActive: boolean
}
