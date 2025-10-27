const PoliciesPage = () => (
  <div className="page">
    <section className="section section--intro">
      <div className="container">
        <h1>Políticas y privacidad</h1>
        <p className="lead">
          MACLA Distribuciones S.A.S protege la información de sus clientes y define condiciones claras para el uso de
          la tienda online.
        </p>
      </div>
    </section>

    <section className="section">
      <div className="container mission-grid">
        <div>
          <h2>Aviso legal</h2>
          <ul className="bullet-list">
            <li>MACLA es una empresa legalmente constituida en Colombia dedicada a la importación y comercialización de productos de belleza, estética y cuidado personal.</li>
            <li>Los contenidos, imágenes, descripciones y marcas presentes en esta tienda son propiedad de MACLA o de terceros autorizados.</li>
            <li>Queda prohibida la reproducción, distribución o modificación del contenido sin autorización escrita.</li>
          </ul>
        </div>
        <div>
          <h2>Condiciones de uso</h2>
          <ul className="bullet-list">
            <li>El uso de la tienda implica la aceptación de estas políticas.</li>
            <li>Los usuarios se comprometen a utilizar el sitio de forma responsable, sin vulnerar derechos de autor ni realizar actividades fraudulentas.</li>
            <li>MACLA puede actualizar los términos en cualquier momento y notificará cambios por la web o correo.</li>
          </ul>
        </div>
      </div>
    </section>

    <section className="section section--light">
      <div className="container">
        <h2>Política de privacidad</h2>
        <p>
          Protegemos la información personal que se recolecta en la tienda (nombre, correo, dirección, teléfono y otros
          datos necesarios para la compra). Esta información se usa para:
        </p>
        <ul className="bullet-list">
          <li>Procesar pedidos, coordinar envíos y brindar soporte posventa.</li>
          <li>Comunicar novedades, promociones y lanzamientos de producto.</li>
          <li>Mejorar la experiencia de compra y personalizar la atención.</li>
        </ul>
        <p>
          Los datos no se comparten con terceros ajenos a la operación, salvo obligaciones legales o servicios logísticos.
          Puedes ejercer tus derechos de acceso, corrección o eliminación escribiendo a
          <a href="mailto:privacidad@macla.com"> privacidad@macla.com</a>.
        </p>
      </div>
    </section>

    <section className="section">
      <div className="container mission-grid">
        <div>
          <h2>Envíos y entregas</h2>
          <ul className="bullet-list">
            <li>Medellín: 1 a 3 días hábiles.</li>
            <li>Resto de Colombia: 2 a 5 días hábiles.</li>
            <li>Envíos internacionales: se cotizan según país destino y el costo lo asume el cliente.</li>
            <li>MACLA no es responsable por retrasos causados por transportadoras, eventos naturales o aduanas.</li>
          </ul>
        </div>
        <div>
          <h2>Devoluciones y garantías</h2>
          <ul className="bullet-list">
            <li>Planchas, secadoras y onduladoras cuentan con garantía de funcionamiento de 3 meses.</li>
            <li>Se aceptan devoluciones con el producto en su empaque original, sin señales de uso indebido.</li>
            <li>Los costos de envío asociados a la devolución pueden ser asumidos por el cliente según evaluación del caso.</li>
          </ul>
        </div>
      </div>
    </section>
  </div>
)

export default PoliciesPage
