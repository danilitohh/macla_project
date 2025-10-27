import { Link } from 'react-router-dom'
import { useCart } from '../hooks/useCart'
import { formatCurrency } from '../utils/format'

const CartSummary = () => {
  const { subtotal, totalItems } = useCart()

  return (
    <aside className="cart-summary">
      <h3>Resumen</h3>
      <div className="cart-summary__row">
        <span>Productos ({totalItems})</span>
        <strong>{formatCurrency(subtotal)}</strong>
      </div>
      <p className="muted">El costo de envío se calcula durante el checkout.</p>
      <Link to="/checkout" className="btn btn--primary" aria-disabled={totalItems === 0}>
        Continuar a pago
      </Link>
    </aside>
  )
}

export default CartSummary
