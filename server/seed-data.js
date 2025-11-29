const categories = [
  { id: 'planchas', label: 'Planchas de cabello', description: null },
  { id: 'secadoras', label: 'Secadoras', description: null },
  { id: 'onduladoras', label: 'Onduladoras', description: null },
  { id: 'bolsos', label: 'Bolsos y maletas', description: null }
]

const products = [
  {
    id: 'plancha-secadora-2en1',
    name: 'Plancha Secadora 2 en 1 MACLA',
    shortDescription: 'Alisa y seca en una sola pasada con diseño compacto.',
    description:
      'Herramienta 2 en 1 que combina flujo de aire con placas alisadoras para reducir pasos y tiempo de peinado. Ideal para un acabado pulido en cabellos medios a gruesos sin perder brillo.',
    categoryId: 'planchas',
    price: 380000,
    currency: 'COP',
    stock: 20,
    images: ['/plancha.png'],
    features: [],
    highlights: [],
    tags: ['2en1', 'secadora', 'alisado']
  }
]

const shippingOptions = [
  {
    id: 'medellin',
    label: 'Envío Medellín',
    description: 'Entrega en 1 a 3 días hábiles dentro del área metropolitana. Tarifa plana $10.000 COP.',
    price: 10000,
    regions: ['Medellín']
  },
  {
    id: 'afueras',
    label: 'Área metropolitana extendida',
    description:
      'Envigado, Itagüí, Sabaneta. Entrega en 1 a 3 días hábiles. Tarifa entre $12.000 y $14.000 COP según zona.',
    price: 12000,
    regions: ['Envigado', 'Itagüí', 'Sabaneta']
  },
  {
    id: 'ciudades-principales',
    label: 'Ciudades principales Colombia',
    description: 'Envía a Bogotá, Cali, Barranquilla y principales capitales. Tiempo estimado de 2 a 5 días hábiles.',
    price: 15000,
    regions: ['Capitales']
  },
  {
    id: 'ciudades-secundarias',
    label: 'Ciudades no principales',
    description: 'Cobertura nacional con transportadora aliada. Tiempo estimado de 2 a 7 días hábiles.',
    price: 25000,
    regions: ['Nacional']
  },
  {
    id: 'internacional',
    label: 'Envío internacional',
    description: 'Cotización personalizada. El costo es asumido por el cliente según destino.',
    price: 0,
    regions: ['Internacional']
  }
]

const paymentMethods = [
  {
    id: 'contraentrega',
    label: 'Contra-entrega',
    description: 'Disponible en Medellín y municipios cercanos, paga al recibir.'
  },
  {
    id: 'transferencia',
    label: 'Transferencia bancaria / Nequi',
    description: 'Pagos inmediatos por transferencia o billeteras digitales.'
  },
  {
    id: 'efectivo',
    label: 'Efectivo',
    description: 'Retiro en punto de entrega o contra-entrega según cobertura.'
  },
  {
    id: 'pasarela',
    label: 'Pasarela de pago',
    description: 'Pagos con tarjeta débito y crédito a través de plataforma aliada.'
  }
]

module.exports = {
  categories,
  products,
  shippingOptions,
  paymentMethods
}
