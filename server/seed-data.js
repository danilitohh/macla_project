const categories = [
  { id: "planchas", label: "Planchas de cabello", description: null },
  { id: "secadoras", label: "Secadoras", description: null },
  { id: "onduladoras", label: "Onduladoras", description: null },
  { id: "bolsos", label: "Bolsos y maletas", description: null },
];

const products = [
  {
    id: "plancha-secadora-2en1",
    name: "Plancha Secadora 2 en 1 MACLA",
    shortDescription: "Alisa y seca en una sola pasada con diseño compacto.",
    description:
      "Herramienta 2 en 1 que combina flujo de aire con placas alisadoras para reducir pasos y tiempo de peinado. Ideal para un acabado pulido en cabellos medios a gruesos sin perder brillo.",
    categoryId: "planchas",
    price: 380000,
    currency: "COP",
    stock: 20,
    images: ["/plancha.png"],
    features: [],
    highlights: [],
    tags: ["2en1", "secadora", "alisado"],
  },
];

const announcements = [
  {
    id: "destacado-principal",
    title: "Plancha Secadora 2 en 1 MACLA",
    description:
      "Nuestro producto más vendido: alisa y seca en una sola pasada con acabado profesional.",
    badge: "Top ventas",
    ctaLabel: "Comprar ahora",
    ctaUrl: "/producto/plancha-secadora-2en1",
    imageUrl: "/plancha.png",
    sortOrder: 0,
    isActive: true,
  },
];

const shippingOptions = [
  {
    id: "medellin",
    label: "Envío Medellín",
    description:
      "Entrega en 1 a 3 días hábiles dentro del área metropolitana. Tarifa plana $15.000 COP.",
    price: 15000,
    regions: ["Medellín"],
  },
  {
    id: "nacional",
    label: "Envío nacional",
    description:
      "Cobertura nacional con transportadora aliada. Tiempo estimado de 2 a 7 días hábiles.",
    price: 25000,
    regions: ["Colombia"],
  },
];

const paymentMethods = [
  {
    id: "contraentrega",
    label: "Contra-entrega",
    description:
      "Disponible en Medellín y municipios cercanos, paga al recibir.",
  },
  {
    id: "pasarela",
    label: "Pasarela de pago",
    description:
      "Pagos con tarjeta débito y crédito a través de plataforma aliada.",
  },
];

module.exports = {
  categories,
  products,
  announcements,
  shippingOptions,
  paymentMethods,
};
