import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { categories, products as fallbackProducts } from '../data/products'
import { shippingOptions, paymentMethods } from '../data/config'
import { formatCurrency } from '../utils/format'
import ProductCard from '../components/ProductCard'
import type { Announcement, Product } from '../types'
import { getAnnouncements, getProducts } from '../services/catalogService'

const Home = () => {
  const [showHighlight, setShowHighlight] = useState(false)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [highlightIndex, setHighlightIndex] = useState(0)
  const [catalog, setCatalog] = useState<Product[]>(fallbackProducts)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadData = async () => {
      try {
        setError(null)
        const [remoteProducts, remoteAnnouncements] = await Promise.all([getProducts(), getAnnouncements()])
        if (!isMounted) return
        setCatalog(remoteProducts.length > 0 ? remoteProducts : fallbackProducts)
        setAnnouncements(remoteAnnouncements)
        setHighlightIndex(0)
      } catch (err) {
        console.error('[Home] Error loading catalog/announcements', err)
        if (!isMounted) return
        setCatalog(fallbackProducts)
        setAnnouncements([])
        setError('No pudimos cargar las novedades. Mostramos el catálogo base.')
        setShowHighlight(false)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [])

  const prioritizedAnnouncements = useMemo(() => {
    const sorted = [...announcements].sort(
      (a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title)
    )
    const active = sorted.filter((item) => item.isActive)
    return active.length > 0 ? active : sorted
  }, [announcements])

  const highlight = prioritizedAnnouncements[highlightIndex] || null
  const hasMultipleHighlights = prioritizedAnnouncements.length > 1

  const featuredProducts = useMemo(() => catalog.slice(0, 4), [catalog])

  useEffect(() => {
    if (prioritizedAnnouncements.length === 0) {
      setShowHighlight(false)
      return
    }
    setHighlightIndex((prev) => Math.min(prev, prioritizedAnnouncements.length - 1))
  }, [prioritizedAnnouncements.length])

  useEffect(() => {
    if (prioritizedAnnouncements.length > 0) {
      setShowHighlight(true)
    }
  }, [prioritizedAnnouncements.length])

  const handleNextAnnouncement = () => {
    if (prioritizedAnnouncements.length <= 1) return
    setHighlightIndex((prev) => (prev + 1) % prioritizedAnnouncements.length)
  }

  const handlePrevAnnouncement = () => {
    if (prioritizedAnnouncements.length <= 1) return
    setHighlightIndex((prev) => (prev - 1 + prioritizedAnnouncements.length) % prioritizedAnnouncements.length)
  }

  return (
    <div className="page">
      {showHighlight && highlight && (
        <div className="modal" role="dialog" aria-modal="true" aria-label="Producto destacado">
          <div className="modal__content">
            <button type="button" className="modal__close" onClick={() => setShowHighlight(false)} aria-label="Cerrar anuncio">
              ×
            </button>
            <div className="modal__nav" aria-label="Cambiar anuncio destacado">
              <div className="modal__nav-left">
                {highlight.badge && <span className="modal__sticker">{highlight.badge}</span>}
                {hasMultipleHighlights && (
                  <span className="modal__nav-count">Anuncio {highlightIndex + 1} de {prioritizedAnnouncements.length}</span>
                )}
              </div>
              {hasMultipleHighlights && (
                <div className="modal__nav-buttons">
                  <button
                    type="button"
                    className="modal__nav-btn"
                    onClick={handlePrevAnnouncement}
                    aria-label="Anuncio anterior"
                  >
                    ← Anterior
                  </button>
                  <button
                    type="button"
                    className="modal__nav-btn"
                    onClick={handleNextAnnouncement}
                    aria-label="Siguiente anuncio"
                  >
                    Ver siguiente →
                  </button>
                </div>
              )}
            </div>
            <div className="modal__body">
              <div className="modal__image">
                <img src={highlight.imageUrl || '/hero-macla.png'} alt={highlight.title} />
              </div>
              <div className="modal__info">
                {highlight.badge && <p className="badge badge--muted">{highlight.badge}</p>}
                <h3>{highlight.title}</h3>
                <p>{highlight.description}</p>
                <div className="modal__actions">
                  {highlight.ctaUrl ? (
                    highlight.ctaUrl.startsWith('http') ? (
                      <a className="btn btn--primary" href={highlight.ctaUrl} target="_blank" rel="noreferrer">
                        {highlight.ctaLabel || 'Ver más'}
                      </a>
                    ) : (
                      <Link to={highlight.ctaUrl} className="btn btn--primary">
                        {highlight.ctaLabel || 'Ver más'}
                      </Link>
                    )
                  ) : null}
                  <button type="button" className="btn btn--ghost" onClick={() => setShowHighlight(false)}>
                    Ver después
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <section className="hero">
        <div className="container hero__content">
          <div>
            <span className="badge">MACLA Distribuciones S.A.S</span>
            <h1>Productos innovadores para emprendedores que marcan tendencia</h1>
            <p>
              Importamos planchas, secadoras, onduladoras y bolsos diseñados para elevar tu negocio de belleza
              y bienestar. Calidad comprobada, garantías claras y soporte para que emprender sea más simple.
            </p>
            <div className="hero__actions">
              <Link to="/productos" className="btn btn--primary">
                Ver catálogo completo
              </Link>
              <a className="btn btn--ghost" href="https://wa.me/573502617924" target="_blank" rel="noreferrer">
                Solicitar asesoría
              </a>
            </div>
          </div>
          <div className="hero__image">
            <img src="/hero-macla.png" alt="Colección de productos MACLA" />
          </div>
        </div>
      </section>

      <section className="section section--light">
        <div className="container">
          <h2>Catálogo por categoría</h2>
          <div className="category-grid">
            {categories.map((category) => (
              <Link key={category.id} to={`/productos?categoria=${category.id}`} className="category-card">
                <h3>{category.label}</h3>
                <p>Descubre opciones listas para entregar en Colombia y Latinoamérica.</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
            <div className="section__header">
              <h2>Best sellers de temporada</h2>
              <Link to="/productos" className="link">
                Ver todos los productos
              </Link>
            </div>
          <div className="product-grid">
            {loading && <p>Cargando catálogo…</p>}
            {!loading && featuredProducts.length === 0 && <p className="muted">No hay productos para mostrar.</p>}
            {!loading &&
              featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
          </div>
          {error && <p className="muted">{error}</p>}
        </div>
      </section>

      <section className="section section--dark">
        <div className="container mission-grid">
          <div>
            <h2>Nuestra misión</h2>
            <p>
              Ayudamos a las personas a emprender y mejorar su calidad de vida con productos innovadores de
              cuidado personal, belleza y estética. Elegimos marcas confiables, evaluamos cada importación y
              acompañamos a nuestros aliados en cada paso.
            </p>
          </div>
          <div>
            <h3>¿Por qué MACLA?</h3>
            <ul className="checklist">
              <li>Inventario con control de calidad y garantías claras.</li>
              <li>Productos que siguen tendencias globales y generan alto valor.</li>
              <li>Envíos rápidos en Medellín y cobertura nacional.</li>
              <li>Acompañamiento comercial para emprendedores.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container mission-grid">
          <div>
            <h2>Logística pensada para ti</h2>
            <ul className="bullet-list">
              {shippingOptions.slice(0, 4).map((option) => (
                <li key={option.id}>
                  <strong>{option.label}</strong>: {option.description}{' '}
                  {option.price > 0 ? `(desde ${formatCurrency(option.price)})` : '(a convenir)' }.
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2>Pagos flexibles</h2>
            <ul className="bullet-list">
              {paymentMethods.map((method) => (
                <li key={method.id}>
                  <strong>{method.label}</strong>: {method.description}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2>Garantías transparentes</h2>
            <p>
              Planchas, secadoras y onduladoras cuentan con garantía de funcionamiento por hasta 3 meses. Verificamos
              que cada herramienta sea compatible con el voltaje colombiano y acompañamos el proceso en caso de
              devoluciones.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Home
