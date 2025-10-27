import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { CartItem } from '../types'
import { useCart } from '../hooks/useCart'
import { formatCurrency } from '../utils/format'
import { paymentMethods, shippingOptions } from '../data/config'
import { submitOrder } from '../services/orderService'
import type { OrderPayload, OrderCustomer } from '../types'
import { trackEvent } from '../utils/analytics'
import { useAuth } from '../hooks/useAuth'

const generateOrderCode = () => `MAC-${Math.random().toString(36).slice(2, 8).toUpperCase()}`

const CheckoutPage = () => {
  const { items, subtotal, clearCart } = useCart()
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [shippingId, setShippingId] = useState<string>('medellin')
  const [paymentId, setPaymentId] = useState<string>('contraentrega')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orderCode, setOrderCode] = useState<string | null>(null)
  const [orderItems, setOrderItems] = useState<CartItem[]>(items)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const shipping = useMemo(() => shippingOptions.find((option) => option.id === shippingId), [shippingId])
  const payment = useMemo(() => paymentMethods.find((method) => method.id === paymentId), [paymentId])

  const total = subtotal + (shipping?.price ?? 0)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (items.length === 0) {
      navigate('/productos')
      return
    }
    const formData = new FormData(event.currentTarget)
    const payload = Object.fromEntries(formData.entries())
    const customer: OrderCustomer = {
      name: String(payload.name ?? ''),
      email: String(payload.email ?? ''),
      phone: String(payload.phone ?? ''),
      city: String(payload.city ?? ''),
      address: String(payload.address ?? ''),
      notes: payload.notes ? String(payload.notes) : undefined
    }

    setIsSubmitting(true)
    setSubmitError(null)
    setOrderItems(items)

    const code = generateOrderCode()
    const orderData: OrderPayload = {
      code,
      customer,
      paymentMethod: payment,
      shippingOption: shipping,
      items,
      subtotal,
      shippingCost: shipping?.price ?? 0,
      total,
      submittedAt: new Date().toISOString()
    }

    try {
      await submitOrder(orderData)
      setOrderCode(code)
      clearCart()
      trackEvent('purchase', {
        transaction_id: code,
        value: total,
        currency: 'COP',
        shipping: shipping?.price ?? 0,
        items: items.map((item) => ({
          item_id: item.product.id,
          item_name: item.product.name,
          price: item.product.price,
          quantity: item.quantity
        }))
      })
    } catch (error) {
      console.error(error)
      setSubmitError('No pudimos registrar tu pedido. Intenta nuevamente o contáctanos por WhatsApp.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="page">
        <section className="section section--intro">
          <div className="container">
            <h1>Necesitas una cuenta para continuar</h1>
            <p>
              Inicia sesión o crea tu cuenta gratis para guardar tus datos de envío, mantener tu carrito y hacer
              seguimiento a tus pedidos.
            </p>
            <Link to="/cuenta" className="btn btn--primary">
              Ir a mi cuenta
            </Link>
          </div>
        </section>
      </div>
    )
  }

  if (items.length === 0 && !orderCode) {
    return (
      <div className="page">
        <section className="section">
          <div className="container">
            <h1>Aún no tienes productos en el carrito</h1>
            <button type="button" className="btn btn--primary" onClick={() => navigate('/productos')}>
              Ir al catálogo
            </button>
          </div>
        </section>
      </div>
    )
  }

  const summaryItems = orderCode ? orderItems : items
  const summarySubtotal = summaryItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0)
  const summaryTotal = summarySubtotal + (shipping?.price ?? 0)

  return (
    <div className="page">
      <section className="section section--intro">
        <div className="container">
          <h1>Checkout</h1>
          <p>
            Completa tus datos para coordinar el envío y elegir la forma de pago. Nuestro equipo te contactará para
            confirmar detalles y finalizar el pedido.
          </p>
        </div>
      </section>
      <section className="section">
        <div className="container checkout-grid">
          {orderCode ? (
            <div className="order-success">
              <h2>¡Gracias! Tu pedido está en proceso.</h2>
              <p>
                Nuestro equipo se comunicará contigo en las próximas horas para confirmar disponibilidad y pago.
                Anota tu código de seguimiento:
              </p>
              <div className="order-success__code">{orderCode}</div>
              <p className="muted">Método de pago elegido: {payment?.label}</p>
              <button type="button" className="btn btn--primary" onClick={() => navigate('/productos')}>
                Seguir explorando productos
              </button>
            </div>
          ) : (
            <form className="checkout-form" onSubmit={handleSubmit}>
              <h2>Datos de contacto y envío</h2>
              <div className="form-grid">
                <label>
                  Nombre completo
                  <input name="name" type="text" required placeholder="María Clara" />
                </label>
                <label>
                  Correo electrónico
                  <input name="email" type="email" required placeholder="tuemail@ejemplo.com" />
                </label>
                <label>
                  Teléfono de contacto
                  <input name="phone" type="tel" required placeholder="300 000 0000" />
                </label>
                <label>
                  Ciudad
                  <input name="city" type="text" required placeholder="Medellín" />
                </label>
                <label className="form-grid--full">
                  Dirección de entrega
                  <input name="address" type="text" required placeholder="Carrera 00 #00-00" />
                </label>
                <label className="form-grid--full">
                  Notas adicionales
                  <textarea name="notes" rows={3} placeholder="Horarios especiales, indicaciones, etc." />
                </label>
              </div>

              <h2>Envío</h2>
              <div className="option-list">
                {shippingOptions.map((option) => (
                  <label key={option.id} className={shippingId === option.id ? 'option is-selected' : 'option'}>
                    <input
                      type="radio"
                      name="shippingId"
                      value={option.id}
                      checked={shippingId === option.id}
                      onChange={() => setShippingId(option.id)}
                    />
                    <div>
                      <strong>{option.label}</strong>
                      <p>{option.description}</p>
                    </div>
                    <span>
                      {option.price > 0 ? formatCurrency(option.price) : 'A convenir'}
                    </span>
                  </label>
                ))}
              </div>

              <h2>Método de pago</h2>
              <div className="option-list">
                {paymentMethods.map((method) => (
                  <label key={method.id} className={paymentId === method.id ? 'option is-selected' : 'option'}>
                    <input
                      type="radio"
                      name="paymentId"
                      value={method.id}
                      checked={paymentId === method.id}
                      onChange={() => setPaymentId(method.id)}
                    />
                    <div>
                      <strong>{method.label}</strong>
                      <p>{method.description}</p>
                    </div>
                  </label>
                ))}
              </div>

              <div className="checkout-summary">
                <div>
                  <span>Subtotal</span>
                  <strong>{formatCurrency(subtotal)}</strong>
                </div>
                <div>
                  <span>Envío</span>
                  <strong>{shipping?.price ? formatCurrency(shipping.price) : 'A convenir'}</strong>
                </div>
                <div className="checkout-summary__total">
                  <span>Total estimado</span>
                  <strong>{formatCurrency(total)}</strong>
                </div>
                {submitError && <p className="form-error">{submitError}</p>}
                <button type="submit" className="btn btn--primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Generando pedido…' : 'Confirmar pedido'}
                </button>
              </div>
            </form>
          )}

          <aside className="checkout-sidebar">
            <h3>Resumen del carrito</h3>
            {summaryItems.length === 0 ? (
              <p className="muted">No hay productos para mostrar.</p>
            ) : (
              <>
                <ul className="checkout-items">
                  {summaryItems.map((item) => (
                    <li key={item.product.id}>
                      <div>
                        <strong>{item.product.name}</strong>
                        <p className="muted">
                          {item.quantity} x {formatCurrency(item.product.price)}
                        </p>
                      </div>
                      <span>{formatCurrency(item.product.price * item.quantity)}</span>
                    </li>
                  ))}
                </ul>
                <div className="checkout-sidebar__totals">
                  <div>
                    <span>Subtotal</span>
                    <strong>{formatCurrency(summarySubtotal)}</strong>
                  </div>
                  <div>
                    <span>Envío</span>
                    <strong>{shipping?.price ? formatCurrency(shipping.price) : 'A convenir'}</strong>
                  </div>
                  <div className="checkout-summary__total">
                    <span>Total estimado</span>
                    <strong>{formatCurrency(summaryTotal)}</strong>
                  </div>
                </div>
              </>
            )}
            <div className="checkout-sidebar__note">
              Recuerda que nuestras herramientas eléctricas son compatibles con el voltaje colombiano (110V) y las
              garantías cubren funcionamiento por 3 meses.
            </div>
          </aside>
        </div>
      </section>
    </div>
  )
}

export default CheckoutPage
