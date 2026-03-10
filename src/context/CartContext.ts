import { createContext } from 'react'
import type { CartItem, Product } from '../types'

export interface CartState {
  items: CartItem[]
}

export interface CartContextValue extends CartState {
  addItem: (product: Product, quantity?: number) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  totalItems: number
  subtotal: number
}

export type CartAction =
  | { type: 'ADD_ITEM'; payload: { product: Product; quantity: number } }
  | { type: 'REMOVE_ITEM'; payload: { productId: string } }
  | { type: 'UPDATE_QUANTITY'; payload: { productId: string; quantity: number; stock: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'LOAD'; payload: CartState }

export const CartContext = createContext<CartContextValue | undefined>(undefined)
