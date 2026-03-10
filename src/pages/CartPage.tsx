import { Link } from 'react-router-dom'
import { useCart } from '../hooks/useCart'
import CartItemRow from '../components/CartItemRow'
import CartSummary from '../components/CartSummary'
import { useAuth } from '../hooks/useAuth'

const CartPage = () => {
  const { items, clearCart } = useCart()
  const { isAuthenticated } = useAuth()

  return (
    <div className="page">
      <section className="section section--intro">
        <div className="container">
          <h1>Tu carrito</h1>
          <p>Revisa los productos seleccionados antes de continuar al pago.</p>
          {!isAuthenticated && (
            <p className="notice notice--info">
              Inicia sesión o regístrate para que podamos guardar este carrito y reconocer tus pedidos.
            </p>
          )}
        </div>
      </section>
      <section className="section">
        <div className="container cart-layout">
          <div className="cart-items">
            {items.length === 0 ? (
              <div className="empty-state">
                <p>Tu carrito está vacío por ahora.</p>
                <Link to="/productos" className="btn btn--primary">
                  Explorar catálogo
                </Link>
              </div>
            ) : (
              <>
                <div className="cart-items__header">
                  <span>Producto</span>
                  <span>Subtotal</span>
                </div>
                {items.map((item) => (
                  <CartItemRow key={item.product.id} item={item} />
                ))}
                <button type="button" className="btn btn--ghost" onClick={clearCart}>
                  Vaciar carrito
                </button>
              </>
            )}
          </div>
          <CartSummary />
        </div>
      </section>
    </div>
  )
}

export default CartPage
