import { faqs, shippingOptions, paymentMethods } from '../data/config'
import { formatCurrency } from '../utils/format'

const FAQPage = () => (
  <div className="page">
    <section className="section section--intro">
      <div className="container">
        <h1>Preguntas frecuentes</h1>
        <p className="lead">
          Aquí encuentras respuestas rápidas sobre envíos, métodos de pago, garantías y proceso de compra en MACLA
          Distribuciones.
        </p>
      </div>
    </section>

    <section className="section">
      <div className="container">
        <div className="mission-grid">
          <div>
            <h2>Envíos y tiempos</h2>
            <ul className="bullet-list">
              {shippingOptions.map((option) => (
                <li key={option.id}>
                  <strong>{option.label}</strong>: {option.description}{' '}
                  {option.price > 0 ? `(desde ${formatCurrency(option.price)})` : '(a convenir)'}.
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2>Pagos disponibles</h2>
            <ul className="bullet-list">
              {paymentMethods.map((method) => (
                <li key={method.id}>
                  <strong>{method.label}</strong>: {method.description}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>

    <section className="section section--light">
      <div className="container">
        <div className="mission-grid">
          {faqs.map((faq) => (
            <div key={faq.question}>
              <h3>{faq.question}</h3>
              <p>{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    <section className="section">
      <div className="container">
        <h2>¿Tienes otra duda?</h2>
        <p>
          Escríbenos a <a href="mailto:macla.importaciones@outlook.es">macla.importaciones@outlook.es</a> o por
          WhatsApp al <a href="https://wa.me/573502617924" target="_blank" rel="noreferrer">+57 350 261 7924</a>.
          También puedes enviarnos un mensaje directo en Instagram a
          <a href="https://www.instagram.com/Macla_importaciones" target="_blank" rel="noreferrer"> @Macla_importaciones</a>.
        </p>
      </div>
    </section>
  </div>
)

export default FAQPage
