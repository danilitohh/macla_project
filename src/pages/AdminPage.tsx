import { useEffect, useMemo, useState } from 'react'
import { categories } from '../data/products'
import type { Announcement, Category, Product } from '../types'
import {
  createAdminAnnouncement,
  createAdminProduct,
  deleteAdminAnnouncement,
  deleteAdminProduct,
  getAdminAnnouncements,
  getAdminProducts,
  updateAdminAnnouncement,
  updateAdminProduct
} from '../services/catalogService'
import { useAuth } from '../hooks/useAuth'

const asList = (value: string) =>
  value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)

const toMultiline = (items?: string[]) => (items && items.length ? items.join('\n') : '')

type ProductFormState = {
  id: string
  name: string
  shortDescription: string
  description: string
  category: Category
  price: string
  stock: string
  images: string
  features: string
  highlights: string
  tags: string
}

const defaultProductForm: ProductFormState = {
  id: '',
  name: '',
  shortDescription: '',
  description: '',
  category: categories[0]?.id || 'planchas',
  price: '0',
  stock: '0',
  images: '',
  features: '',
  highlights: '',
  tags: ''
}

const defaultAnnouncementForm: Record<string, string> = {
  id: '',
  title: '',
  description: '',
  badge: '',
  ctaLabel: '',
  ctaUrl: '',
  imageUrl: '',
  sortOrder: '0'
}

const AdminPage = () => {
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [productForm, setProductForm] = useState<ProductFormState>(defaultProductForm)
  const [announcementForm, setAnnouncementForm] = useState<Record<string, string>>(defaultAnnouncementForm)
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState<string | null>(null)

  const readFilesAsDataUrls = async (fileList: FileList | null): Promise<string[]> => {
    if (!fileList || fileList.length === 0) return []
    const files = Array.from(fileList)
    const dataUrls = await Promise.all(
      files.map(
        (file) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
            reader.onerror = () => resolve('')
            reader.readAsDataURL(file)
          })
      )
    )
    return dataUrls.filter(Boolean)
  }

  const activeAnnouncements = useMemo(
    () => announcements.filter((item) => item.isActive),
    [announcements]
  )

  useEffect(() => {
    let isMounted = true

    const load = async () => {
      try {
        const [remoteProducts, remoteAnnouncements] = await Promise.all([
          getAdminProducts(),
          getAdminAnnouncements()
        ])
        if (!isMounted) return
        setProducts(remoteProducts)
        setAnnouncements(remoteAnnouncements)
      } catch (error) {
        console.error('[AdminPage] Error loading admin data', error)
        if (!isMounted) return
        setFeedback('No pudimos cargar todos los datos. Intenta actualizar.')
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

  const resetProductForm = () => {
    setProductForm(defaultProductForm)
    setEditingProductId(null)
  }

  const resetAnnouncementForm = () => {
    setAnnouncementForm(defaultAnnouncementForm)
    setEditingAnnouncementId(null)
  }

  const handleProductSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      const payload: Partial<Product> = {
        id: productForm.id || editingProductId || undefined,
        name: productForm.name.trim(),
        shortDescription: productForm.shortDescription.trim(),
        description: productForm.description.trim(),
        category: productForm.category,
        price: Number(productForm.price) || 0,
        stock: Number(productForm.stock) || 0,
        currency: 'COP',
        images: asList(productForm.images),
        features: asList(productForm.features),
        highlights: asList(productForm.highlights),
        tags: asList(productForm.tags),
        isActive: true
      }

      const saved = editingProductId
        ? await updateAdminProduct(editingProductId, payload)
        : await createAdminProduct(payload)

      setProducts((prev) => {
        const existingIndex = prev.findIndex((item) => item.id === saved.id)
        if (existingIndex >= 0) {
          const next = [...prev]
          next[existingIndex] = saved
          return next
        }
        return [saved, ...prev]
      })
      setFeedback(`Producto "${saved.name}" guardado`)
      resetProductForm()
    } catch (error) {
      console.error('[AdminPage] Error saving product', error)
      setFeedback('No pudimos guardar el producto. Revisa los campos e inténtalo de nuevo.')
    }
  }

  const handleAnnouncementSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      const payload: Partial<Announcement> = {
        id: announcementForm.id || editingAnnouncementId || undefined,
        title: announcementForm.title.trim(),
        description: announcementForm.description.trim(),
        badge: announcementForm.badge || null,
        ctaLabel: announcementForm.ctaLabel || null,
        ctaUrl: announcementForm.ctaUrl || null,
        imageUrl: announcementForm.imageUrl || null,
        sortOrder: Number(announcementForm.sortOrder) || 0,
        isActive: true
      }

      const saved = editingAnnouncementId
        ? await updateAdminAnnouncement(editingAnnouncementId, payload)
        : await createAdminAnnouncement(payload)

      setAnnouncements((prev) => {
        const existingIndex = prev.findIndex((item) => item.id === saved.id)
        if (existingIndex >= 0) {
          const next = [...prev]
          next[existingIndex] = saved
          return next
        }
        return [saved, ...prev]
      })
      setFeedback(`Anuncio "${saved.title}" guardado`)
      resetAnnouncementForm()
    } catch (error) {
      console.error('[AdminPage] Error saving announcement', error)
      setFeedback('No pudimos guardar el anuncio. Intenta nuevamente.')
    }
  }

  const startEditProduct = (product: Product) => {
    setEditingProductId(product.id)
    setProductForm({
      id: product.id,
      name: product.name,
      shortDescription: product.shortDescription,
      description: product.description,
      category: product.category,
      price: String(product.price),
      stock: String(product.stock),
      images: product.images.join('\n'),
      features: toMultiline(product.features),
      highlights: toMultiline(product.highlights),
      tags: product.tags?.join(', ') || ''
    })
  }

  const startEditAnnouncement = (announcement: Announcement) => {
    setEditingAnnouncementId(announcement.id)
    setAnnouncementForm({
      id: announcement.id,
      title: announcement.title,
      description: announcement.description,
      badge: announcement.badge || '',
      ctaLabel: announcement.ctaLabel || '',
      ctaUrl: announcement.ctaUrl || '',
      imageUrl: announcement.imageUrl || '',
      sortOrder: String(announcement.sortOrder)
    })
  }

  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm('¿Eliminar este producto? Esta acción no se puede deshacer.')) return
    await deleteAdminProduct(productId)
    setProducts((prev) => prev.filter((item) => item.id !== productId))
    if (editingProductId === productId) {
      resetProductForm()
    }
  }

  const handleDeleteAnnouncement = async (announcementId: string) => {
    if (!window.confirm('¿Eliminar este anuncio?')) return
    await deleteAdminAnnouncement(announcementId)
    setAnnouncements((prev) => prev.filter((item) => item.id !== announcementId))
    if (editingAnnouncementId === announcementId) {
      resetAnnouncementForm()
    }
  }

  return (
    <div className="page">
      <section className="section section--intro">
        <div className="container">
          <h1>Panel admin MACLA</h1>
          <p>Gestiona anuncios destacados y catálogo de productos. Usuario: {user?.email}</p>
          {feedback && <p className="muted">{feedback}</p>}
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2>Anuncios destacados</h2>
          {loading ? (
            <p>Cargando anuncios…</p>
          ) : (
            <div className="admin-grid">
              <div>
                <h3>{editingAnnouncementId ? 'Editar anuncio' : 'Crear anuncio'}</h3>
                <form className="form" onSubmit={handleAnnouncementSubmit}>
                  <label>
                    ID (opcional)
                    <input
                      type="text"
                      value={announcementForm.id}
                      onChange={(event) => setAnnouncementForm({ ...announcementForm, id: event.target.value })}
                      placeholder="anuncio-destacado"
                    />
                  </label>
                  <label>
                    Título
                    <input
                      type="text"
                      required
                      value={announcementForm.title}
                      onChange={(event) => setAnnouncementForm({ ...announcementForm, title: event.target.value })}
                    />
                  </label>
                  <label>
                    Descripción
                    <textarea
                      required
                      value={announcementForm.description}
                      onChange={(event) =>
                        setAnnouncementForm({ ...announcementForm, description: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    Etiqueta (badge)
                    <input
                      type="text"
                      value={announcementForm.badge}
                      onChange={(event) => setAnnouncementForm({ ...announcementForm, badge: event.target.value })}
                    />
                  </label>
                  <label>
                    Texto botón
                    <input
                      type="text"
                      value={announcementForm.ctaLabel}
                      onChange={(event) => setAnnouncementForm({ ...announcementForm, ctaLabel: event.target.value })}
                    />
                  </label>
                  <label>
                    URL botón
                    <input
                      type="text"
                      value={announcementForm.ctaUrl}
                      onChange={(event) => setAnnouncementForm({ ...announcementForm, ctaUrl: event.target.value })}
                    />
                  </label>
                  <label>
                    Imagen (URL)
                    <input
                      type="text"
                      value={announcementForm.imageUrl}
                      onChange={(event) => setAnnouncementForm({ ...announcementForm, imageUrl: event.target.value })}
                    />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (event) => {
                        const urls = await readFilesAsDataUrls(event.target.files)
                        if (!urls.length) return
                        const [first] = urls
                        setAnnouncementForm((prev) => ({ ...prev, imageUrl: first }))
                        event.target.value = ''
                      }}
                    />
                    <p className="muted">Sube una imagen (data URL) o pega una URL pública.</p>
                  </label>
                  <label>
                    Orden
                    <input
                      type="number"
                      value={announcementForm.sortOrder}
                      onChange={(event) => setAnnouncementForm({ ...announcementForm, sortOrder: event.target.value })}
                    />
                  </label>
                  <div className="form__actions">
                    <button type="submit" className="btn btn--primary">
                      {editingAnnouncementId ? 'Actualizar anuncio' : 'Crear anuncio'}
                    </button>
                    <button type="button" className="btn btn--ghost" onClick={resetAnnouncementForm}>
                      Limpiar
                    </button>
                  </div>
                </form>
              </div>
              <div>
                <h3>Listado ({announcements.length})</h3>
                <ul className="list">
                  {announcements.map((announcement) => (
                    <li key={announcement.id} className="list__item">
                      <div>
                        <strong>{announcement.title}</strong> {announcement.isActive ? '' : '(inactivo)'}
                        <p className="muted">{announcement.description}</p>
                      </div>
                      <div className="list__actions">
                        <button type="button" className="btn btn--ghost" onClick={() => startEditAnnouncement(announcement)}>
                          Editar
                        </button>
                        <button type="button" className="btn btn--link" onClick={() => handleDeleteAnnouncement(announcement.id)}>
                          Eliminar
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2>Productos</h2>
          {loading ? (
            <p>Cargando productos…</p>
          ) : (
            <div className="admin-grid">
              <div>
                <h3>{editingProductId ? 'Editar producto' : 'Crear producto'}</h3>
                <form className="form" onSubmit={handleProductSubmit}>
                  <label>
                    ID (slug)
                    <input
                      type="text"
                      value={productForm.id}
                      onChange={(event) => setProductForm({ ...productForm, id: event.target.value })}
                      placeholder="plancha-secadora-2en1"
                    />
                  </label>
                  <label>
                    Nombre
                    <input
                      type="text"
                      required
                      value={productForm.name}
                      onChange={(event) => setProductForm({ ...productForm, name: event.target.value })}
                    />
                  </label>
                  <label>
                    Descripción corta
                    <input
                      type="text"
                      required
                      value={productForm.shortDescription}
                      onChange={(event) => setProductForm({ ...productForm, shortDescription: event.target.value })}
                    />
                  </label>
                  <label>
                    Descripción
                    <textarea
                      required
                      value={productForm.description}
                      onChange={(event) => setProductForm({ ...productForm, description: event.target.value })}
                    />
                  </label>
                  <label>
                    Categoría
                  <select
                      value={productForm.category}
                      onChange={(event) =>
                        setProductForm({ ...productForm, category: event.target.value as Category })
                      }
                    >
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Precio (COP)
                    <input
                      type="number"
                      value={productForm.price}
                      onChange={(event) => setProductForm({ ...productForm, price: event.target.value })}
                    />
                  </label>
                  <label>
                    Stock
                    <input
                      type="number"
                      value={productForm.stock}
                      onChange={(event) => setProductForm({ ...productForm, stock: event.target.value })}
                    />
                  </label>
                  <label>
                    Imágenes (una por línea)
                    <textarea
                      value={productForm.images}
                      onChange={(event) => setProductForm({ ...productForm, images: event.target.value })}
                      placeholder="/plancha.png"
                    />
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={async (event) => {
                        const urls = await readFilesAsDataUrls(event.target.files)
                        if (!urls.length) return
                        setProductForm((prev) => ({
                          ...prev,
                          images: [prev.images, ...urls].filter(Boolean).join('\n')
                        }))
                        event.target.value = ''
                      }}
                    />
                    <p className="muted">Sube imágenes (se guardan como data URL) o pega URLs externas.</p>
                  </label>
                  <label>
                    Características (una por línea)
                    <textarea
                      value={productForm.features}
                      onChange={(event) => setProductForm({ ...productForm, features: event.target.value })}
                    />
                  </label>
                  <label>
                    Destacados (una por línea)
                    <textarea
                      value={productForm.highlights}
                      onChange={(event) => setProductForm({ ...productForm, highlights: event.target.value })}
                    />
                  </label>
                  <label>
                    Tags (separados por coma o salto de línea)
                    <textarea
                      value={productForm.tags}
                      onChange={(event) => setProductForm({ ...productForm, tags: event.target.value })}
                    />
                  </label>
                  <div className="form__actions">
                    <button type="submit" className="btn btn--primary">
                      {editingProductId ? 'Actualizar producto' : 'Crear producto'}
                    </button>
                    <button type="button" className="btn btn--ghost" onClick={resetProductForm}>
                      Limpiar
                    </button>
                  </div>
                </form>
              </div>
              <div>
                <h3>Listado ({products.length})</h3>
                <ul className="list">
                  {products.map((product) => (
                    <li key={product.id} className="list__item">
                      <div>
                        <strong>{product.name}</strong> <span className="badge badge--muted">{product.category}</span>{' '}
                        <span className="muted">Stock: {product.stock}</span>
                      </div>
                      <div className="list__actions">
                        <button type="button" className="btn btn--ghost" onClick={() => startEditProduct(product)}>
                          Editar
                        </button>
                        <button type="button" className="btn btn--link" onClick={() => handleDeleteProduct(product.id)}>
                          Eliminar
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="section section--light">
        <div className="container">
          <h3>Anuncio activo</h3>
          {activeAnnouncements.length === 0 && <p className="muted">No hay anuncios activos.</p>}
          {activeAnnouncements.map((announcement) => (
            <div key={announcement.id} className="card">
              <p className="badge badge--muted">{announcement.badge || 'Destacado'}</p>
              <h4>{announcement.title}</h4>
              <p>{announcement.description}</p>
              {announcement.ctaUrl && (
                <p className="muted">
                  CTA: {announcement.ctaLabel || 'Ver más'} → {announcement.ctaUrl}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export default AdminPage
