import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

type FormMode = 'login' | 'register'

const AccountPage = () => {
  const { user, isAuthenticated, login, register, logout, error, clearError } = useAuth()
  const [mode, setMode] = useState<FormMode>('login')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const handleModeChange = (nextMode: FormMode) => {
    setMode(nextMode)
    setSuccessMessage(null)
    setFormError(null)
    clearError()
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const email = String(formData.get('email') ?? '').trim()
    const password = String(formData.get('password') ?? '')
    const name = String(formData.get('name') ?? '').trim()
    const accepted = formData.get('acceptPolicies') === 'on'
    const requiresConsent = mode === 'register'

    if (requiresConsent && !accepted) {
      setFormError('Debes aceptar las políticas de privacidad y los términos para continuar.')
      return
    }

    setIsSubmitting(true)
    setSuccessMessage(null)
    setFormError(null)

    try {
      if (mode === 'login') {
        await login({ email, password })
        setSuccessMessage('¡Bienvenido de nuevo! Tu carrito y datos están sincronizados.')
        event.currentTarget.reset()
      } else {
        await register({ name, email, password })
        setSuccessMessage('Tu cuenta fue creada y tu carrito ya está registrado.')
        event.currentTarget.reset()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
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
      </div>
    )
  }

  return (
    <div className="page">
      <section className="section section--intro">
        <div className="container">
          <h1>{mode === 'login' ? 'Inicia sesión' : 'Crea tu cuenta'}</h1>
          <p>
            Guarda tus datos, personaliza tu carrito y haz seguimiento a tus pedidos en MACLA Distribuciones. Solo toma
            un minuto.
          </p>
        </div>
      </section>
      <section className="section">
        <div className="container account-form">
          <div className="account-form__toggle">
            <button
              type="button"
              className={mode === 'login' ? 'btn btn--primary' : 'btn btn--ghost'}
              onClick={() => handleModeChange('login')}
              disabled={mode === 'login'}
            >
              Ya tengo cuenta
            </button>
            <button
              type="button"
              className={mode === 'register' ? 'btn btn--primary' : 'btn btn--ghost'}
              onClick={() => handleModeChange('register')}
              disabled={mode === 'register'}
            >
              Quiero registrarme
            </button>
          </div>

          <form className="account-form__panel" onSubmit={handleSubmit} noValidate>
            {mode === 'register' && (
              <label>
                Nombre completo
                <input type="text" name="name" placeholder="María Clara" required />
              </label>
            )}
            <label>
              Correo electrónico
              <input type="email" name="email" placeholder="tuemail@ejemplo.com" required />
            </label>
            <label>
              Contraseña
              <input type="password" name="password" placeholder="Mínimo 6 caracteres" minLength={6} required />
            </label>
            <label className="checkbox">
              <input type="checkbox" name="acceptPolicies" required={mode === 'register'} />
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
            {formError && <p className="form-error">{formError}</p>}
            {error && <p className="form-error">{error}</p>}
            {successMessage && <p className="form-success">{successMessage}</p>}
            <button type="submit" className="btn btn--primary" disabled={isSubmitting}>
              {isSubmitting ? 'Procesando…' : mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
            </button>
          </form>
        </div>
      </section>
    </div>
  )
}

export default AccountPage
