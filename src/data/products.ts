import type { Product } from '../types'

export const products: Product[] = [
  {
    id: 'plancha-secadora-2en1',
    name: 'Plancha Secadora 2 en 1 MACLA',
    shortDescription: 'Alisa y seca en una sola pasada con diseño compacto.',
    description:
      'Herramienta 2 en 1 que combina flujo de aire con placas alisadoras para reducir pasos y tiempo de peinado. Ideal para un acabado pulido en cabellos medios a gruesos sin perder brillo.',
    category: 'planchas',
    price: 380000,
    currency: 'COP',
    stock: 20,
    images: ['/plancha.png'],
    features: [],
    highlights: [],
    tags: ['2en1', 'secadora', 'alisado']
  }
]

export const categories = [
  { id: 'planchas', label: 'Planchas de cabello' },
  { id: 'secadoras', label: 'Secadoras' },
  { id: 'onduladoras', label: 'Onduladoras' },
  { id: 'bolsos', label: 'Bolsos y maletas' }
] as const
