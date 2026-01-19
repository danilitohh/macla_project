import { useEffect, useMemo, useState } from 'react'
import type { FormEvent, ChangeEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../hooks/useCart'
import { formatCurrency } from '../utils/format'
import { paymentMethods, shippingOptions } from '../data/config'
import { submitOrder, validateDiscount } from '../services/orderService'
import { createAddress, getAddresses } from '../services/addressService'
import type { OrderPayload, OrderCustomer, OrderSummary, OrderItemSummary, Address } from '../types'
import { trackEvent } from '../utils/analytics'
import { useAuth } from '../hooks/useAuth'
import { getWompiConfig, verifyWompiTransaction } from '../services/paymentService'
import { loadScript } from '../utils/loadScript'

declare global {
  interface Window {
    WidgetCheckout?: any
  }
}

const CheckoutPage = () => {
  const { items, subtotal, clearCart } = useCart()
  const { user, isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()
  const [shippingId, setShippingId] = useState<string>('medellin')
  const [paymentId, setPaymentId] = useState<string>('contraentrega')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittedOrder, setSubmittedOrder] = useState<OrderSummary | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [addresses, setAddresses] = useState<Address[]>([])
  const [addressesLoading, setAddressesLoading] = useState(false)
  const [addressesError, setAddressesError] = useState<string | null>(null)
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null)
  const [formValues, setFormValues] = useState<OrderCustomer>({
    name: user?.name ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
    city: user?.city ?? '',
    address: user?.address ?? '',
    notes: ''
  })
  const [saveAddress, setSaveAddress] = useState(false)
  const [addressLabel, setAddressLabel] = useState('Casa')
  const [discountCode, setDiscountCode] = useState('')
  const [appliedDiscount, setAppliedDiscount] = useState<{
    code: string
    discount: number
    breakdown: { products: number; shipping: number }
  } | null>(null)
  const [discountMessage, setDiscountMessage] = useState<string | null>(null)
  const [discountError, setDiscountError] = useState<string | null>(null)
  const [validatingDiscount, setValidatingDiscount] = useState(false)
  const [wompiStatus, setWompiStatus] = useState<'idle' | 'ready' | 'processing' | 'paid' | 'error'>('idle')
  const [wompiError, setWompiError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    setFormValues((prev) => ({
      ...prev,
      name: user.name || prev.name,
      email: user.email || prev.email,
      phone: user.phone ?? prev.phone,
      city: user.city ?? prev.city,
      address: user.address ?? prev.address
    }))
  }, [user])

  useEffect(() => {
    let isMounted = true
    setAddressesLoading(true)
    setAddressesError(null)
    getAddresses()
      .then((list) => {
        if (!isMounted) return
        setAddresses(list)
      })
      .catch((err) => {
        console.error(err)
        if (isMounted) {
          setAddressesError('No pudimos cargar tus direcciones guardadas.')
        }
      })
      .finally(() => {
        if (isMounted) {
          setAddressesLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (addresses.length === 0 || selectedAddressId) {
      return
    }
    const preferred = addresses.find((addr) => addr.isDefaultShipping) || addresses[0]
    if (preferred) {
      setSelectedAddressId(preferred.id)
      setFormValues((prev) => ({
        ...prev,
        name: prev.name || preferred.contactName,
        phone: preferred.contactPhone,
        city: preferred.city,
        address: preferred.address
      }))
    }
  }, [addresses, selectedAddressId])

  const shipping = useMemo(() => shippingOptions.find((option) => option.id === shippingId), [shippingId])
  const payment = useMemo(() => paymentMethods.find((method) => method.id === paymentId), [paymentId])
  const shippingDiscount = appliedDiscount?.breakdown.shipping ?? 0
  const productDiscount = appliedDiscount?.breakdown.products ?? 0
  const shippingCost = Math.max(0, (shipping?.price ?? 0) - shippingDiscount)
  const total = Math.max(0, subtotal - productDiscount + shippingCost)
  const pendingSummaryItems: OrderItemSummary[] = useMemo(
    () =>
      items.map((item) => ({
        product: {
          id: item.product.id,
          name: item.product.name,
          price: item.product.price,
          currency: item.product.currency
        },
        quantity: item.quantity,
        unitPrice: item.product.price,
        lineTotal: item.product.price * item.quantity
      })),
    [items]
  )

  const handleInputChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.currentTarget
    setFormValues((prev) => ({ ...prev, [name]: value }))
  }

  const startWompiCheckout = async (order: OrderSummary) => {
    try {
      setWompiStatus('processing')
      setWompiError(null)
      const config = await getWompiConfig()
      if (!config.publicKey) {
        throw new Error(config.message || 'Wompi no está configurado en el servidor.')
      }
      await loadScript('https://checkout.wompi.co/widget.js')

      const amountInCents = Math.max(0, Math.round(order.total)) * 100
      const widget = new window.WidgetCheckout({
        currency: order.currency,
        amountInCents,
        reference: order.code,
        publicKey: config.publicKey,
        redirectUrl: config.redirectUrl,
        customerData: {
          email: formValues.email,
          fullName: formValues.name,
          phoneNumber: formValues.phone
        }
      })

      setWompiStatus('ready')
      widget.open((result: any) => {
        const transactionId = result?.transaction?.id
        if (transactionId) {
          setWompiStatus('processing')
          verifyWompiTransaction({ transactionId, orderCode: order.code })
            .then((res) => {
              setWompiStatus(res.status === 'paid' ? 'paid' : 'ready')
              if (res.status === 'paid') {
                setSubmittedOrder((prev) => (prev ? { ...prev, status: 'paid' } : prev))
              }
            })
            .catch((err) => {
              console.error('[Wompi] No se pudo confirmar el pago', err)
              setWompiStatus('error')
              setWompiError('No pudimos confirmar el pago. Verifica en tu banco o intenta nuevamente.')
            })
        }
      })
    } catch (error) {
      console.error('[Wompi] Error iniciando checkout', error)
      setWompiStatus('error')
      setWompiError('No pudimos abrir el checkout de Wompi. Intenta nuevamente.')
    }
  }

  const handleAddressSelect = (address: Address) => {
    setSelectedAddressId(address.id)
    setFormValues((prev) => ({
      ...prev,
      name: prev.name || address.contactName,
      phone: address.contactPhone,
      city: address.city,
      address: address.address,
      notes: prev.notes
    }))
  }

  const handleApplyDiscount = async (providedCode?: string) => {
    const codeToApply = (providedCode ?? discountCode).trim()
    if (!codeToApply) {
      setDiscountError('Ingresa un código para aplicarlo.')
      setDiscountMessage(null)
      return
    }
    setValidatingDiscount(true)
    setDiscountError(null)
    try {
      const result = await validateDiscount({
        code: codeToApply,
        subtotalCents: subtotal,
        shippingCents: shipping?.price ?? 0
      })
      setAppliedDiscount({
        code: result.code,
        discount: result.discount,
        breakdown: result.breakdown
      })
      setDiscountMessage(`Código aplicado: ${result.code}`)
    } catch (err) {
      console.error(err)
      setAppliedDiscount(null)
      if (err instanceof Error) {
        setDiscountError(err.message)
      } else {
        setDiscountError('No pudimos validar este código.')
      }
    } finally {
      setValidatingDiscount(false)
    }
  }

  useEffect(() => {
    if (!appliedDiscount?.code) {
      return
    }
    handleApplyDiscount(appliedDiscount.code).catch((err) => console.error('[discount] revalidate', err))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shippingId, subtotal])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (items.length === 0) {
      navigate('/productos')
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    const trimmedCustomer: OrderCustomer = {
      name: formValues.name.trim(),
      email: formValues.email.trim(),
      phone: formValues.phone.trim(),
      city: formValues.city.trim(),
      address: formValues.address.trim(),
      notes: formValues.notes?.trim() || undefined
    }

    const orderData: OrderPayload = {
      customer: trimmedCustomer,
      paymentMethodId: payment?.id ?? null,
      shippingOptionId: shipping?.id ?? null,
      addressId: selectedAddressId,
      discountCode: appliedDiscount?.code || (discountCode ? discountCode.trim() : null),
      items
    }

    try {
      const order = await submitOrder(orderData)
      setSubmittedOrder(order)
      clearCart()
      if (payment?.id === 'pasarela') {
        startWompiCheckout(order)
      }
      if (saveAddress) {
        createAddress({
          label: addressLabel || 'Mi dirección',
          contactName: trimmedCustomer.name,
          contactPhone: trimmedCustomer.phone,
          city: trimmedCustomer.city,
          address: trimmedCustomer.address,
          notes: trimmedCustomer.notes
        }).then((newAddress) => setAddresses((prev) => [newAddress, ...prev]))
      }
      trackEvent('purchase', {
        transaction_id: order.code,
        value: order.total,
        currency: order.currency,
        shipping: order.shippingCost,
        items: order.items.map((item) => ({
          item_id: item.product.id,
          item_name: item.product.name,
          price: item.unitPrice,
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

  if (isLoading) {
    return (
      <div className="page">
        <section className="section section--intro">
          <div className="container">
            <h1>Validando tu sesión…</h1>
            <p>Estamos confirmando tu cuenta para continuar con el checkout.</p>
          </div>
        </section>
      </div>
    )
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

  if (items.length === 0 && !submittedOrder) {
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

  const summaryItems = submittedOrder ? submittedOrder.items : pendingSummaryItems
  const summarySubtotal = submittedOrder ? submittedOrder.subtotal : subtotal
  const summaryShipping = submittedOrder ? submittedOrder.shippingCost : shippingCost
  const summaryDiscount = submittedOrder ? submittedOrder.discount ?? 0 : appliedDiscount?.discount ?? 0
  const summaryTotal = submittedOrder ? submittedOrder.total : Math.max(0, summarySubtotal - summaryDiscount + summaryShipping)

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
          {submittedOrder ? (
            <div className="order-success">
              <h2>¡Gracias! Tu pedido está en proceso.</h2>
              <p>
                Nuestro equipo se comunicará contigo en las próximas horas para confirmar disponibilidad y pago.
                Anota tu código de seguimiento:
              </p>
              <div className="order-success__code">{submittedOrder.code}</div>
              <p className="muted">
                Método de pago elegido:{' '}
                {submittedOrder.paymentMethod?.label ?? 'A convenir con nuestro equipo comercial.'}
              </p>
              <p className="muted">
                Modalidad de envío:{' '}
                {submittedOrder.shippingOption?.label ?? 'Definiremos los detalles de entrega contigo.'}
              </p>
              {submittedOrder.paymentMethod?.id === 'pasarela' && (
                <div className="payment-box">
                  <p>
                    Completa tu pago con Wompi para marcar el pedido como pagado. Si ya pagaste, intentaremos verificar
                    automáticamente.
                  </p>
                  {wompiStatus !== 'paid' && (
                    <button
                      type="button"
                      className="btn btn--primary"
                      onClick={() => startWompiCheckout(submittedOrder)}
                      disabled={wompiStatus === 'processing'}
                    >
                      {wompiStatus === 'processing' ? 'Abriendo Wompi…' : 'Pagar con Wompi'}
                    </button>
                  )}
                  {wompiStatus === 'paid' && <p className="muted">Pago confirmado. ¡Gracias!</p>}
                  {wompiError && <p className="error">{wompiError}</p>}
                </div>
              )}
              {submittedOrder.discount > 0 && (
                <p className="muted">
                  Descuento aplicado: -{formatCurrency(submittedOrder.discount)}
                  {submittedOrder.discountCode ? ` (${submittedOrder.discountCode})` : ''}
                </p>
              )}
              <button type="button" className="btn btn--primary" onClick={() => navigate('/productos')}>
                Seguir explorando productos
              </button>
            </div>
          ) : (
            <form className="checkout-form" onSubmit={handleSubmit}>
              <h2>Datos de contacto y envío</h2>
              {addressesLoading ? (
                <p className="muted">Cargando tus direcciones guardadas…</p>
              ) : addressesError ? (
                <p className="form-error">{addressesError}</p>
              ) : addresses.length > 0 ? (
                <div className="option-list">
                  {addresses.map((address) => (
                    <label
                      key={address.id}
                      className={selectedAddressId === address.id ? 'option is-selected' : 'option'}
                    >
                      <input
                        type="radio"
                        name="savedAddress"
                        value={address.id}
                        checked={selectedAddressId === address.id}
                        onChange={() => handleAddressSelect(address)}
                      />
                      <div>
                        <strong>{address.label}</strong>
                        <p className="muted">
                          {address.city} · {address.address}
                        </p>
                        <p className="muted">
                          Contacto: {address.contactName} · {address.contactPhone}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="muted">Aún no tienes direcciones guardadas.</p>
              )}
              <div className="form-grid">
                <label>
                  Nombre completo
                  <input
                    name="name"
                    type="text"
                    required
                    placeholder="María Clara"
                    value={formValues.name}
                    onChange={handleInputChange}
                  />
                </label>
                <label>
                  Correo electrónico
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="tuemail@ejemplo.com"
                    value={formValues.email}
                    onChange={handleInputChange}
                  />
                </label>
                <label>
                  Teléfono de contacto
                  <input
                    name="phone"
                    type="tel"
                    required
                    placeholder="300 000 0000"
                    value={formValues.phone}
                    onChange={handleInputChange}
                  />
                </label>
                <label>
                  Ciudad
                  <input
                    name="city"
                    type="text"
                    required
                    placeholder="Medellín"
                    value={formValues.city}
                    onChange={handleInputChange}
                  />
                </label>
                <label className="form-grid--full">
                  Dirección de entrega
                  <input
                    name="address"
                    type="text"
                    required
                    placeholder="Carrera 00 #00-00"
                    value={formValues.address}
                    onChange={handleInputChange}
                  />
                </label>
                <label className="form-grid--full">
                  Notas adicionales
                  <textarea
                    name="notes"
                    rows={3}
                    placeholder="Horarios especiales, indicaciones, etc."
                    value={formValues.notes}
                    onChange={handleInputChange}
                  />
                </label>
                <label className="checkbox form-grid--full">
                  <input
                    type="checkbox"
                    checked={saveAddress}
                    onChange={(event) => setSaveAddress(event.currentTarget.checked)}
                  />
                  <span>Guardar esta información como una dirección frecuente.</span>
                </label>
                {saveAddress && (
                  <label className="form-grid--full">
                    Nombre de la dirección
                    <input
                      type="text"
                      value={addressLabel}
                      onChange={(event) => setAddressLabel(event.currentTarget.value)}
                      placeholder="Casa, Oficina, Bodega…"
                    />
                  </label>
                )}
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

              <h2>Descuentos</h2>
              <div className="checkout-coupon">
                <label htmlFor="discountCode">¿Tienes un código de descuento?</label>
                <div className="checkout-coupon__controls">
                  <input
                    id="discountCode"
                    type="text"
                    value={discountCode}
                    onChange={(event) => setDiscountCode(event.currentTarget.value)}
                    placeholder="MACLA10, ENVIOFREE…"
                  />
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => handleApplyDiscount()}
                    disabled={validatingDiscount}
                  >
                    {validatingDiscount ? 'Validando…' : 'Aplicar'}
                  </button>
                </div>
                {discountMessage && <p className="form-success">{discountMessage}</p>}
                {discountError && <p className="form-error">{discountError}</p>}
              </div>

              <div className="checkout-summary">
                <div>
                  <span>Subtotal</span>
                  <strong>{formatCurrency(subtotal)}</strong>
                </div>
                <div>
                  <span>Envío</span>
                  <strong>{shippingCost ? formatCurrency(shippingCost) : 'A convenir'}</strong>
                </div>
                {summaryDiscount > 0 && (
                  <div>
                    <span>Descuento</span>
                    <strong>-{formatCurrency(summaryDiscount)}</strong>
                  </div>
                )}
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
                          {item.quantity} x {formatCurrency(item.unitPrice)}
                        </p>
                      </div>
                      <span>{formatCurrency(item.lineTotal)}</span>
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
                    <strong>
                      {summaryShipping ? formatCurrency(summaryShipping) : 'A convenir con nuestro equipo'}
                    </strong>
                  </div>
                  {summaryDiscount > 0 && (
                    <div>
                      <span>Descuento</span>
                      <strong>-{formatCurrency(summaryDiscount)}</strong>
                    </div>
                  )}
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
