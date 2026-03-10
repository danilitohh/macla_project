import type { Product } from '../types'

export const products: Product[] = [
  {
    id: 'plancha-secadora-2en1',
    name: 'Plancha Secadora MACLA 2 en 1',
    shortDescription: 'Alisa y seca en un solo paso con flujo de aire inteligente y placas cerámicas.',
    description:
      'Tu rutina más fácil que nunca: con MACLA 2 en 1 secas y alisas tu cabello al mismo tiempo, de mojado a look terminado en un solo paso y sin castigar tu pelo. El flujo de aire inteligente protege la fibra capilar y distribuye el calor de forma uniforme para lograr brillo desde la primera pasada.',
    category: 'planchas',
    price: 410000,
    currency: 'COP',
    stock: 120,
    images: [
      '/plancha.png',
      '/uploads/product-plancha-secadora-2en1-0-1770746284819-4v881t.webp',
      '/uploads/product-plancha-secadora-2en1-1-1770746284822-gu869j.webp',
      '/uploads/product-plancha-secadora-2en1-2-1770746284823-wwhtk2.webp',
      '/uploads/product-plancha-secadora-2en1-10-1770746284829-pt788x.mp4'
    ],
    features: [
      'Seca y alisa en un solo paso, de húmedo a look terminado.',
      'Flujo de aire inteligente que protege la fibra capilar.',
      'Ajuste automático cuando cierras las placas para mayor control.',
      'Placas cerámicas y calor uniforme para un brillo inmediato.',
      'Reduce frizz y ahorra tiempo en tu rutina diaria.'
    ],
    highlights: [
      'Tecnología 2 en 1: secado + alisado',
      'Apto para cabello húmedo',
      'Loque de brillo y suavidad desde la primera pasada',
      'Cable giratorio 360° y diseño liviano',
      '3 niveles de temperatura'
    ],
    tags: ['2en1', 'secadora', 'alisado', 'flujo-aire', 'cabello-humedo']
  }
]

export const categories = [
  { id: 'planchas', label: 'Planchas de cabello' },
  { id: 'secadoras', label: 'Secadoras' },
  { id: 'onduladoras', label: 'Onduladoras' },
  { id: 'bolsos', label: 'Bolsos y maletas' }
] as const
