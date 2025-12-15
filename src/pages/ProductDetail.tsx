import { useEffect, useState } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import { products as fallbackProducts } from '../data/products'
import { formatCurrency } from '../utils/format'
import { useCart } from '../hooks/useCart'
import type { Product } from '../types'
import { getProductById } from '../services/catalogService'

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { addItem } = useCart()

  useEffect(() => {
    let isMounted = true

    const load = async () => {
      try {
        setError(null)
        const remote = id ? await getProductById(id) : null
        if (!isMounted) return
        const fallback = fallbackProducts.find((item) => item.id === id) || null
        setProduct(remote || fallback || null)
        if (!remote && !fallback) {
          setError('Producto no encontrado.')
        }
      } catch (err) {
        console.error('[ProductDetail] Error fetching product', err)
        if (!isMounted) return
        const fallback = fallbackProducts.find((item) => item.id === id) || null
        setProduct(fallback)
        setError('No pudimos cargar la información más reciente. Mostramos la versión guardada.')
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      isMounted = false
    }
  }, [id])

  if (!id) {
    return <Navigate to="/productos" replace />
  }

  if (loading) {
    return (
      <div className="page">
        <section className="section">
          <div className="container">
            <p>Cargando producto…</p>
          </div>
        </section>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="page">
        <section className="section">
          <div className="container">
            <h1>Producto no encontrado</h1>
            <p>El artículo que buscas no está disponible o fue actualizado.</p>
            <Link to="/productos" className="btn btn--primary">
              Volver al catálogo
            </Link>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="page">
      <section className="section">
        <div className="container product-detail">
          <div className="product-detail__gallery">
            {product.images.map((image, index) => (
              <img key={image} src={image} alt={`${product.name} ${index + 1}`} />
            ))}
          </div>
          <div className="product-detail__info">
            {error && <p className="muted">{error}</p>}
            <Link to={`/productos?categoria=${product.category}`} className="badge badge--muted">
              {product.category.toUpperCase()}
            </Link>
            <h1>{product.name}</h1>
            <p className="lead">{product.description}</p>
            <div className="product-detail__price">{formatCurrency(product.price, product.currency)}</div>
            <p className="muted">Stock disponible: {product.stock}</p>
            <button type="button" className="btn btn--primary" onClick={() => addItem(product, 1)}>
              Añadir al carrito
            </button>

            <div className="product-detail__section">
              <h3>Características clave</h3>
              <ul className="checklist">
                {product.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </div>

            {product.highlights.length > 0 && (
              <div className="product-detail__section">
                <h3>Lo que más encanta</h3>
                <ul className="bullet-list">
                  {product.highlights.map((highlight) => (
                    <li key={highlight}>{highlight}</li>
                  ))}
                </ul>
              </div>
            )}

            {product.specs && (
              <div className="product-detail__section">
                <h3>Especificaciones técnicas</h3>
                <dl className="spec-list">
                  {Object.entries(product.specs).map(([specKey, specValue]) => (
                    <div key={specKey}>
                      <dt>{specKey}</dt>
                      <dd>{specValue}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

export default ProductDetail
