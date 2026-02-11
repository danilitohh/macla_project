import { useEffect, useMemo, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { products as fallbackProducts } from "../data/products";
import { formatCurrency } from "../utils/format";
import { useCart } from "../hooks/useCart";
import type { Product, ProductContent, Review } from "../types";
import { createProductReview, getProductById, getProductReviews } from "../services/catalogService";

const defaultPlanchaContent: ProductContent = {
  accordion: [
    {
      title: "Modos de uso",
      items: ["Modo frío para fijación", "Cabello seco y húmedo"],
    },
    {
      title: "Controles",
      items: [
        "5 niveles de temperatura precisos",
        "2 velocidades de flujo de aire (bajo y alto)",
        "Pantalla LCD digital",
        "Botón deslizante para bloqueo de brazos",
        "Modo Boost opcional",
      ],
    },
    {
      title: "Funciones inteligentes",
      items: [
        "Autolimpieza con aire frío al encender",
        "Pausa automática tras 3 segundos sin uso",
        "Alertas LCD para mantenimiento",
        "Protección térmica",
      ],
    },
    {
      title: "Seguridad",
      items: [
        "Apagado automático",
        "Protección contra sobrecalentamiento",
        "Bloqueo de brazos para seguridad",
      ],
    },
  ],
  howTo: [
    { title: "Alisa tu cabello húmedo", image: "/howto/step0.png" },
    { title: "Paso 1: Secar con toalla", image: "/howto/step1.png" },
    { title: "Paso 2: Secar las raíces", image: "/howto/step2.png" },
    {
      title: "Paso 3: Fija con aire frío o caliente",
      image: "/howto/step3.png",
    },
  ],
  benefits: [
    {
      title: "Pelo de mojado a look listo",
      description:
        "Combina aire y calor inteligente para peinar mientras secas. Menos pasos, más rapidez.",
      image: "/uploads/benefit1.png",
      emoji: "✨",
    },
    {
      title: "Calor preciso y uniforme",
      description:
        "Distribuye el aire suavemente en cada mechón para estilizar sin maltratar la fibra capilar.",
      image: "/uploads/benefit2.png",
      emoji: "❄️🔥",
    },
    {
      title: "Brillo y fuerza desde la primera pasada",
      description:
        "Protege la fibra capilar, mantiene el brillo natural y reduce el frizz al instante.",
      image: "/uploads/benefit3.png",
      emoji: "💖",
    },
  ],
  details: [
    { icon: "✨", title: "Marca MACLA", description: "Rosa cerámico" },
    {
      icon: "🪄",
      title: "Diseño",
      description: "Alargado, elegante y cómodo de manejar",
    },
    { icon: "🎀", title: "Color", description: "Rosa cerámico" },
    {
      icon: "🧳",
      title: "Set x 2 piezas",
      description: "Plancha secadora 2 en 1 + tapete antideslizante",
    },
  ],
  faqs: [
    {
      question: "¿En qué se diferencia de otras planchas?",
      answer:
        "Nuestra plancha MACLA 2 en 1 combina el secado con aire y el alisado con placas en un solo paso, ahorrándote tiempo y reduciendo el daño por calor. Además, ofrece calidad profesional a un precio accesible.",
    },
    {
      question: "¿Funciona en todo tipo de cabello?",
      answer:
        "Sí, la plancha MACLA es especialmente efectiva en cabello medio a grueso, pero funciona en todo tipo de cabello. Los 5 niveles de temperatura te permiten ajustarla según tu tipo de cabello.",
    },
    {
      question: "¿Qué incluye la garantía?",
      answer:
        "Este producto cuenta con una garantía de 1 mes a partir de la fecha de compra, válida únicamente por defectos de fabricación. No cubre daños por mal uso, golpes, caídas, manipulación indebida, líquidos o reparaciones de terceros. Para hacerla válida, presenta el producto en condiciones originales con comprobante de compra.",
    },
    {
      question: "¿Cuánto tiempo tarda en alisar el cabello?",
      answer:
        "Depende del largo y grosor de tu cabello, pero en promedio reduce el tiempo de alisado en 50% comparado con usar secador y plancha por separado. La mayoría de usuarias terminan en 10-15 minutos.",
    },
    {
      question: "¿Cuáles son los métodos de pago?",
      answer:
        "Aceptamos tarjetas de crédito y débito, PSE y efectivo (solo en Medellín y área metropolitana).",
    },
  ],
  reference: {
    headline: "¿Por qué elegir la Plancha MACLA?",
    bullets: [
      {
        title: "Seca y alisa",
        description:
          "Combina el flujo de aire con placas alisadoras para reducir pasos y ahorrar tiempo.",
      },
      {
        title: "Mantiene brillo",
        description: "Tecnología que protege tu cabello mientras lo estilizas.",
      },
      {
        title: "Profesionalismo",
        description:
          "Acabado pulido y brillante como de salón, ideal para cabello medio o grueso.",
      },
      {
        title: "Calidad premium",
        description: "Tecnología de alta gama a un precio increíble.",
      },
    ],
    tagline: "Tecnología profesional que transforma tu rutina de belleza",
    beforeImage: "/before.png",
    afterImage: "/after.png",
    bannerLeft: "/uploads/banner-left.png",
    bannerRight: "/uploads/banner-right.png",
  },
};

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [sliderValue, setSliderValue] = useState(50);
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewForm, setReviewForm] = useState<{
    author: string;
    rating: number;
    comment: string;
    images: string[];
  }>({
    author: "",
    rating: 5,
    comment: "",
    images: [],
  });
  const { addItem } = useCart();

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        setError(null);
        const remote = id ? await getProductById(id) : null;
        if (!isMounted) return;
        const fallback =
          fallbackProducts.find((item) => item.id === id) || null;
        setProduct(remote || fallback || null);
        setCurrentIndex(0);
        if (!remote && !fallback) {
          setError("Producto no encontrado.");
        }
      } catch (err) {
        console.error("[ProductDetail] Error fetching product", err);
        if (!isMounted) return;
        const fallback =
          fallbackProducts.find((item) => item.id === id) || null;
        setProduct(fallback);
        setError(
          "No pudimos cargar la información más reciente. Mostramos la versión guardada.",
        );
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const media = useMemo(() => {
    const list = Array.isArray(product?.images) ? (product?.images ?? []) : [];
    return list.length ? list : ["/hero-macla.png"];
  }, [product]);

  const readFilesAsDataUrls = async (files: File[]) => {
    const MAX_MB = 6;
    const valid = files.filter((file) => file.size <= MAX_MB * 1024 * 1024);
    const results = await Promise.all(
      valid.map(
        (file) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () =>
              resolve(typeof reader.result === "string" ? reader.result : "");
            reader.onerror = () => resolve("");
            reader.readAsDataURL(file);
          }),
      ),
    );
    return results.filter(Boolean);
  };

  const handleNext = () => {
    if (media.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % media.length);
  };

  const handlePrev = () => {
    if (media.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + media.length) % media.length);
  };

  const isVideoSrc = (src: string) =>
    /^data:video\//i.test(src) || /\.(mp4|webm|ogg)(\?.*)?$/i.test(src);

  const renderMedia = (src: string) => {
    const isVideo = isVideoSrc(src);
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
      );
    }
    return <img key={src} src={src} alt={product?.name} />;
  };

  const content: ProductContent | undefined = useMemo(() => {
    if (!product) return undefined;
    if (product.content && Object.keys(product.content).length > 0) {
      return product.content;
    }
    if (product.id === "plancha-secadora-2en1") {
      return defaultPlanchaContent;
    }
    return undefined;
  }, [product]);

  const accordionSections = content?.accordion ?? [];
  const howToSteps = content?.howTo ?? [];
  const benefits = content?.benefits ?? [];
  const productDetails = content?.details ?? [];
  const productFaqs = content?.faqs ?? [];
  const reference = content?.reference;
  const averageRating = useMemo(() => {
    if (!reviews.length) return 0;
    const sum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
    return Math.round((sum / reviews.length) * 10) / 10;
  }, [reviews]);

  useEffect(() => {
    setOpenSection(accordionSections[0]?.title ?? null);
  }, [product?.id, accordionSections]);

  useEffect(() => {
    setOpenFaq(productFaqs[0]?.question ?? null);
  }, [product?.id, productFaqs]);

  useEffect(() => {
    const loadReviews = async () => {
      if (!product?.id) return;
      setReviewsLoading(true);
      try {
        const data = await getProductReviews(product.id);
        setReviews(data);
      } catch (err) {
        console.error("[ProductDetail] Error fetching reviews", err);
      } finally {
        setReviewsLoading(false);
      }
    };
    loadReviews();
  }, [product?.id]);

  const toggleSection = (title: string) => {
    setOpenSection((prev) => (prev === title ? null : title));
  };

  const toggleFaq = (question: string) => {
    setOpenFaq((prev) => (prev === question ? null : question));
  };

  const handleReviewSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!product?.id) return;
    if (!reviewForm.comment.trim()) return;
    setSubmittingReview(true);
    try {
      const review = await createProductReview(product.id, {
        author: reviewForm.author.trim() || "Cliente",
        rating: reviewForm.rating,
        comment: reviewForm.comment.trim(),
        images: reviewForm.images,
      });
      setReviews((prev) => [review, ...prev]);
      setReviewForm({ author: "", rating: 5, comment: "", images: [] });
    } catch (err) {
      console.error("[ProductDetail] Error creating review", err);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleReviewFiles = async (files: FileList | null) => {
    if (!files) return;
    const dataUrls = await readFilesAsDataUrls(Array.from(files).slice(0, 4));
    if (!dataUrls.length) return;
    setReviewForm((prev) => ({
      ...prev,
      images: [...prev.images, ...dataUrls].slice(0, 4),
    }));
  };

  if (!id) {
    return <Navigate to="/productos" replace />;
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
    );
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
    );
  }

  return (
    <div className="page">
      <section className="section section--product-full">
        <div className="container product-detail">
          <div className="product-detail__top">
            <div className="product-detail__gallery">
              <div className="product-detail__viewer">
                {media.length > 1 && (
                  <button
                    type="button"
                    className="gallery-nav gallery-nav--prev"
                    onClick={handlePrev}
                    aria-label="Anterior"
                  >
                    ‹
                  </button>
                )}
                <div className="product-detail__frame">
                  {renderMedia(
                    media[Math.min(currentIndex, media.length - 1) || 0],
                  )}
                </div>
                {media.length > 1 && (
                  <button
                    type="button"
                    className="gallery-nav gallery-nav--next"
                    onClick={handleNext}
                    aria-label="Siguiente"
                  >
                    ›
                  </button>
                )}
              </div>

              {media.length > 1 && (
                <div className="product-detail__thumbs">
                  <div className="thumbs-scroll">
                    {media.map((src, index) => {
                      const isActive = index === currentIndex;
                      const isVideo = isVideoSrc(src);
                      return (
                        <button
                          key={src}
                          type="button"
                          className={isActive ? "thumb is-active" : "thumb"}
                          onClick={() => setCurrentIndex(index)}
                        >
                          {isVideo ? (
                            <video
                              src={src}
                              muted
                              playsInline
                              preload="metadata"
                              aria-label={`Video ${index + 1}`}
                            />
                          ) : (
                            <img
                              src={src}
                              alt={`Vista ${index + 1}`}
                              loading="lazy"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <div className="thumbs-nav">
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentIndex((prev) => Math.max(0, prev - 1))
                      }
                      disabled={currentIndex === 0}
                      aria-label="Anterior miniatura"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentIndex((prev) =>
                          Math.min(media.length - 1, prev + 1),
                        )
                      }
                      disabled={currentIndex === media.length - 1}
                      aria-label="Siguiente miniatura"
                    >
                      ↓
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="product-detail__info">
              {error && <p className="muted">{error}</p>}
              <Link
                to={`/productos?categoria=${product.category}`}
                className="badge badge--muted"
              >
                {product.category.toUpperCase()}
              </Link>
              <h1>{product.name}</h1>
              <p className="lead">{product.description}</p>
              <div className="product-detail__price">
                {formatCurrency(product.price, product.currency)}
              </div>
              <div className="pill-list">
                <span className="pill">Garantía 1 mes</span>
                <span className="pill">Envío a toda Colombia</span>
                <span className="pill">Pago seguro</span>
              </div>
              <p className="muted">Stock disponible: {product.stock}</p>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => addItem(product, 1)}
              >
                Añadir al carrito
              </button>

              {product.specs && (
                <div className="product-detail__section">
                  <h3>Especificaciones técnicas</h3>
                  <dl className="spec-list">
                    {Object.entries(product.specs).map(
                      ([specKey, specValue]) => (
                        <div key={specKey}>
                          <dt>{specKey}</dt>
                          <dd>{specValue}</dd>
                        </div>
                      ),
                    )}
                  </dl>
                </div>
              )}
            </div>
          </div>

          <div className="product-detail__meta">
            <div className="product-detail__panel">
              <h3>Características clave</h3>
              <ul className="checklist">
                {product.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>

              {product.highlights.length > 0 && (
                <div className="product-detail__section product-detail__section--tight">
                  <h4>Lo que más encanta</h4>
                  <ul className="bullet-list">
                    {product.highlights.map((highlight) => (
                      <li key={highlight}>{highlight}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="product-detail__panel product-detail__panel--accordion">
              {accordionSections.length > 0 && (
                <div className="accordion accordion--flush">
                  {accordionSections.map((section) => {
                    const isOpen = openSection === section.title;
                    return (
                      <div key={section.title} className="accordion__item">
                        <button
                          type="button"
                          className="accordion__header"
                          onClick={() => toggleSection(section.title)}
                        >
                          <span>{section.title}</span>
                          <span className="accordion__icon">
                            {isOpen ? "−" : "+"}
                          </span>
                        </button>
                        {isOpen && (
                          <ul className="accordion__list">
                            {section.items.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {reference?.beforeImage && reference?.afterImage && (
          <div className="container">
            <div className="reference">
              <div className="reference__image">
                <div className="before-after">
                  <img
                    src={reference.afterImage}
                    alt="Después"
                    className="after"
                    loading="lazy"
                  />
                  <img
                    src={reference.beforeImage}
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
                  <div
                    className="before-after__divider"
                    style={{ left: `${sliderValue}%` }}
                  >
                    <span>↔</span>
                  </div>
                </div>
              </div>
              <div className="reference__content">
                <h3>
                  {reference.headline || "¿Por qué elegir este producto?"}
                </h3>
                {reference.bullets && reference.bullets.length > 0 && (
                  <div className="reference__grid">
                    {reference.bullets.map((item) => (
                      <div key={item.title}>
                        <h4>{item.title}</h4>
                        <p>{item.description}</p>
                      </div>
                    ))}
                  </div>
                )}
                {reference.tagline && (
                  <p className="reference__tagline">{reference.tagline}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {howToSteps.length > 0 && (
          <div className="container">
            <div className="howto">
              <h3>¿Cómo usar este producto?</h3>
              <div className="howto__grid">
                {howToSteps.map((step) => (
                  <div key={step.title} className="howto__card">
                    {step.image && (
                      <img src={step.image} alt={step.title} loading="lazy" />
                    )}
                    <p>{step.title}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {benefits.length > 0 && (
          <div className="container">
            <div className="benefits">
              <h3>Beneficios que vas a amar ✨</h3>
              <div className="benefits__grid">
                {benefits.map((benefit) => (
                  <div key={benefit.title} className="benefit-card">
                    {benefit.image && (
                      <div className="benefit-card__image">
                        <img
                          src={benefit.image}
                          alt={benefit.title}
                          loading="lazy"
                        />
                      </div>
                    )}
                    <h4>
                      {benefit.emoji ? `${benefit.emoji} ` : ""}
                      {benefit.title}
                    </h4>
                    <p>{benefit.description}</p>
                  </div>
                ))}
              </div>
              {reference?.tagline && (
                <p className="benefits__tagline">{reference.tagline}</p>
              )}
            </div>
          </div>
        )}

        <div className="container">
          <div className="reviews">
            <div className="reviews__header">
              <h3>Reseñas de clientes</h3>
              <div className="reviews__score">
                <span className="reviews__score-number">
                  {averageRating ? averageRating.toFixed(1) : "—"}
                </span>
                <span className="reviews__score-stars">
                  {"★".repeat(Math.round(averageRating) || 0).padEnd(5, "☆")}
                </span>
                <span className="muted">
                  {reviews.length} {reviews.length === 1 ? "reseña" : "reseñas"}
                </span>
              </div>
            </div>

            <div className="reviews__grid">
              <form className="review-form" onSubmit={handleReviewSubmit}>
                <label>
                  Tu nombre (opcional)
                  <input
                    type="text"
                    value={reviewForm.author}
                    onChange={(e) =>
                      setReviewForm({ ...reviewForm, author: e.target.value })
                    }
                  />
                </label>

                <label>
                  Calificación
                  <div className="rating-input">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        className={
                          star <= reviewForm.rating
                            ? "rating-input__star is-active"
                            : "rating-input__star"
                        }
                        onClick={() =>
                          setReviewForm({ ...reviewForm, rating: star })
                        }
                        aria-label={`Calificar con ${star} estrella${
                          star > 1 ? "s" : ""
                        }`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </label>

                <label>
                  Comentario
                  <textarea
                    required
                    minLength={4}
                    value={reviewForm.comment}
                    onChange={(e) =>
                      setReviewForm({ ...reviewForm, comment: e.target.value })
                    }
                    placeholder="Cuéntanos qué tal te fue con el producto…"
                  />
                </label>

                <label>
                  Fotos (hasta 4)
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleReviewFiles(e.target.files)}
                  />
                  {reviewForm.images.length > 0 && (
                    <div className="review-form__thumbs">
                      {reviewForm.images.map((img, idx) => (
                        <button
                          key={img}
                          type="button"
                          className="review-form__thumb"
                          onClick={() =>
                            setReviewForm((prev) => ({
                              ...prev,
                              images: prev.images.filter((_, i) => i !== idx),
                            }))
                          }
                          aria-label="Quitar imagen"
                        >
                          <img src={img} alt={`Foto ${idx + 1}`} />
                          <span>×</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="muted">
                    Se guardan en formato seguro. Máx 6MB por imagen.
                  </p>
                </label>

                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={submittingReview}
                >
                  {submittingReview ? "Enviando…" : "Enviar reseña"}
                </button>
              </form>

              <div className="reviews__list">
                {reviewsLoading ? (
                  <p className="muted">Cargando reseñas…</p>
                ) : reviews.length === 0 ? (
                  <p className="muted">
                    Aún no hay reseñas para este producto. ¡Sé la primera!
                  </p>
                ) : (
                  reviews.map((review) => (
                    <div key={review.id} className="review-card">
                      <div className="review-card__header">
                        <strong>{review.author || "Cliente"}</strong>
                        <span className="review-card__stars">
                          {"★".repeat(review.rating).padEnd(5, "☆")}
                        </span>
                      </div>
                      <p className="review-card__comment">{review.comment}</p>
                      {review.imageUrls && review.imageUrls.length > 0 && (
                        <div className="review-card__images">
                          {review.imageUrls.map((img) => (
                            <img key={img} src={img} alt="Foto de cliente" />
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {productDetails.length > 0 && (
          <div className="container">
            <div className="product-details-banner">
              {(reference?.bannerLeft || media[0]) && (
                <div className="product-details-banner__side product-details-banner__side--left">
                  <img
                    src={reference?.bannerLeft || media[0]}
                    alt={product?.name}
                    loading="lazy"
                  />
                </div>
              )}
              <div className="product-details-banner__content">
                <p className="eyebrow">✨ Detalles del producto</p>
                <h3>{product?.name || "MACLA"}</h3>
                <div className="product-details-banner__grid">
                  {productDetails.map((detail) => (
                    <div
                      key={detail.title}
                      className="product-details-banner__item"
                    >
                      <span className="product-details-banner__icon">
                        {detail.icon}
                      </span>
                      <div>
                        <h4>{detail.title}</h4>
                        <p>{detail.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {(reference?.bannerRight || media[1] || media[0]) && (
                <div className="product-details-banner__side product-details-banner__side--right">
                  <img
                    src={reference?.bannerRight || media[1] || media[0]}
                    alt={product?.name}
                    loading="lazy"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {productFaqs.length > 0 && (
          <div className="container">
            <div className="product-faq">
              <h3>Preguntas frecuentes</h3>
              <div className="product-faq__list">
                {productFaqs.map((faq) => (
                  <button
                    key={faq.question}
                    type="button"
                    className={
                      openFaq === faq.question
                        ? "product-faq__item is-open"
                        : "product-faq__item"
                    }
                    onClick={() => toggleFaq(faq.question)}
                    aria-expanded={openFaq === faq.question}
                  >
                    <div className="product-faq__header">
                      <span className="product-faq__q">{faq.question}</span>
                      <span className="product-faq__icon">
                        {openFaq === faq.question ? "−" : "+"}
                      </span>
                    </div>
                    {openFaq === faq.question && (
                      <div className="product-faq__a">{faq.answer}</div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default ProductDetail;
