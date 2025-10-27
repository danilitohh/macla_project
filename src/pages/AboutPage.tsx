import { valueProposition } from '../data/config'

const values = ['Innovación', 'Calidad', 'Adaptabilidad', 'Compromiso con el cliente', 'Accesibilidad']

const AboutPage = () => (
  <div className="page">
    <section className="section section--intro">
      <div className="container">
        <h1>Quiénes somos</h1>
        <p className="lead">
          MACLA Distribuciones S.A.S es una importadora colombiana enfocada en productos de belleza, estética y
          cuidado personal que inspiran emprendimiento. Elegimos artículos que marcan tendencia y ofrecen valor real a
          quienes deciden emprender con nosotros.
        </p>
      </div>
    </section>

    <section className="section">
      <div className="container mission-grid">
        <div>
          <h2>Misión</h2>
          <p>
            Ayudar a las personas a emprender y mejorar su calidad de vida ofreciendo productos innovadores y de alta
            calidad en cuidado personal, belleza y estética. Nos adaptamos a las tendencias del mercado y garantizamos
            experiencias confiables desde la compra hasta la postventa.
          </p>
        </div>
        <div>
          <h2>Visión</h2>
          <p>
            Ser la empresa líder en importación de productos de belleza y estética en Latinoamérica, expandiendo
            nuestra presencia a nuevos mercados con lanzamientos que marquen tendencia e impulsen el emprendimiento.
          </p>
        </div>
      </div>
    </section>

    <section className="section section--light">
      <div className="container mission-grid">
        <div>
          <h2>Nuestros valores</h2>
          <ul className="checklist">
            {values.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <h2>Propuesta de valor</h2>
          <ul className="bullet-list">
            {valueProposition.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>

    <section className="section">
      <div className="container">
        <div className="mission-grid">
          <div>
            <h2>Catálogo curado y dinámico</h2>
            <p>
              Traemos planchas, secadoras, onduladoras y bolsos que se ajustan a las temporadas y preferencias de los
              clientes finales. Analizamos referencias internacionales —con referentes como Diana Fletes— para asegurar
              que nuestro catálogo mantenga el atractivo de las tendencias globales.
            </p>
          </div>
          <div>
            <h2>Autogestión y soporte</h2>
            <p>
              María Clara lidera la actualización del catálogo, inventario y material de producto de forma directa.
              Contamos con un plan de soporte para brindar acompañamiento técnico o comercial cuando el crecimiento lo
              requiera.
            </p>
          </div>
          <div>
            <h2>Cómo trabajamos</h2>
            <ul className="bullet-list">
              <li>Evaluamos proveedores y calidad antes de incorporar una nueva referencia.</li>
              <li>Planeamos reposiciones según rotación y campañas estacionales.</li>
              <li>Comunicación permanente con aliados mediante WhatsApp, correo e Instagram.</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  </div>
)

export default AboutPage
