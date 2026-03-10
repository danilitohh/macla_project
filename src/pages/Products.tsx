import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ProductGrid from '../components/ProductGrid'
import { categories, products as fallbackProducts } from '../data/products'
import type { Product } from '../types'
import { getProducts } from '../services/catalogService'

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialCategory = searchParams.get('categoria') ?? 'todos'
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory)
  const [searchTerm, setSearchTerm] = useState('')
  const [catalog, setCatalog] = useState<Product[]>(fallbackProducts)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      try {
        setError(null)
        const remote = await getProducts()
        if (!isMounted) return
        setCatalog(remote.length > 0 ? remote : fallbackProducts)
      } catch (err) {
        console.error('[Products] Error fetching catalog', err)
        if (!isMounted) return
        setCatalog(fallbackProducts)
        setError('No pudimos actualizar el catálogo. Mostramos la versión base.')
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
  }, [])

  const filteredProducts = useMemo(() => {
    let filtered = catalog
    if (selectedCategory !== 'todos') {
      filtered = filtered.filter((product) => product.category === selectedCategory)
    }
    if (searchTerm.trim()) {
      const normalized = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(normalized) ||
          product.shortDescription.toLowerCase().includes(normalized) ||
          product.tags?.some((tag) => tag.toLowerCase().includes(normalized))
      )
    }
    return filtered
  }, [catalog, selectedCategory, searchTerm])

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId)
    const nextParams = new URLSearchParams(searchParams)
    if (categoryId === 'todos') {
      nextParams.delete('categoria')
    } else {
      nextParams.set('categoria', categoryId)
    }
    setSearchParams(nextParams)
  }

  return (
    <div className="page">
      <section className="section section--intro">
        <div className="container">
          <h1>Catálogo de productos</h1>
          <p>
            Importamos y distribuimos herramientas profesionales de belleza y accesorios versátiles listos para
            impulsar tu negocio. Todos los productos cuentan con garantía de hasta 3 meses según la categoría.
          </p>
        </div>
      </section>

      <section className="section section--catalog">
        <div className="container">
          <div className="filters">
            <div className="filters__categories">
              <button
                type="button"
                className={selectedCategory === 'todos' ? 'chip is-active' : 'chip'}
                onClick={() => handleCategoryChange('todos')}
              >
                Todos
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  className={selectedCategory === category.id ? 'chip is-active' : 'chip'}
                  onClick={() => handleCategoryChange(category.id)}
                >
                  {category.label}
                </button>
              ))}
            </div>
            <div className="filters__search">
              <input
                type="search"
                placeholder="Buscar producto, característica o palabra clave"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
          </div>
          {loading ? <p>Cargando productos…</p> : <ProductGrid products={filteredProducts} />}
          {error && <p className="muted">{error}</p>}
        </div>
      </section>
    </div>
  )
}

export default Products
