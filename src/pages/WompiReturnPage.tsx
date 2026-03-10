import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { verifyWompiTransaction } from '../services/paymentService'
import { clearWompiIntent, getWompiIntent } from '../utils/wompiSession'
import { formatCurrency } from '../utils/format'

type ViewStatus = 'idle' | 'verifying' | 'success' | 'pending' | 'error'

const WompiReturnPage = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search])
  const transactionId = (searchParams.get('id') || '').trim()
  const referenceFromUrl = (searchParams.get('reference') || '').trim()
  const orderFromUrl = (searchParams.get('order') || '').trim()
  const cachedIntent = useMemo(() => getWompiIntent(), [])
  const initialOrderCode = orderFromUrl || referenceFromUrl || cachedIntent?.orderCode || ''

  const [orderCode, setOrderCode] = useState(initialOrderCode)
  const [status, setStatus] = useState<ViewStatus>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const [wompiStatus, setWompiStatus] = useState<string | null>(null)
  const [lastChecked, setLastChecked] = useState<string | null>(null)

  const verifyPayment = async (code: string) => {
    const trimmedCode = code.trim()
    if (!transactionId) {
      setStatus('error')
      setMessage('No recibimos la referencia de Wompi. Revisa tu correo o contacta soporte.')
      return
    }
    if (!trimmedCode) {
      setStatus('error')
      setMessage('Ingresa el código de tu pedido para validar el pago.')
      return
    }

    setStatus('verifying')
    setMessage(null)

    try {
      const result = await verifyWompiTransaction({ transactionId, orderCode: trimmedCode })
      const txStatus =
        typeof result.transaction === 'object' && result.transaction && 'status' in result.transaction
          ? String((result.transaction as { status?: unknown }).status || '')
          : null
      setWompiStatus(txStatus)
      setLastChecked(new Date().toISOString())

      if (result.status === 'paid') {
        clearWompiIntent()
        setStatus('success')
        setMessage('Pago confirmado. Tu pedido quedó marcado como pagado.')
      } else if (result.status === 'pending') {
        setStatus('pending')
        setMessage('Wompi está validando el pago. Puedes reintentar en unos minutos.')
      } else {
        setStatus('error')
        setMessage('El pago fue rechazado o no se pudo confirmar. Intenta nuevamente o usa otro medio.')
      }
    } catch (error) {
      console.error('[wompi] verification error', error)
      const fallback = error instanceof Error ? error.message : 'No pudimos validar el pago en este momento.'
      setStatus('error')
      setMessage(fallback)
    }
  }

  useEffect(() => {
    if (!transactionId) {
      setStatus('error')
      setMessage('No recibimos la transacción de Wompi. Usa el botón de volver al checkout.')
      return
    }
    if (!initialOrderCode) {
      setStatus('error')
      setMessage('No pudimos asociar el pago a un pedido. Ingresa tu código para validarlo.')
      return
    }
    verifyPayment(initialOrderCode).catch((err) => console.error('[wompi] initial verification', err))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactionId, initialOrderCode])

  const headline =
    status === 'success'
      ? '¡Pago confirmado!'
      : status === 'pending'
        ? 'Pago en validación'
        : status === 'error'
          ? 'Necesitamos revisar tu pago'
          : 'Validando tu pago…'

  return (
    <div className="page">
      <section className="section section--intro">
        <div className="container">
          <h1>{headline}</h1>
          <p>
            Estamos sincronizando tu transacción con Wompi y tu pedido. Guarda tu código de pedido para cualquier
            soporte.
          </p>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <div className="card">
            <h2>Estado del pago</h2>
            <p className={status === 'error' ? 'form-error' : status === 'success' ? 'form-success' : 'muted'}>
              {message ||
                (status === 'verifying'
                  ? 'Consultando en Wompi…'
                  : 'Ingresa tu código de pedido si aún no se valida automáticamente.')}
            </p>

            <div className="payment-box">
              <div className="payment-box__grid">
                <div>
                  <span className="muted">Pedido</span>
                  <strong>{orderCode || initialOrderCode || 'Pendiente'}</strong>
                </div>
                <div>
                  <span className="muted">Transacción Wompi</span>
                  <strong>{transactionId || 'No recibida'}</strong>
                </div>
                {cachedIntent?.total !== undefined && (
                  <div>
                    <span className="muted">Monto</span>
                    <strong>{formatCurrency(cachedIntent.total)}</strong>
                  </div>
                )}
                {wompiStatus && (
                  <div>
                    <span className="muted">Estado en Wompi</span>
                    <strong>{wompiStatus}</strong>
                  </div>
                )}
                {lastChecked && (
                  <div>
                    <span className="muted">Última validación</span>
                    <strong>{new Date(lastChecked).toLocaleTimeString('es-CO')}</strong>
                  </div>
                )}
              </div>
            </div>

            <form
              className="form-grid"
              onSubmit={(event) => {
                event.preventDefault()
                verifyPayment(orderCode).catch((err) => console.error('[wompi] manual verification', err))
              }}
            >
              <label className="form-grid--full">
                Código de pedido
                <input
                  type="text"
                  value={orderCode}
                  onChange={(event) => setOrderCode(event.currentTarget.value)}
                  placeholder="MAC-XXXXXX"
                />
              </label>
              <div className="form-grid--full payment-actions">
                <button type="submit" className="btn btn--primary" disabled={status === 'verifying'}>
                  {status === 'verifying' ? 'Validando…' : 'Volver a validar con Wompi'}
                </button>
                <button type="button" className="btn btn--ghost" onClick={() => navigate('/checkout')}>
                  Volver al checkout
                </button>
                <Link to="/cuenta" className="btn btn--ghost">
                  Ver mis pedidos
                </Link>
              </div>
            </form>
          </div>
        </div>
      </section>
    </div>
  )
}

export default WompiReturnPage
