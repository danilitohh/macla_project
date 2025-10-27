import { useMemo, useReducer, useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { CartContext, type CartAction, type CartContextValue, type CartState } from './CartContext'
import { trackEvent } from '../utils/analytics'
import { useAuth } from '../hooks/useAuth'
import { clearGuestCart, getGuestCart, getUserCart, saveGuestCart, saveUserCart } from '../services/authService'

const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'ADD_ITEM': {
      const { product, quantity } = action.payload
      const existing = state.items.find((item) => item.product.id === product.id)
      if (existing) {
        return {
          ...state,
          items: state.items.map((item) =>
            item.product.id === product.id
              ? { ...item, quantity: Math.min(item.quantity + quantity, product.stock) }
              : item
          )
        }
      }
      return {
        ...state,
        items: [...state.items, { product, quantity: Math.min(quantity, product.stock) }]
      }
    }
    case 'REMOVE_ITEM': {
      const { productId } = action.payload
      return { ...state, items: state.items.filter((item) => item.product.id !== productId) }
    }
    case 'UPDATE_QUANTITY': {
      const { productId, quantity, stock } = action.payload
      return {
        ...state,
        items: state.items.map((item) =>
          item.product.id === productId
            ? { ...item, quantity: Math.min(Math.max(quantity, 1), stock) }
            : item
        )
      }
    }
    case 'CLEAR_CART':
      return { ...state, items: [] }
    case 'LOAD':
      return action.payload
    default:
      return state
  }
}

const getInitialState = (): CartState => ({ items: [] })

const sanitizeItems = (items: CartState['items']): CartState['items'] =>
  items.map((item) => ({
    ...item,
    quantity: Number.isFinite(item.quantity) ? Math.max(1, Math.floor(item.quantity)) : 1,
    product: {
      ...item.product
    }
  }))

const mergeCartItems = (primary: CartState['items'], secondary: CartState['items']): CartState['items'] => {
  const map = new Map<string, CartState['items'][number]>()

  const apply = (items: CartState['items']) => {
    items.forEach((entry) => {
      const existing = map.get(entry.product.id)
      if (existing) {
        const combined = existing.quantity + entry.quantity
        map.set(entry.product.id, {
          ...existing,
          quantity: Math.min(combined, entry.product.stock)
        })
      } else {
        map.set(entry.product.id, {
          product: entry.product,
          quantity: Math.min(entry.quantity, entry.product.stock)
        })
      }
    })
  }

  apply(primary)
  apply(secondary)

  return Array.from(map.values())
}

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(cartReducer, undefined, getInitialState)
  const { user, isLoading } = useAuth()
  const lastUserIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (isLoading) {
      return
    }
    let ignore = false

    const loadCart = async () => {
      const currentUserId = user?.id ?? 'guest'
      if (currentUserId === lastUserIdRef.current) {
        return
      }

      try {
        let nextItems: CartState['items'] = []

        if (user) {
          const guestItems = sanitizeItems(getGuestCart())
          const persisted = sanitizeItems(await getUserCart())
          nextItems = mergeCartItems(persisted, guestItems)

          if (guestItems.length > 0) {
            await saveUserCart(nextItems)
            clearGuestCart()
          }
        } else {
          nextItems = sanitizeItems(getGuestCart())
        }

        if (!ignore) {
          lastUserIdRef.current = currentUserId
          dispatch({ type: 'LOAD', payload: { items: nextItems } })
        }
      } catch (error) {
        console.error('[CartProvider] Error loading cart', error)
        if (!ignore) {
          lastUserIdRef.current = currentUserId
          dispatch({ type: 'LOAD', payload: { items: [] } })
        }
      }
    }

    loadCart()

    return () => {
      ignore = true
    }
  }, [user, isLoading])

  useEffect(() => {
    if (isLoading) {
      return
    }
    if (user) {
      saveUserCart(state.items).catch((error) => {
        console.error('[CartProvider] Error saving cart', error)
      })
    } else {
      saveGuestCart(state.items)
    }
  }, [state.items, user, isLoading])

  const value = useMemo<CartContextValue>(() => {
    const subtotal = state.items.reduce((acc, item) => acc + item.product.price * item.quantity, 0)
    const totalItems = state.items.reduce((acc, item) => acc + item.quantity, 0)

    return {
      ...state,
      addItem: (product, quantity = 1) => {
        dispatch({ type: 'ADD_ITEM', payload: { product, quantity } })
        trackEvent('add_to_cart', {
          item_id: product.id,
          item_name: product.name,
          quantity,
          price: product.price
        })
      },
      removeItem: (productId) => {
        dispatch({ type: 'REMOVE_ITEM', payload: { productId } })
        trackEvent('remove_from_cart', { item_id: productId })
      },
      updateQuantity: (productId, quantity) => {
        const target = state.items.find((item) => item.product.id === productId)
        if (!target) {
          return
        }
        dispatch({
          type: 'UPDATE_QUANTITY',
          payload: { productId, quantity, stock: target.product.stock }
        })
        trackEvent('update_cart', { item_id: productId, quantity })
      },
      clearCart: () => {
        dispatch({ type: 'CLEAR_CART' })
        trackEvent('clear_cart')
      },
      subtotal,
      totalItems
    }
  }, [state])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
