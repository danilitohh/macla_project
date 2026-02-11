import { useEffect, useMemo, useState } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import { products as fallbackProducts } from '../data/products'
import { formatCurrency } from '../utils/format'
import { useCart } from '../hooks/useCart'
import type { Product } from '../types'
import { getProductById } from '../services/catalogService'

const ProductDetail = () => {
  const BANNER_LEFT = '/uploads/banner-left.png'
  const BANNER_RIGHT = '/uploads/banner-right.png'
  const { id } = useParams<{ id: string }>()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [openSection, setOpenSection] = useState<string | null>('uso')
  const [sliderValue, setSliderValue] = useState(50)
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
        setCurrentIndex(0)
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

  const media = useMemo(() => {
    const list = Array.isArray(product?.images) ? product?.images ?? [] : []
    return list.length ? list : ['/hero-macla.png']
  }, [product])

  const handleNext = () => {
    if (media.length <= 1) return
    setCurrentIndex((prev) => (prev + 1) % media.length)
  }

  const handlePrev = () => {
    if (media.length <= 1) return
    setCurrentIndex((prev) => (prev - 1 + media.length) % media.length)
  }

  const isVideoSrc = (src: string) => /^data:video\//i.test(src) || /\.(mp4|webm|ogg)(\?.*)?$/i.test(src)

  const renderMedia = (src: string) => {
    const isVideo = isVideoSrc(src)
    if (isVideo) {
      return (
        <video
          key={src}
          src={src}
          controls
          muted
          loop
          playsInline
          className="product-detail__video"
        >
          Tu navegador no soporta video.
        </video>
      )
    }
    return <img key={src} src={src} alt={product?.name} />
  }

  const accordionSections = [
    {
      id: 'uso',
      title: 'Modos de uso',
      items: ['Modo frío para fijación', 'Cabello seco y húmedo']
    },
    {
      id: 'controles',
      title: 'Controles',
      items: [
        '5 niveles de temperatura precisos',
        '2 velocidades de flujo de aire (bajo y alto)',
        'Pantalla LCD digital',
        'Botón deslizante para bloqueo de brazos',
        'Modo Boost opcional'
      ]
    },
    {
      id: 'inteligentes',
      title: 'Funciones inteligentes',
      items: [
        'Autolimpieza con aire frío al encender',
        'Pausa automática tras 3 segundos sin uso',
        'Alertas LCD para mantenimiento',
        'Protección térmica'
      ]
    },
    {
      id: 'seguridad',
      title: 'Seguridad',
      items: ['Apagado automático', 'Protección contra sobrecalentamiento', 'Bloqueo de brazos para seguridad']
    }
  ]

  const toggleSection = (id: string) => {
    setOpenSection((prev) => (prev === id ? null : id))
  }

  const howToSteps = [
    { title: 'Alisa tu cabello húmedo', image: '/howto/step0.png' },
    { title: 'Paso 1: Secar con toalla', image: '/howto/step1.png' },
    { title: 'Paso 2: Secar las raíces', image: '/howto/step2.png' },
    { title: 'Paso 3: Fija con aire frío o caliente', image: '/howto/step3.png' }
  ]

  const benefits = [
    {
      title: 'Pelo de mojado a look listo',
      description: 'Combina aire y calor inteligente para peinar mientras secas. Menos pasos, más rapidez.',
      image: '/uploads/benefit1.png',
      emoji: '✨'
    },
    {
      title: 'Calor preciso y uniforme',
      description: 'Distribuye el aire suavemente en cada mechón para estilizar sin maltratar la fibra capilar.',
      image: '/uploads/benefit2.png',
      emoji: '❄️🔥'
    },
    {
      title: 'Brillo y fuerza desde la primera pasada',
      description: 'Protege la fibra capilar, mantiene el brillo natural y reduce el frizz al instante.',
      image: '/uploads/benefit3.png',
      emoji: '💖'
    }
  ]

  const productDetails = [
    { icon: '✨', title: 'Marca MACLA', description: 'Rosa cerámico' },
    { icon: '🪄', title: 'Diseño', description: 'Alargado, elegante y cómodo de manejar' },
    { icon: '🎀', title: 'Color', description: 'Rosa cerámico' },
    { icon: '🧳', title: 'Set x 2 piezas', description: 'Plancha secadora 2 en 1 + tapete antideslizante' }
  ]

  const productFaqs = [
    {
      question: '¿En qué se diferencia de otras planchas?',
      answer:
        'Nuestra plancha MACLA 2 en 1 combina el secado con aire y el alisado con placas en un solo paso, ahorrándote tiempo y reduciendo el daño por calor. Además, ofrece calidad profesional a un precio accesible.'
    },
    {
      question: '¿Funciona en todo tipo de cabello?',
      answer:
        'Sí, la plancha MACLA es especialmente efectiva en cabello medio a grueso, pero funciona en todo tipo de cabello. Los 5 niveles de temperatura te permiten ajustarla según tu tipo de cabello.'
    },
    {
      question: '¿Qué incluye la garantía?',
      answer:
        'Este producto cuenta con una garantía de 1 mes a partir de la fecha de compra, válida únicamente por defectos de fabricación. No cubre daños por mal uso, golpes, caídas, manipulación indebida, líquidos o reparaciones de terceros. Para hacerla válida, presenta el producto en condiciones originales con comprobante de compra.'
    },
    {
      question: '¿Cuánto tiempo tarda en alisar el cabello?',
      answer:
        'Depende del largo y grosor de tu cabello, pero en promedio reduce el tiempo de alisado en 50% comparado con usar secador y plancha por separado. La mayoría de usuarias terminan en 10-15 minutos.'
    },
    {
      question: '¿Cuáles son los métodos de pago?',
      answer: 'Aceptamos tarjetas de crédito y débito, PSE y efectivo (solo en Medellín y área metropolitana).'
    }
  ]

  const [openFaq, setOpenFaq] = useState<string | null>(productFaqs[0]?.question ?? null)

  const toggleFaq = (question: string) => {
    setOpenFaq((prev) => (prev === question ? null : question))
  }

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
            <div className="product-detail__viewer">
              {media.length > 1 && (
                <button type="button" className="gallery-nav gallery-nav--prev" onClick={handlePrev} aria-label="Anterior">
                  ‹
                </button>
              )}
              <div className="product-detail__frame">
                {renderMedia(media[Math.min(currentIndex, media.length - 1) || 0])}
              </div>
              {media.length > 1 && (
                <button type="button" className="gallery-nav gallery-nav--next" onClick={handleNext} aria-label="Siguiente">
                  ›
                </button>
              )}
            </div>

            {media.length > 1 && (
              <div className="product-detail__thumbs">
                {media.map((src, index) => {
                  const isActive = index === currentIndex
                  const isVideo = isVideoSrc(src)
                  return (
                    <button
                      key={src}
                      type="button"
                      className={isActive ? 'thumb is-active' : 'thumb'}
                      onClick={() => setCurrentIndex(index)}
                    >
                      {isVideo ? (
                        <video src={src} muted playsInline preload="metadata" aria-label={`Video ${index + 1}`} />
                      ) : (
                        <img src={src} alt={`Vista ${index + 1}`} loading="lazy" />
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
          <div className="product-detail__info">
            {error && <p className="muted">{error}</p>}
            <Link to={`/productos?categoria=${product.category}`} className="badge badge--muted">
              {product.category.toUpperCase()}
            </Link>
            <h1>{product.name}</h1>
            <p className="lead">{product.description}</p>
            <div className="product-detail__price">{formatCurrency(product.price, product.currency)}</div>
            <div className="pill-list">
              <span className="pill">Garantía 1 mes</span>
              <span className="pill">Envío a toda Colombia</span>
              <span className="pill">Pago seguro</span>
            </div>
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

            <div className="accordion">
              {accordionSections.map((section) => {
                const isOpen = openSection === section.id
                return (
                  <div key={section.id} className="accordion__item">
                    <button type="button" className="accordion__header" onClick={() => toggleSection(section.id)}>
                      <span>{section.title}</span>
                      <span className="accordion__icon">{isOpen ? '−' : '+'}</span>
                    </button>
                    {isOpen && (
                      <ul className="accordion__list">
                        {section.items.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )
              })}
            </div>

          </div>
        </div>

        <div className="container">
          <div className="reference">
            <div className="reference__image">
              <div className="before-after">
                <img src="/after.png" alt="Después" className="after" loading="lazy" />
                <img
                  src="/before.png"
                  alt="Antes"
                  className="before"
                  style={{ clipPath: `inset(0 ${100 - sliderValue}% 0 0)` }}
                  loading="lazy"
                />
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={sliderValue}
                  onChange={(e) => setSliderValue(Number(e.target.value))}
                  className="before-after__slider"
                  aria-label="Comparar antes y después"
                />
                <div className="before-after__divider" style={{ left: `${sliderValue}%` }}>
                  <span>↔</span>
                </div>
              </div>
            </div>
            <div className="reference__content">
              <h3>¿Por qué elegir la Plancha MACLA?</h3>
              <div className="reference__grid">
                <div>
                  <h4>Seca y alisa</h4>
                  <p>Combina el flujo de aire con placas alisadoras para reducir pasos y ahorrar tiempo.</p>
                </div>
                <div>
                  <h4>Mantiene brillo</h4>
                  <p>Tecnología que protege tu cabello mientras lo estilizas.</p>
                </div>
                <div>
                  <h4>Profesionalismo</h4>
                  <p>Acabado pulido y brillante como de salón, ideal para cabello medio o grueso.</p>
                </div>
                <div>
                  <h4>Calidad premium</h4>
                  <p>Tecnología de alta gama a un precio increíble.</p>
                </div>
              </div>
              <p className="reference__tagline">Tecnología profesional que transforma tu rutina de belleza</p>
            </div>
          </div>
        </div>

        <div className="container">
          <div className="howto">
            <h3>¿Cómo usar tu plancha MACLA?</h3>
            <div className="howto__grid">
              {howToSteps.map((step) => (
                <div key={step.title} className="howto__card">
                  <img src={step.image} alt={step.title} loading="lazy" />
                  <p>{step.title}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="container">
          <div className="benefits">
            <h3>Beneficios que vas a amar ✨</h3>
            <div className="benefits__grid">
              {benefits.map((benefit) => (
                <div key={benefit.title} className="benefit-card">
                  <div className="benefit-card__image">
                    <img src={benefit.image} alt={benefit.title} loading="lazy" />
                  </div>
                  <h4>{benefit.emoji} {benefit.title}</h4>
                  <p>{benefit.description}</p>
                </div>
              ))}
            </div>
            <p className="benefits__tagline">
              Porque tu cabello merece verse lindo, sano y fácil de peinar. Disfruta tu look todos los días.
            </p>
          </div>
        </div>

        <div className="container">
          <div className="product-details-banner">
            {(BANNER_LEFT || media[0]) && (
              <div className="product-details-banner__side product-details-banner__side--left">
                <img src={BANNER_LEFT || media[0]} alt={product?.name} loading="lazy" />
              </div>
            )}
            <div className="product-details-banner__content">
              <p className="eyebrow">✨ Detalles del producto</p>
              <h3>{product?.name || 'MACLA'}</h3>
              <div className="product-details-banner__grid">
                {productDetails.map((detail) => (
                  <div key={detail.title} className="product-details-banner__item">
                    <span className="product-details-banner__icon">{detail.icon}</span>
                    <div>
                      <h4>{detail.title}</h4>
                      <p>{detail.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {(BANNER_RIGHT || media[1] || media[0]) && (
              <div className="product-details-banner__side product-details-banner__side--right">
                <img src={BANNER_RIGHT || media[1] || media[0]} alt={product?.name} loading="lazy" />
              </div>
            )}
          </div>
        </div>

        <div className="container">
          <div className="product-faq">
            <h3>Preguntas frecuentes</h3>
            <div className="product-faq__list">
              {productFaqs.map((faq) => (
                <button
                  key={faq.question}
                  type="button"
                  className={openFaq === faq.question ? 'product-faq__item is-open' : 'product-faq__item'}
                  onClick={() => toggleFaq(faq.question)}
                  aria-expanded={openFaq === faq.question}
                >
                  <div className="product-faq__header">
                    <span className="product-faq__q">{faq.question}</span>
                    <span className="product-faq__icon">{openFaq === faq.question ? '−' : '+'}</span>
                  </div>
                  {openFaq === faq.question && <div className="product-faq__a">{faq.answer}</div>}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default ProductDetail
