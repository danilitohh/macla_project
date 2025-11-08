import { useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getUserOrders } from '../services/orderService'
import type { OrderSummary, OrderStatus } from '../types'
import { formatCurrency } from '../utils/format'

type FormMode = 'login' | 'register' | 'recover' | 'activate'

interface ActivationState {
  email: string
  channel: 'email' | 'sms'
}

interface RecoveryState {
  email?: string
  phone?: string
  channel: 'email' | 'sms'
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pendiente',
  paid: 'Pagado',
  shipped: 'Enviado',
  cancelled: 'Cancelado'
}

const formatOrderDate = (isoDate: string | null) => {
  if (!isoDate) {
    return 'Fecha por confirmar'
  }
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) {
    return 'Fecha por confirmar'
  }
  return date.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const AccountPage = () => {
  const {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    activate,
    resendActivation,
    requestPasswordReset,
    resetPassword,
    updateProfile,
    logout,
    error,
    clearError
  } = useAuth()
  const [mode, setMode] = useState<FormMode>('login')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activationSubmitting, setActivationSubmitting] = useState(false)
  const [recoverySubmitting, setRecoverySubmitting] = useState(false)
  const [resetSubmitting, setResetSubmitting] = useState(false)
  const [profileSubmitting, setProfileSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [orders, setOrders] = useState<OrderSummary[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [ordersError, setOrdersError] = useState<string | null>(null)
  const [pendingActivation, setPendingActivation] = useState<ActivationState | null>(null)
  const [pendingRecovery, setPendingRecovery] = useState<RecoveryState | null>(null)
  const [recoveryStep, setRecoveryStep] = useState<'request' | 'confirm'>('request')
  const [profileMessage, setProfileMessage] = useState<string | null>(null)
  const [profileValues, setProfileValues] = useState({
    name: user?.name ?? '',
    phone: user?.phone ?? '',
    city: user?.city ?? '',
    address: user?.address ?? ''
  })
  const location = useLocation()
  const navigate = useNavigate()
  const redirectPath = (location.state as { from?: string } | null)?.from ?? null
  const tabMode: FormMode = mode === 'activate' ? 'login' : mode
  const headingTitleMap: Record<FormMode, string> = {
    login: 'Inicia sesión',
    register: 'Crea tu cuenta',
    recover: 'Recupera tu acceso',
    activate: 'Activa tu cuenta'
  }
  const headingTitle = headingTitleMap[mode] ?? headingTitleMap.login
  const showActivationPanel = mode === 'activate' || Boolean(pendingActivation)

  useEffect(() => {
    if (user) {
      setProfileValues({
        name: user.name,
        phone: user.phone ?? '',
        city: user.city ?? '',
        address: user.address ?? ''
      })
    }
  }, [user])

  const handleRedirectAfterAuth = () => {
    if (redirectPath) {
      navigate(redirectPath, { replace: true })
      return true
    }
    return false
  }

  const handleModeChange = (nextMode: FormMode) => {
    setMode(nextMode)
    setSuccessMessage(null)
    setFormError(null)
    setProfileMessage(null)
    if (nextMode !== 'recover') {
      setRecoveryStep('request')
      setPendingRecovery(null)
    }
    clearError()
  }

  useEffect(() => {
    let ignore = false

    if (!isAuthenticated) {
      setOrders([])
      setOrdersError(null)
      setOrdersLoading(false)
      return () => {
        ignore = true
      }
    }

    setOrdersLoading(true)
    setOrdersError(null)

    getUserOrders()
      .then((orderList) => {
        if (!ignore) {
          setOrders(orderList)
        }
      })
      .catch((err) => {
        console.error('[AccountPage] Error cargando pedidos', err)
        if (!ignore) {
          setOrdersError('No pudimos cargar tus pedidos. Intenta nuevamente más tarde.')
        }
      })
      .finally(() => {
        if (!ignore) {
          setOrdersLoading(false)
        }
      })

    return () => {
      ignore = true
    }
  }, [isAuthenticated, user?.id])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formElement = event.currentTarget
    setSuccessMessage(null)
    setFormError(null)
    const formData = new FormData(formElement)
    const email = String(formData.get('email') ?? '').trim()
    const password = String(formData.get('password') ?? '')
    const serverError = () => setFormError('No pudimos procesar tu solicitud. Revisa los datos e inténtalo de nuevo.')

    if (!email || !password) {
      setFormError('Debes ingresar correo y contraseña válidos.')
      return
    }
    setIsSubmitting(true)

    try {
      if (mode === 'login') {
        await login({ email, password })
        if (!handleRedirectAfterAuth()) {
          setSuccessMessage('¡Bienvenido de nuevo! Tu carrito y datos están sincronizados.')
        }
        formElement.reset()
      } else if (mode === 'register') {
        const name = String(formData.get('name') ?? '').trim()
        const phone = String(formData.get('phone') ?? '').trim()
        const city = String(formData.get('city') ?? '').trim()
        const address = String(formData.get('address') ?? '').trim()
        const channel = (String(formData.get('channel') ?? 'email').toLowerCase() === 'sms' ? 'sms' : 'email') as
          | 'email'
          | 'sms'
        const accepted = formData.get('acceptPolicies') === 'on'
        if (!name) {
          setFormError('Debes ingresar tu nombre completo.')
          setIsSubmitting(false)
          return
        }
        if (!accepted) {
          setFormError('Debes aceptar las políticas de privacidad y los términos para continuar.')
          setIsSubmitting(false)
          return
        }
        const registration = await register({ name, email, password, phone, city, address, channel })
        formElement.reset()
        setPendingActivation({
          email: registration.email,
          channel: registration.channel
        })
        setMode('activate')
        if (!handleRedirectAfterAuth()) {
          setSuccessMessage('Te enviamos un código de activación. Revisa tu correo o SMS.')
        }
      }
    } catch (err) {
      console.error(err)
      const data = (err as { data?: Record<string, unknown> | null })?.data
      if (mode === 'login' && (data as { requiresActivation?: boolean })?.requiresActivation) {
        setPendingActivation((prev) =>
          prev ?? {
            email,
            channel: 'email'
          }
        )
        setMode('activate')
        setFormError('Necesitas activar tu cuenta antes de continuar.')
      } else if (err instanceof Error) {
        setFormError(err.message)
      } else {
        serverError()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleActivationSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const email = String(formData.get('email') ?? pendingActivation?.email ?? '').trim()
    const code = String(formData.get('code') ?? '').trim()
    const token = String(formData.get('token') ?? '').trim()

    if (!email || (!code && !token)) {
      setFormError('Ingresa el correo y el código recibido (o pega el token de activación).')
      return
    }

    setActivationSubmitting(true)
    setFormError(null)
    try {
      const result = await activate({
        email,
        code: code || undefined,
        token: token || undefined
      })
      if (result.user) {
        setPendingActivation(null)
        setMode('login')
        if (!handleRedirectAfterAuth()) {
          setSuccessMessage('Tu cuenta fue activada. Ya puedes continuar.')
        }
      } else if (result.alreadyActive) {
        setMode('login')
        setSuccessMessage('Tu cuenta ya estaba activa. Inicia sesión para continuar.')
      }
    } catch (err) {
      console.error(err)
      if (err instanceof Error) {
        setFormError(err.message)
      } else {
        setFormError('No pudimos activar tu cuenta con los datos ingresados.')
      }
    } finally {
      setActivationSubmitting(false)
    }
  }

  const handleResendActivation = async () => {
    if (!pendingActivation?.email) {
      setFormError('Ingresa primero el correo con el que te registraste.')
      return
    }
    setActivationSubmitting(true)
    setFormError(null)
    try {
      const response = await resendActivation(pendingActivation.email)
      setPendingActivation({
        email: pendingActivation.email,
        channel: response.channel === 'sms' ? 'sms' : 'email'
      })
      setSuccessMessage(response.message)
    } catch (err) {
      console.error(err)
      if (err instanceof Error) {
        setFormError(err.message)
      } else {
        setFormError('No pudimos reenviar el código en este momento.')
      }
    } finally {
      setActivationSubmitting(false)
    }
  }

  const handleRecoveryRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const email = String(formData.get('recoveryEmail') ?? '').trim()
    const phone = String(formData.get('recoveryPhone') ?? '').trim()
    const channel = (String(formData.get('recoveryChannel') ?? 'email').toLowerCase() === 'sms' ? 'sms' : 'email') as
      | 'email'
      | 'sms'

    if (!email && !phone) {
      setFormError('Ingresa el correo o teléfono asociado a tu cuenta.')
      return
    }

    setRecoverySubmitting(true)
    setFormError(null)
    try {
      const response = await requestPasswordReset({
        email: email || undefined,
        phone: phone || undefined,
        channel
      })
      setPendingRecovery({
        email: email || undefined,
        phone: phone || undefined,
        channel: response.channel === 'sms' ? 'sms' : 'email'
      })
      setRecoveryStep('confirm')
      setSuccessMessage(response.message)
    } catch (err) {
      console.error(err)
      if (err instanceof Error) {
        setFormError(err.message)
      } else {
        setFormError('No pudimos iniciar la recuperación. Intenta nuevamente.')
      }
    } finally {
      setRecoverySubmitting(false)
    }
  }

  const handlePasswordReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const email = String(formData.get('email') ?? pendingRecovery?.email ?? '').trim()
    const code = String(formData.get('code') ?? '').trim()
    const token = String(formData.get('token') ?? '').trim()
    const password = String(formData.get('newPassword') ?? '')

    if (!email || password.length < 6) {
      setFormError('Ingresa el correo y una nueva contraseña de al menos 6 caracteres.')
      return
    }
    if (!code && !token) {
      setFormError('Debes ingresar el código o token enviado a tu correo/teléfono.')
      return
    }

    setResetSubmitting(true)
    setFormError(null)
    try {
      await resetPassword({
        email,
        password,
        code: code || undefined,
        token: token || undefined
      })
      setPendingRecovery(null)
      setRecoveryStep('request')
      if (!handleRedirectAfterAuth()) {
        setSuccessMessage('Tu contraseña fue actualizada. Ya puedes continuar.')
      }
      setMode('login')
    } catch (err) {
      console.error(err)
      if (err instanceof Error) {
        setFormError(err.message)
      } else {
        setFormError('No pudimos restablecer tu contraseña con los datos ingresados.')
      }
    } finally {
      setResetSubmitting(false)
    }
  }

  const handleProfileInputChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.currentTarget
    setProfileValues((prev) => ({ ...prev, [name]: value }))
  }

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!profileValues.name.trim()) {
      setFormError('Debes ingresar tu nombre para guardar los cambios.')
      return
    }
    setProfileSubmitting(true)
    setProfileMessage(null)
    setFormError(null)
    try {
      const updated = await updateProfile({
        name: profileValues.name.trim(),
        phone: profileValues.phone?.trim() || undefined,
        city: profileValues.city?.trim() || undefined,
        address: profileValues.address?.trim() || undefined
      })
      setProfileValues({
        name: updated.name,
        phone: updated.phone ?? '',
        city: updated.city ?? '',
        address: updated.address ?? ''
      })
      setProfileMessage('Guardamos tus datos correctamente.')
    } catch (err) {
      console.error(err)
      if (err instanceof Error) {
        setFormError(err.message)
      } else {
        setFormError('No pudimos guardar los cambios. Intenta nuevamente.')
      }
    } finally {
      setProfileSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="page">
        <section className="section section--intro">
          <div className="container">
            <h1>Validando tu sesión…</h1>
            <p>Estamos recuperando tus datos guardados.</p>
          </div>
        </section>
      </div>
    )
  }

  if (isAuthenticated && user) {
    return (
      <div className="page">
        <section className="section section--intro">
          <div className="container">
            <h1>Tu cuenta</h1>
            <p>Administra tus datos y consulta tu carrito personal.</p>
          </div>
        </section>
        <section className="section">
          <div className="container account-card">
            <div className="account-card__summary">
              <h2>Hola, {user.name || user.email}</h2>
              <p className="muted">
                Tu información queda guardada para que podamos hacer seguimiento a tus pedidos y mantener tu carrito
                sincronizado en todos tus dispositivos.
              </p>
              <dl className="account-card__info">
                <div>
                  <dt>Nombre</dt>
                  <dd>{user.name || 'Sin registrar'}</dd>
                </div>
                <div>
                  <dt>Correo electrónico</dt>
                  <dd>{user.email}</dd>
                </div>
              </dl>
              <div className="account-card__actions">
                <Link to="/carrito" className="btn btn--primary">
                  Ver mi carrito
                </Link>
                <button type="button" className="btn btn--ghost" onClick={logout}>
                  Cerrar sesión
                </button>
              </div>
            </div>
            <aside className="account-card__help">
              <h3>¿Qué puedes hacer desde aquí?</h3>
              <ul>
                <li>Revisar tu carrito guardado automáticamente.</li>
                <li>Seguir tus pedidos sin perder información.</li>
                <li>Acceder a promociones exclusivas para clientes registrados.</li>
              </ul>
            </aside>
          </div>
        </section>
        <section className="section">
          <div className="container account-form">
            <div className="account-form__panel">
              <h2>Actualiza tu información</h2>
              <form onSubmit={handleProfileSubmit} className="account-form__panel">
                <label>
                  Nombre completo
                  <input
                    type="text"
                    name="name"
                    value={profileValues.name}
                    onChange={handleProfileInputChange}
                    required
                  />
                </label>
                <label>
                  Teléfono
                  <input
                    type="tel"
                    name="phone"
                    value={profileValues.phone}
                    onChange={handleProfileInputChange}
                    placeholder="300 000 0000"
                  />
                </label>
                <label>
                  Ciudad
                  <input
                    type="text"
                    name="city"
                    value={profileValues.city}
                    onChange={handleProfileInputChange}
                    placeholder="Medellín"
                  />
                </label>
                <label className="form-grid--full">
                  Dirección
                  <textarea
                    name="address"
                    rows={2}
                    value={profileValues.address}
                    onChange={handleProfileInputChange}
                    placeholder="Carrera 00 #00-00"
                  />
                </label>
                {profileMessage && <p className="form-success">{profileMessage}</p>}
                {formError && <p className="form-error">{formError}</p>}
                <button type="submit" className="btn btn--primary" disabled={profileSubmitting}>
                  {profileSubmitting ? 'Guardando…' : 'Guardar cambios'}
                </button>
              </form>
            </div>
          </div>
        </section>
        <section className="section section--light">
          <div className="container account-orders">
            <div className="section__header">
              <h2>Historial de compras</h2>
            </div>
            {ordersLoading ? (
              <p className="muted">Cargando tus pedidos…</p>
            ) : ordersError ? (
              <p className="form-error">{ordersError}</p>
            ) : orders.length === 0 ? (
              <p className="muted">
                Aún no has realizado compras. Tu historial aparecerá aquí una vez completes tu primer pedido.
              </p>
            ) : (
              <ul className="orders-list">
                {orders.map((order) => (
                  <li key={order.id} className="order-card">
                    <div className="order-card__header">
                      <div>
                        <h3>Pedido {order.code}</h3>
                        <p className="muted">{formatOrderDate(order.submittedAt)}</p>
                      </div>
                      <span className={`order-status order-status--${order.status}`}>
                        {STATUS_LABELS[order.status]}
                      </span>
                    </div>
                    <div className="order-card__body">
                      <dl className="order-card__meta">
                        <div>
                          <dt>Total</dt>
                          <dd>{formatCurrency(order.total)}</dd>
                        </div>
                        <div>
                          <dt>Envío</dt>
                          <dd>
                            {order.shippingOption?.label ?? 'Por definir'}
                            {order.shippingCost > 0 ? ` · ${formatCurrency(order.shippingCost)}` : ''}
                          </dd>
                        </div>
                        <div>
                          <dt>Pago</dt>
                          <dd>{order.paymentMethod?.label ?? 'Por confirmar'}</dd>
                        </div>
                      </dl>
                      <ul className="order-card__items">
                        {order.items.map((item) => (
                          <li key={`${order.id}-${item.product.id}`}>
                            <span>
                              {item.quantity} x {item.product.name}
                            </span>
                            <span>{formatCurrency(item.lineTotal)}</span>
                          </li>
                        ))}
                      </ul>
                      {order.notes && <p className="order-card__notes">Notas: {order.notes}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="page">
      <section className="section section--intro">
        <div className="container">
          <h1>{headingTitle}</h1>
          <p>
            Guarda tus datos, personaliza tu carrito y haz seguimiento a tus pedidos en MACLA Distribuciones. Solo toma
            un minuto.
          </p>
          {redirectPath && (
            <p className="notice notice--info">
              Inicia sesión para regresar a tu flujo anterior. Te llevaremos de vuelta automáticamente a{' '}
              {redirectPath === '/checkout' ? 'tu checkout' : 'la última página que visitaste'} al completar este paso.
            </p>
          )}
        </div>
      </section>
      <section className="section">
        <div className="container account-form">
          <div className="account-form__toggle">
            <button
              type="button"
              className={tabMode === 'login' ? 'btn btn--primary' : 'btn btn--ghost'}
              onClick={() => handleModeChange('login')}
              disabled={tabMode === 'login'}
            >
              Ya tengo cuenta
            </button>
            <button
              type="button"
              className={tabMode === 'register' ? 'btn btn--primary' : 'btn btn--ghost'}
              onClick={() => handleModeChange('register')}
              disabled={tabMode === 'register'}
            >
              Quiero registrarme
            </button>
            <button
              type="button"
              className={tabMode === 'recover' ? 'btn btn--primary' : 'btn btn--ghost'}
              onClick={() => handleModeChange('recover')}
              disabled={tabMode === 'recover'}
            >
              Recuperar acceso
            </button>
          </div>

          {tabMode !== 'recover' ? (
            <form className="account-form__panel" onSubmit={handleSubmit} noValidate>
              {tabMode === 'register' && (
                <>
                  <label>
                    Nombre completo
                    <input type="text" name="name" placeholder="María Clara" required />
                  </label>
                  <label>
                    Teléfono
                    <input type="tel" name="phone" placeholder="300 000 0000" />
                  </label>
                  <label>
                    Ciudad
                    <input type="text" name="city" placeholder="Medellín" />
                  </label>
                  <label className="form-grid--full">
                    Dirección
                    <textarea name="address" rows={2} placeholder="Carrera 00 #00-00" />
                  </label>
                </>
              )}
              <label>
                Correo electrónico
                <input type="email" name="email" placeholder="tuemail@ejemplo.com" required />
              </label>
              <label>
                Contraseña
                <input type="password" name="password" placeholder="Mínimo 6 caracteres" minLength={6} required />
              </label>
              {tabMode === 'register' && (
                <label>
                  ¿Cómo prefieres recibir el código?
                  <select name="channel" defaultValue="email">
                    <option value="email">Correo electrónico</option>
                    <option value="sms">SMS / WhatsApp</option>
                  </select>
                </label>
              )}
              {tabMode === 'register' && (
                <label className="checkbox">
                  <input type="checkbox" name="acceptPolicies" required />
                  <span>
                    Acepto las{' '}
                    <Link to="/politicas">
                      políticas de privacidad
                    </Link>{' '}
                    y los{' '}
                    <Link to="/terminos">
                      términos y condiciones
                    </Link>
                    .
                  </span>
                </label>
              )}
              {tabMode === 'login' && (
                <p className="muted">
                  ¿Olvidaste tu contraseña?{' '}
                  <button type="button" className="link-button" onClick={() => handleModeChange('recover')}>
                    Recupera tu acceso aquí
                  </button>
                  .
                </p>
              )}
              {formError && <p className="form-error">{formError}</p>}
              {error && <p className="form-error">{error}</p>}
              {successMessage && <p className="form-success">{successMessage}</p>}
              <button type="submit" className="btn btn--primary" disabled={isSubmitting}>
                {isSubmitting ? 'Procesando…' : tabMode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
              </button>
            </form>
          ) : (
            <form className="account-form__panel" onSubmit={handleRecoveryRequest} noValidate>
              <label>
                Correo electrónico
                <input type="email" name="recoveryEmail" placeholder="tuemail@ejemplo.com" />
              </label>
              <label>
                Teléfono
                <input type="tel" name="recoveryPhone" placeholder="300 000 0000" />
              </label>
              <label>
                ¿Cómo quieres recibir el código?
                <select name="recoveryChannel" defaultValue="email">
                  <option value="email">Correo electrónico</option>
                  <option value="sms">SMS / WhatsApp</option>
                </select>
              </label>
              {formError && <p className="form-error">{formError}</p>}
              {error && <p className="form-error">{error}</p>}
              {successMessage && <p className="form-success">{successMessage}</p>}
              <button type="submit" className="btn btn--primary" disabled={recoverySubmitting}>
                {recoverySubmitting ? 'Enviando…' : 'Enviar código de recuperación'}
              </button>
            </form>
          )}

          {tabMode === 'recover' && recoveryStep === 'confirm' && (
            <form className="account-form__panel" onSubmit={handlePasswordReset} noValidate>
              <h3>Ingresa tu código de recuperación</h3>
              <label>
                Correo electrónico
                <input
                  type="email"
                  name="email"
                  defaultValue={pendingRecovery?.email}
                  placeholder="tuemail@ejemplo.com"
                  required
                />
              </label>
              <label>
                Código recibido
                <input type="text" name="code" placeholder="123456" />
              </label>
              <label>
                Token de recuperación (opcional)
                <input type="text" name="token" placeholder="Pega el enlace recibido si lo tienes" />
              </label>
              <label>
                Nueva contraseña
                <input type="password" name="newPassword" placeholder="Mínimo 6 caracteres" minLength={6} required />
              </label>
              <div className="account-form__actions">
                <button type="button" className="btn btn--ghost" onClick={() => setRecoveryStep('request')}>
                  Solicitar un nuevo código
                </button>
                <button type="submit" className="btn btn--primary" disabled={resetSubmitting}>
                  {resetSubmitting ? 'Actualizando…' : 'Guardar nueva contraseña'}
                </button>
              </div>
            </form>
          )}

          {showActivationPanel && (
            <div className="account-form__panel">
              <h3>Activa tu cuenta</h3>
              <form onSubmit={handleActivationSubmit} noValidate>
                <label>
                  Correo electrónico
                  <input
                    type="email"
                    name="email"
                    defaultValue={pendingActivation?.email}
                    placeholder="tuemail@ejemplo.com"
                    required
                  />
                </label>
                <label>
                  Código de activación
                  <input type="text" name="code" placeholder="123456" required />
                </label>
                <label>
                  Token de activación (opcional)
                  <input type="text" name="token" placeholder="Pega el enlace si lo recibiste" />
                </label>
                <div className="account-form__actions">
                  <button type="button" className="btn btn--ghost" onClick={handleResendActivation} disabled={activationSubmitting}>
                    Reenviar código
                  </button>
                  <button type="submit" className="btn btn--primary" disabled={activationSubmitting}>
                    {activationSubmitting ? 'Validando…' : 'Confirmar activación'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

export default AccountPage
