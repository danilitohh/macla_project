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
  name: string
  description: string
  category: Category
  price: string
  stock: string
  images: string
  features: string
  highlights: string
}

const defaultProductForm: ProductFormState = {
  name: '',
  description: '',
  category: categories[0]?.id || 'planchas',
  price: '0',
  stock: '0',
  images: '',
  features: '',
  highlights: ''
}

const defaultAnnouncementForm: Record<string, string> = {
  title: '',
  description: '',
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
      const description = productForm.description.trim()
      const shortDescription = description.slice(0, 140) || description || productForm.name.trim()
      const generatedId = productForm.name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-_]+/g, '-')
        .replace(/^-+|-+$/g, '')

      const payload: Partial<Product> = {
        id: editingProductId || generatedId,
        name: productForm.name.trim(),
        shortDescription,
        description,
        category: productForm.category,
        price: Number(productForm.price) || 0,
        stock: Number(productForm.stock) || 0,
        currency: 'COP',
        images: asList(productForm.images),
        features: asList(productForm.features),
        highlights: asList(productForm.highlights),
        tags: [],
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
        id: editingAnnouncementId || announcementForm.title.toLowerCase().replace(/[^a-z0-9-_]+/g, '-').replace(/^-+|-+$/g, ''),
        title: announcementForm.title.trim(),
        description: announcementForm.description.trim(),
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
      name: product.name,
      description: product.description,
      category: product.category,
      price: String(product.price),
      stock: String(product.stock),
      images: product.images.join('\n'),
      features: toMultiline(product.features),
      highlights: toMultiline(product.highlights)
    })
  }

  const startEditAnnouncement = (announcement: Announcement) => {
    setEditingAnnouncementId(announcement.id)
    setAnnouncementForm({
      title: announcement.title,
      description: announcement.description,
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
          <p className="muted">
            Carga imágenes desde tu equipo (se guardan como data URL) y define el destino del botón en cada anuncio.
          </p>
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
              <div className="card card--form">
                <h3>{editingAnnouncementId ? 'Editar anuncio' : 'Crear anuncio'}</h3>
                <form className="form" onSubmit={handleAnnouncementSubmit}>
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
                      placeholder="https://destino.com o /ruta-interna"
                    />
                    <p className="muted">Define a dónde lleva el botón (URL externa o ruta interna de la tienda).</p>
                  </label>
                  <label>
                    Imagen
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
                    <p className="muted">Sube una imagen (se guarda como data URL en el anuncio).</p>
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
                  <div className="form__row">
                    <label className="form__row-item">
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
                    <label className="form__row-item">
                      Precio (COP)
                      <input
                        type="number"
                        value={productForm.price}
                        onChange={(event) => setProductForm({ ...productForm, price: event.target.value })}
                      />
                    </label>
                    <label className="form__row-item">
                      Stock
                      <input
                        type="number"
                        value={productForm.stock}
                        onChange={(event) => setProductForm({ ...productForm, stock: event.target.value })}
                      />
                    </label>
                  </div>
                  <label>
                    Imágenes
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={async (event) => {
                        const urls = await readFilesAsDataUrls(event.target.files)
                        if (!urls.length) return
                        setProductForm((prev) => ({
                          ...prev,
                          images: urls.join('\n')
                        }))
                        event.target.value = ''
                      }}
                    />
                    <p className="muted">Sube imágenes (se guardan como data URL en el producto).</p>
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
              <div className="card">
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
