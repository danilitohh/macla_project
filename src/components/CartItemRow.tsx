import { Link } from 'react-router-dom'
import { useCart } from '../hooks/useCart'
import { formatCurrency } from '../utils/format'
import type { CartItem } from '../types'

interface Props {
  item: CartItem
}

const CartItemRow = ({ item }: Props) => {
  const { updateQuantity, removeItem } = useCart()
  const { product, quantity } = item

  return (
    <div className="cart-item">
      <Link to={`/producto/${product.id}`} className="cart-item__image">
        <img src={product.images[0]} alt={product.name} />
      </Link>
      <div className="cart-item__details">
        <Link to={`/producto/${product.id}`} className="cart-item__title">
          {product.name}
        </Link>
        <p className="cart-item__price">{formatCurrency(product.price, product.currency)}</p>
        <div className="cart-item__controls">
          <label>
            Cantidad
            <input
              type="number"
              min={1}
              max={product.stock}
              value={quantity}
              onChange={(event) => updateQuantity(product.id, Number(event.target.value))}
            />
          </label>
          <button type="button" className="btn btn--ghost" onClick={() => removeItem(product.id)}>
            Quitar
          </button>
        </div>
      </div>
      <div className="cart-item__subtotal">
        {formatCurrency(product.price * quantity, product.currency)}
      </div>
    </div>
  )
}

export default CartItemRow
