import { Link } from 'react-router-dom'

const NotFound = () => (
  <div className="page">
    <section className="section">
      <div className="container">
        <h1>Página no encontrada</h1>
        <p>No pudimos encontrar el contenido solicitado. Te invitamos a volver al inicio.</p>
        <Link to="/" className="btn btn--primary">
          Ir a inicio
        </Link>
      </div>
    </section>
  </div>
)

export default NotFound
