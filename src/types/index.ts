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
}

export interface CartItem {
  product: Product
  quantity: number
}

export interface User {
  id: string
  name: string
  email: string
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
  code: string
  customer: OrderCustomer
  paymentMethod: PaymentMethod | undefined
  shippingOption: ShippingOption | undefined
  items: CartItem[]
  subtotal: number
  shippingCost: number
  total: number
  submittedAt: string
}
