import { Link, NavLink } from 'react-router-dom'
import { FiShoppingBag, FiMenu, FiUser } from 'react-icons/fi'
import { useState } from 'react'
import { useCart } from '../hooks/useCart'
import { useAuth } from '../hooks/useAuth'

const navItems = [
  { to: '/', label: 'Inicio' },
  { to: '/productos', label: 'Productos' },
  { to: '/nosotros', label: 'Quiénes somos' },
  { to: '/faq', label: 'Preguntas frecuentes' }
]

const Header = () => {
  const { totalItems } = useCart()
  const { user, isAuthenticated } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const adminItems = user?.role === 'admin' ? [{ to: '/admin', label: 'Admin' }] : []
  const fullNavItems = [...navItems, ...adminItems]

  return (
    <header className="header">
      <div className="container header__inner">
        <Link to="/" className="header__logo" aria-label="MACLA Distribuciones">
          <span className="logo__title">MACLA</span>
          <span className="logo__subtitle">IMPORTACIONES</span>
        </Link>
        <nav className={`header__nav ${isMobileMenuOpen ? 'is-open' : ''}`}>
          {fullNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? 'nav__link is-active' : 'nav__link')}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
          <NavLink
            to="/cuenta"
            className={({ isActive }) => (isActive ? 'nav__link is-active' : 'nav__link')}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <FiUser />
            <span className="sr-only">Cuenta</span>
            <span className="nav__account-label">{isAuthenticated ? user?.name || user?.email : 'Iniciar sesión'}</span>
          </NavLink>
          <Link to="/carrito" className="nav__cart" onClick={() => setIsMobileMenuOpen(false)}>
            <FiShoppingBag />
            {totalItems > 0 && <span className="nav__cart-count">{totalItems}</span>}
          </Link>
        </nav>
        <button
          type="button"
          className="header__menu-button"
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          aria-label="Abrir menú"
        >
          <FiMenu />
        </button>
      </div>
    </header>
  )
}

export default Header
