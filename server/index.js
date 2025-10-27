require('dotenv').config()

const express = require('express')
const cors = require('cors')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const { initDatabase, query, getPool } = require('./db')

const app = express()

const PORT = process.env.PORT || 4000
const JWT_SECRET = process.env.JWT_SECRET || 'macla-dev-secret'
const TOKEN_EXPIRATION = process.env.JWT_EXPIRATION || '7d'
const DEFAULT_ALLOWED_ORIGINS = ['http://localhost:5173']

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim())
  : DEFAULT_ALLOWED_ORIGINS

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, origin)
      } else {
        callback(new Error('Not allowed by CORS'))
      }
    },
    credentials: true
  })
)
app.use(express.json({ limit: '2mb' }))

const normalizeEmail = (email = '') => String(email).trim().toLowerCase()
const sanitizeName = (name = '') => String(name).trim()
const formatDateForSql = (date = new Date()) => date.toISOString().slice(0, 19).replace('T', ' ')
const safeInteger = (value, fallback = 0) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(0, Math.trunc(parsed))
}

const SQL = {
  userByEmail: 'SELECT id, name, email, password_hash, role, is_active FROM users WHERE email = ?',
  userForAuth: 'SELECT id, name, email, role, is_active FROM users WHERE id = ?',
  insertUser:
    "INSERT INTO users (id, name, email, password_hash, is_active, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  updateUserLogin: 'UPDATE users SET updated_at = ?, last_login_at = ? WHERE id = ?',
  userProfileById: 'SELECT id, name, email, role, created_at, updated_at FROM users WHERE id = ?',
  findActiveCart: `
    SELECT id, status, total_items, total_cents, currency
    FROM shopping_carts
    WHERE user_id = ?
      AND status = 'active'
    ORDER BY updated_at DESC
    LIMIT 1
  `,
  cartById: `
    SELECT sc.id, sc.user_id, sc.status, sc.total_items, sc.total_cents, sc.currency,
           sc.created_at, sc.updated_at, sc.last_activity_at, sc.submitted_at,
           u.email AS user_email, u.name AS user_name
    FROM shopping_carts sc
    JOIN users u ON sc.user_id = u.id
    WHERE sc.id = ?
  `,
  createCart: `
    INSERT INTO shopping_carts (id, user_id, status, total_items, total_cents, currency, created_at, updated_at, last_activity_at)
    VALUES (?, ?, 'active', 0, 0, ?, ?, ?, ?)
  `,
  updateCartSummary: `
    UPDATE shopping_carts
    SET total_items = ?, total_cents = ?, currency = ?, status = 'active', updated_at = ?, last_activity_at = ?
    WHERE id = ?
  `,
  deactivateOtherCarts: `
    UPDATE shopping_carts
    SET status = 'abandoned', updated_at = ?, last_activity_at = ?
    WHERE user_id = ?
      AND status = 'active'
      AND id <> ?
  `,
  deleteCartItems: 'DELETE FROM shopping_cart_items WHERE cart_id = ?',
  insertCartItem: `
    INSERT INTO shopping_cart_items (cart_id, product_id, product_snapshot_json, quantity, unit_price_cents, line_total_cents, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `,
  selectCartItems: `
    SELECT id, product_snapshot_json, product_id, quantity, unit_price_cents, line_total_cents
    FROM shopping_cart_items
    WHERE cart_id = ?
    ORDER BY id
  `,
  touchCart: 'UPDATE shopping_carts SET last_activity_at = ?, updated_at = ? WHERE id = ?',
  countUsers: 'SELECT COUNT(*) AS total_users FROM users',
  countOrders: 'SELECT COUNT(*) AS total_orders FROM orders',
  countActiveCarts: "SELECT COUNT(*) AS active_carts FROM shopping_carts WHERE status = 'active'",
  countAbandonedCarts: "SELECT COUNT(*) AS abandoned_carts FROM shopping_carts WHERE status = 'abandoned'",
  recentCarts: `
    SELECT sc.id, sc.user_id, sc.status, sc.total_items, sc.total_cents, sc.currency,
           sc.updated_at, sc.last_activity_at, u.email AS user_email, u.name AS user_name
    FROM shopping_carts sc
    JOIN users u ON sc.user_id = u.id
    ORDER BY sc.updated_at DESC
    LIMIT 20
  `
}

const toUserDto = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  role: row.role || 'customer'
})

const issueToken = (userId) =>
  jwt.sign(
    {
      sub: userId
    },
    JWT_SECRET,
    {
      expiresIn: TOKEN_EXPIRATION
    }
  )

const requireAuth = async (req, res, next) => {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null

  if (!token) {
    return res.status(401).json({ message: 'No autorizado' })
  }

  let payload
  try {
    payload = jwt.verify(token, JWT_SECRET)
  } catch (_error) {
    return res.status(401).json({ message: 'Token inválido' })
  }

  try {
    const [rows] = await query(SQL.userForAuth, [payload.sub])
    const user = rows[0]
    if (!user || user.is_active === 0) {
      return res.status(401).json({ message: 'No autorizado' })
    }

    req.userId = user.id
    req.authUser = user
    return next()
  } catch (error) {
    return next(error)
  }
}

const requireAdmin = (req, res, next) => {
  if (req.authUser && req.authUser.role === 'admin') {
    return next()
  }
  return res.status(403).json({ message: 'No autorizado' })
}

const mapCartItemRows = (rows) =>
  rows
    .map((row) => {
      let product = null
      if (row.product_snapshot_json) {
        try {
          product = JSON.parse(row.product_snapshot_json)
        } catch (_error) {
          product = null
        }
      }

      if (!product && row.product_id) {
        product = { id: row.product_id }
      }

      if (!product) {
        return null
      }

      return {
        product,
        quantity: safeInteger(row.quantity, 0),
        unitPrice: safeInteger(row.unit_price_cents, 0),
        lineTotal: safeInteger(row.line_total_cents, 0)
      }
    })
    .filter(Boolean)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.post('/api/auth/register', async (req, res, next) => {
  try {
    const name = sanitizeName(req.body.name)
    const email = normalizeEmail(req.body.email)
    const password = String(req.body.password || '')

    if (!name) {
      return res.status(400).json({ message: 'El nombre es obligatorio.' })
    }
    if (!email || !email.includes('@')) {
      return res.status(400).json({ message: 'Debes ingresar un correo válido.' })
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres.' })
    }

    const [existingRows] = await query(SQL.userByEmail, [email])
    if (existingRows.length > 0) {
      return res.status(409).json({ message: 'Ya existe una cuenta registrada con este correo.' })
    }

    const now = formatDateForSql(new Date())
    const passwordHash = bcrypt.hashSync(password, 10)
    const id =
      typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : crypto.randomBytes(16).toString('hex')

    await query(SQL.insertUser, [id, name, email, passwordHash, 1, 'customer', now, now])

    const token = issueToken(id)
    return res.status(201).json({
      token,
      user: { id, name, email, role: 'customer' }
    })
  } catch (error) {
    return next(error)
  }
})

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email)
    const password = String(req.body.password || '')

    if (!email || !password) {
      return res.status(400).json({ message: 'Debes ingresar correo y contraseña.' })
    }

    const [userRows] = await query(SQL.userByEmail, [email])
    const user = userRows[0]
    if (!user) {
      return res.status(401).json({ message: 'Credenciales inválidas.' })
    }
    if (user.is_active === 0) {
      return res.status(403).json({ message: 'La cuenta está inactiva. Contacta al administrador.' })
    }

    const isValid = bcrypt.compareSync(password, user.password_hash)
    if (!isValid) {
      return res.status(401).json({ message: 'Credenciales inválidas.' })
    }

    const now = formatDateForSql(new Date())
    await query(SQL.updateUserLogin, [now, now, user.id])

    const token = issueToken(user.id)
    return res.json({
      token,
      user: toUserDto(user)
    })
  } catch (error) {
    return next(error)
  }
})

app.get('/api/auth/profile', requireAuth, async (req, res, next) => {
  try {
    const [rows] = await query(SQL.userProfileById, [req.userId])
    const user = rows[0]
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado.' })
    }
    return res.json({ user: toUserDto(user) })
  } catch (error) {
    return next(error)
  }
})

app.get('/api/cart', requireAuth, async (req, res, next) => {
  try {
    const [cartRows] = await query(SQL.findActiveCart, [req.userId])
    const cart = cartRows[0]
    if (!cart) {
      return res.json({ items: [] })
    }

    const [itemRows] = await query(SQL.selectCartItems, [cart.id])
    const items = mapCartItemRows(itemRows)

    const timestamp = formatDateForSql(new Date())
    await query(SQL.touchCart, [timestamp, timestamp, cart.id])

    return res.json({
      items,
      cartId: cart.id,
      status: cart.status,
      totalItems: cart.total_items,
      totalAmount: cart.total_cents,
      currency: cart.currency
    })
  } catch (error) {
    return next(error)
  }
})

app.put('/api/cart', requireAuth, async (req, res, next) => {
  const items = Array.isArray(req.body.items) ? req.body.items : []
  const pool = getPool()
  const connection = await pool.getConnection()

  try {
    await connection.beginTransaction()

    const nowString = formatDateForSql(new Date())
    const [existingRows] = await connection.execute(SQL.findActiveCart, [req.userId])
    let cartId
    let cartCurrency = items[0]?.product?.currency || 'COP'

    if (existingRows.length > 0) {
      cartId = existingRows[0].id
      cartCurrency = existingRows[0].currency || cartCurrency
    } else {
      cartId =
        typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : crypto.randomBytes(16).toString('hex')
      await connection.execute(SQL.createCart, [cartId, req.userId, cartCurrency, nowString, nowString, nowString])
    }

    await connection.execute(SQL.deleteCartItems, [cartId])

    let totalItems = 0
    let totalCents = 0

    for (const item of items) {
      const quantity = safeInteger(item?.quantity, 0)
      if (quantity <= 0) {
        // eslint-disable-next-line no-continue
        continue
      }

      const product = item?.product || null
      const productId = product?.id || null
      const snapshot = product ? JSON.stringify(product) : null
      const unitPrice = safeInteger(product?.price, 0)
      const lineTotal = unitPrice * quantity

      totalItems += quantity
      totalCents += lineTotal

      await connection.execute(SQL.insertCartItem, [
        cartId,
        productId,
        snapshot,
        quantity,
        unitPrice,
        lineTotal,
        nowString,
        nowString
      ])
    }

    await connection.execute(SQL.updateCartSummary, [
      totalItems,
      totalCents,
      cartCurrency,
      nowString,
      nowString,
      cartId
    ])

    await connection.execute(SQL.deactivateOtherCarts, [nowString, nowString, req.userId, cartId])

    await connection.commit()
    return res.status(204).send()
  } catch (error) {
    await connection.rollback()
    return next(error)
  } finally {
    connection.release()
  }
})

app.get('/api/admin/stats', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const [userRows] = await query(SQL.countUsers)
    const [orderRows] = await query(SQL.countOrders)
    const [activeCartRows] = await query(SQL.countActiveCarts)
    const [abandonedCartRows] = await query(SQL.countAbandonedCarts)
    const [recentCarts] = await query(SQL.recentCarts)

    res.json({
      totals: {
        users: userRows[0]?.total_users ?? 0,
        orders: orderRows[0]?.total_orders ?? 0,
        activeCarts: activeCartRows[0]?.active_carts ?? 0,
        abandonedCarts: abandonedCartRows[0]?.abandoned_carts ?? 0
      },
      recentCarts
    })
  } catch (error) {
    next(error)
  }
})

app.get('/api/admin/carts', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const allowedStatuses = new Set(['active', 'submitted', 'abandoned'])
    const status = String(req.query.status || '').toLowerCase()
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200)

    let sql = `
      SELECT sc.id, sc.user_id, sc.status, sc.total_items, sc.total_cents, sc.currency,
             sc.created_at, sc.updated_at, sc.last_activity_at, sc.submitted_at,
             u.email AS user_email, u.name AS user_name
      FROM shopping_carts sc
      JOIN users u ON sc.user_id = u.id
    `
    const params = []

    if (allowedStatuses.has(status)) {
      sql += ' WHERE sc.status = ?'
      params.push(status)
    }

    sql += ' ORDER BY sc.updated_at DESC LIMIT ?'
    params.push(limit)

    const [rows] = await query(sql, params)
    res.json({ carts: rows })
  } catch (error) {
    next(error)
  }
})

app.get('/api/admin/carts/:cartId', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const cartId = String(req.params.cartId || '').trim()
    if (!cartId) {
      return res.status(400).json({ message: 'CartId inválido.' })
    }

    const [cartRows] = await query(SQL.cartById, [cartId])
    const cart = cartRows[0]
    if (!cart) {
      return res.status(404).json({ message: 'Carrito no encontrado.' })
    }

    const [itemRows] = await query(SQL.selectCartItems, [cartId])
    const items = mapCartItemRows(itemRows)

    return res.json({ cart, items })
  } catch (error) {
    return next(error)
  }
})

app.use((err, _req, res, _next) => {
  console.error('[server] error:', err)
  res.status(500).json({ message: 'Ocurrió un error inesperado.' })
})

initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`API listening on http://localhost:${PORT}`)
    })
  })
  .catch((error) => {
    console.error('Failed to initialize database:', error)
    process.exit(1)
  })

module.exports = app
