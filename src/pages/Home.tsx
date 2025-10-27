import { Link } from 'react-router-dom'
import { products, categories } from '../data/products'
import { shippingOptions, paymentMethods } from '../data/config'
import { formatCurrency } from '../utils/format'
import ProductCard from '../components/ProductCard'

const Home = () => {
  const featuredProducts = products.slice(0, 4)

  return (
    <div className="page">
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
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
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
