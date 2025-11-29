import { Link } from 'react-router-dom'

const Footer = () => (
  <footer className="footer">
    <div className="container footer__grid">
      <div className="footer__card">
        <h4>MACLA Distribuciones S.A.S</h4>
        <p>Innovación en belleza, cuidado personal y accesorios que inspiran emprendimiento.</p>
      </div>
      <div className="footer__card">
        <h4>Contacto</h4>
        <ul>
          <li>Correo: <a href="mailto:macla.importaciones@outlook.es">macla.importaciones@outlook.es</a></li>
          <li>Teléfono: <a href="tel:+573502617924">+57 350 261 7924</a></li>
          <li>Instagram: <a href="https://www.instagram.com/Macla_importaciones" target="_blank" rel="noreferrer">@Macla_importaciones</a></li>
        </ul>
      </div>
      <div className="footer__card">
        <h4>Legales</h4>
        <ul>
          <li>
            <Link to="/politicas">Políticas y privacidad</Link>
          </li>
          <li>
            <Link to="/terminos">Términos y condiciones</Link>
          </li>
        </ul>
      </div>
    </div>
    <div className="footer__bottom">
      <small>© {new Date().getFullYear()} MACLA Distribuciones S.A.S. Todos los derechos reservados.</small>
    </div>
  </footer>
)

export default Footer
