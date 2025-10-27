const categories = [
  { id: 'planchas', label: 'Planchas de cabello', description: null },
  { id: 'secadoras', label: 'Secadoras', description: null },
  { id: 'onduladoras', label: 'Onduladoras', description: null },
  { id: 'bolsos', label: 'Bolsos y maletas', description: null }
]

const products = [
  {
    id: 'plancha-kerapower',
    name: 'Plancha Profesional KeraPower',
    shortDescription: 'Placas de turmalina flotantes con control digital de temperatura.',
    description:
      'Plancha profesional con placas de turmalina y tecnología de calor infrarrojo que sella la cutícula en cada pasada. Ideal para cabellos rebeldes que buscan un liso impecable con menos frizz y protección máxima.',
    categoryId: 'planchas',
    price: 289900,
    currency: 'COP',
    stock: 28,
    images: [
      'https://images.unsplash.com/photo-1582719471378-c100ff6a35b9?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=900&q=80'
    ],
    features: [
      'Placas flotantes de turmalina de 1 pulgada',
      'Control digital de 130°C a 230°C',
      'Calentamiento rápido en 30 segundos',
      'Cable giratorio de 360° de 2.5 m'
    ],
    highlights: [
      'Reducción de frizz gracias a la turmalina negativa',
      'Ajuste preciso de temperatura según el tipo de cabello',
      'Incluye estuche térmico plegable'
    ],
    specs: {
      Voltaje: '110-220V',
      Potencia: '45W',
      Peso: '320g'
    },
    tags: ['alisado', 'profesional', 'turmalina']
  },
  {
    id: 'plancha-travel-mini',
    name: 'Plancha Travel Mini Glow',
    shortDescription: 'Formato compacto ideal para viajes y retoques rápidos.',
    description:
      'Plancha mini ideal para flequillos, retoques y viajes. Su tamaño portátil permite llevarla en el bolso y su revestimiento cerámico cuida el cabello sin maltratarlo.',
    categoryId: 'planchas',
    price: 159900,
    currency: 'COP',
    stock: 45,
    images: [
      'https://images.unsplash.com/photo-1512756290469-ec264b7fbf87?auto=format&fit=crop&w=900&q=80'
    ],
    features: [
      'Diseño compacto de 19 cm',
      'Placas cerámicas con calor uniforme',
      'Incluye estuche resistente al calor'
    ],
    highlights: ['Perfecta para viaje', 'Ideal para retoques rápidos'],
    specs: {
      Voltaje: '110V',
      Potencia: '25W'
    },
    tags: ['viaje', 'compacta']
  },
  {
    id: 'secadora-ionica-pro',
    name: 'Secadora Iónica Velocity Pro',
    shortDescription: 'Motor AC de larga duración con tecnología iónica avanzada.',
    description:
      'Secadora profesional con motor AC silencioso, tres niveles de temperatura y dos velocidades. Incluye tecnología iónica que protege la fibra capilar y acelera el secado.',
    categoryId: 'secadoras',
    price: 319900,
    currency: 'COP',
    stock: 32,
    images: [
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=900&q=80'
    ],
    features: [
      'Tecnología iónica anti-frizz',
      'Incluye boquilla concentradora y difusor',
      'Filtro removible para fácil limpieza',
      'Botón de aire frío'
    ],
    highlights: ['Secado rápido sin resecar', 'Motor profesional AC'],
    specs: {
      Voltaje: '110-120V',
      Potencia: '2000W',
      Peso: '480g'
    }
  },
  {
    id: 'secadora-compacta',
    name: 'Secadora Compact Airflow',
    shortDescription: 'Liviana y plegable, pensada para uso diario o de viaje.',
    description:
      'Secadora liviana con mango plegable, dos temperaturas y dos velocidades. Diseño minimalista y compacto que ahorra espacio sin sacrificar potencia.',
    categoryId: 'secadoras',
    price: 209900,
    currency: 'COP',
    stock: 40,
    images: [
      'https://images.unsplash.com/photo-1598514982901-4b008be9860c?auto=format&fit=crop&w=900&q=80'
    ],
    features: [
      'Mango plegable',
      'Incluye boquilla concentrada',
      'Filtro removible',
      'Cable de 1.8 m'
    ],
    highlights: ['Ideal para espacios pequeños', 'Ligera y silenciosa'],
    specs: {
      Voltaje: '110V',
      Potencia: '1600W'
    }
  },
  {
    id: 'onduladora-wave-pro',
    name: 'Onduladora Wave Pro 32mm',
    shortDescription: 'Barril cerámico de 32 mm para ondas marcadas y brillantes.',
    description:
      'Onduladora profesional con revestimiento cerámico que protege el cabello. Ideal para ondas grandes y definidas con acabado brillante que dura todo el día.',
    categoryId: 'onduladoras',
    price: 249900,
    currency: 'COP',
    stock: 25,
    images: [
      'https://images.unsplash.com/photo-1503938709625-76d92644b023?auto=format&fit=crop&w=900&q=80'
    ],
    features: [
      'Control digital de temperatura',
      'Apagado automático a los 60 minutos',
      'Punta fría para mayor seguridad'
    ],
    highlights: ['Ondas brillantes en pocos minutos', 'Cable giratorio profesional'],
    specs: {
      Voltaje: '110-220V',
      Potencia: '70W',
      Diametro: '32mm'
    }
  },
  {
    id: 'onduladora-triple-wave',
    name: 'Onduladora Triple Wave',
    shortDescription: 'Tres barriles cerámicos para ondas playeras consistentes.',
    description:
      'Onduladora triple que crea ondas playeras con efecto natural en cuestión de minutos. Su revestimiento cerámico distribuye el calor de manera uniforme para evitar daños.',
    categoryId: 'onduladoras',
    price: 269900,
    currency: 'COP',
    stock: 18,
    images: [
      'https://images.unsplash.com/photo-1552332386-f8dd00dc2f85?auto=format&fit=crop&w=900&q=80'
    ],
    features: [
      'Barriles cerámicos de 22 mm',
      'Tres temperaturas preestablecidas',
      'Calentamiento ultra rápido'
    ],
    highlights: ['Acabado playero sostenible', 'Incluye guante térmico'],
    specs: {
      Voltaje: '110-220V',
      Potencia: '90W'
    }
  },
  {
    id: 'bolso-neopreno',
    name: 'Bolso Urban Neo',
    shortDescription: 'Bolso urbano de neopreno con compartimentos inteligentes.',
    description:
      'Bolso versátil en neopreno premium resistente al agua. Cuenta con compartimentos acolchados para laptop, cables y accesorios, ideal para emprendedores en movimiento.',
    categoryId: 'bolsos',
    price: 189900,
    currency: 'COP',
    stock: 55,
    images: [
      'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=900&q=80'
    ],
    features: [
      'Compartimento acolchado para laptop de 14"',
      'Bolsillos internos y externos con cierre',
      'Bandola ajustable desmontable'
    ],
    highlights: ['Resistente al agua', 'Diseño minimalista y ligero'],
    specs: {
      Material: 'Neopreno premium',
      Dimensiones: '38 x 28 x 10 cm'
    }
  },
  {
    id: 'bolso-weekend',
    name: 'Bolso Weekend Traveler',
    shortDescription: 'Maleta de viaje con compartimento para calzado y organizadores.',
    description:
      'Maleta tipo weekender con amplio espacio interior, compartimento independiente para calzado y bolsillos exteriores de fácil acceso. Ideal para viajes cortos o escapadas de fin de semana.',
    categoryId: 'bolsos',
    price: 239900,
    currency: 'COP',
    stock: 22,
    images: [
      'https://images.unsplash.com/photo-1514996937319-344454492b37?auto=format&fit=crop&w=900&q=80'
    ],
    features: [
      'Compartimento ventilado para calzado',
      'Asas reforzadas y correa acolchada',
      'Cremalleras metálicas YKK'
    ],
    highlights: ['Ideal para emprendedores en movimiento', 'Diseño sofisticado y resistente'],
    specs: {
      Material: 'Cuero vegano + lona',
      Dimensiones: '50 x 28 x 25 cm'
    }
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
