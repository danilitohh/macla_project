import type { Product } from '../types'
import ProductCard from './ProductCard'

interface Props {
  products: Product[]
  emptyMessage?: string
}

const ProductGrid = ({ products, emptyMessage = 'No hay productos disponibles.' }: Props) => {
  if (products.length === 0) {
    return <p className="muted">{emptyMessage}</p>
  }

  return (
    <div className="product-grid">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}

export default ProductGrid
