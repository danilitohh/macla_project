const TermsPage = () => (
  <div className="page">
    <section className="section section--intro">
      <div className="container">
        <h1>Términos y condiciones</h1>
        <p className="lead">
          Estas condiciones regulan la compra y el uso de la tienda online de MACLA Distribuciones S.A.S. Al navegar o
          realizar un pedido, confirmas tu aceptación de las políticas descritas a continuación.
        </p>
      </div>
    </section>

    <section className="section">
      <div className="container mission-grid">
        <div>
          <h2>Términos de compra</h2>
          <ul className="bullet-list">
            <li>Los productos incluyen descripción, precios y disponibilidad actualizada. Los precios pueden variar según promociones o cambios de proveedores.</li>
            <li>Los valores publicados incluyen IVA cuando aplica.</li>
            <li>El cliente debe verificar que sus herramientas sean compatibles con el voltaje y normas de uso en Colombia (110V).</li>
            <li>El pedido se confirma una vez se valida disponibilidad, pago y datos de envío.</li>
          </ul>
        </div>
        <div>
          <h2>Métodos de pago</h2>
          <ul className="bullet-list">
            <li>Contra-entrega en Medellín y área metropolitana, sujeto a cobertura.</li>
            <li>Transferencias bancarias y billeteras digitales como Nequi.</li>
            <li>Pagos en efectivo en Medellín o contra-entrega.</li>
            <li>Pasarela de pago para tarjetas débito y crédito.</li>
          </ul>
        </div>
      </div>
    </section>

    <section className="section section--light">
      <div className="container mission-grid">
        <div>
          <h2>Política de inventario</h2>
          <ul className="bullet-list">
            <li>Gestionamos productos agotados y reposiciones según temporada y demanda.</li>
            <li>Las referencias pueden rotar para mantener la oferta alineada con tendencias de belleza y estética.</li>
            <li>En caso de agotarse un producto después de tu compra, te contactaremos para ofrecer reposición, cambio o devolución.</li>
          </ul>
        </div>
        <div>
          <h2>Modificaciones</h2>
          <ul className="bullet-list">
            <li>MACLA puede modificar estos términos y políticas en cualquier momento.</li>
            <li>Los cambios entran en vigencia desde su publicación en la tienda.</li>
            <li>Recomendamos revisar periódicamente esta sección para conocer las actualizaciones.</li>
          </ul>
        </div>
      </div>
    </section>

    <section className="section">
      <div className="container">
        <h2>Contacto</h2>
        <p>
          Si tienes dudas sobre estos términos, contáctanos al correo
          <a href="mailto:macla.importaciones@outlook.es"> macla.importaciones@outlook.es</a> o al WhatsApp
          <a href="https://wa.me/573502617924" target="_blank" rel="noreferrer"> +57 350 261 7924</a>.
        </p>
      </div>
    </section>
  </div>
)

export default TermsPage
