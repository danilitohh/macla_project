import { useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { products } from '../data/products'
import { formatCurrency } from '../utils/format'
import { useCart } from '../hooks/useCart'

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>()
  const product = useMemo(() => products.find((item) => item.id === id), [id])
  const { addItem } = useCart()

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
