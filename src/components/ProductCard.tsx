import { Link } from 'react-router-dom'
import type { Product } from '../types'
import { formatCurrency } from '../utils/format'
import { useCart } from '../hooks/useCart'

interface Props {
  product: Product
}

const ProductCard = ({ product }: Props) => {
  const { addItem } = useCart()

  return (
    <article className="product-card">
      <Link to={`/producto/${product.id}`} className="product-card__image">
        <img src={product.images[0]} alt={product.name} loading="lazy" />
      </Link>
      <div className="product-card__content">
        <Link to={`/producto/${product.id}`} className="product-card__title">
          {product.name}
        </Link>
        <p className="product-card__description">{product.shortDescription}</p>
        <p className="product-card__price">{formatCurrency(product.price, product.currency)}</p>
        <button type="button" className="btn" onClick={() => addItem(product, 1)}>
          Añadir al carrito
        </button>
      </div>
    </article>
  )
}

export default ProductCard
