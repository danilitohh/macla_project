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
const sanitizeText = (value = '') => String(value).trim()
const parseJsonSafe = (value) => {
  if (!value) {
    return null
  }
  try {
    const parsed = JSON.parse(value)
    if (parsed && typeof parsed === 'object') {
      return parsed
    }
    return null
  } catch (_error) {
    return null
  }
}
const normalizeProductSnapshot = (snapshot, { id, name, unitPrice }) => {
  const normalizedId = snapshot?.id || id || null
  const normalizedName = snapshot?.name || name || (normalizedId ? `Producto ${normalizedId}` : 'Producto')
  const normalizedPrice = safeInteger(snapshot?.price, unitPrice)
  return {
    ...(snapshot && typeof snapshot === 'object' ? snapshot : {}),
    id: normalizedId || (typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `product-${Date.now()}`),
    name: normalizedName,
    price: normalizedPrice,
    currency: snapshot?.currency || 'COP'
  }
}
const generateOrderCode = () => {
  const random = crypto.randomBytes(4).toString('hex').toUpperCase()
  return `MAC-${random.slice(0, 8)}`
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
  `,
  shippingOptionById: `
    SELECT id, label, description, price_cents
    FROM shipping_options
    WHERE id = ?
      AND is_active = 1
  `,
  paymentMethodById: `
    SELECT id, label, description
    FROM payment_methods
    WHERE id = ?
      AND is_active = 1
  `,
  insertOrder: `
    INSERT INTO orders (
      code,
      user_id,
      cart_id,
      customer_name,
      customer_email,
      customer_phone,
      customer_city,
      customer_address,
      customer_notes,
      payment_method_id,
      shipping_option_id,
      subtotal_cents,
      shipping_cost_cents,
      total_cents,
      currency,
      status,
      submitted_at,
      billing_address_json,
      shipping_address_json,
      metadata_json
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)
  `,
  insertOrderItem: `
    INSERT INTO order_items (
      order_id,
      product_id,
      product_name,
      product_sku,
      unit_price_cents,
      quantity,
      line_total_cents,
      product_snapshot_json
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `,
  insertOrderStatusHistory: `
    INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, note)
    VALUES (?, NULL, ?, ?, ?)
  `,
  markCartSubmitted: `
    UPDATE shopping_carts
    SET status = ?, submitted_at = ?, updated_at = ?, last_activity_at = ?
    WHERE id = ?
  `,
  ordersByUser: `
    SELECT
      o.id,
      o.code,
      o.status,
      o.subtotal_cents,
      o.shipping_cost_cents,
      o.total_cents,
      o.currency,
      o.submitted_at,
      o.customer_name,
      o.customer_city,
      o.customer_notes,
      o.payment_method_id,
      pm.label AS payment_method_label,
      o.shipping_option_id,
      so.label AS shipping_option_label,
      so.price_cents AS shipping_option_price
    FROM orders o
    LEFT JOIN payment_methods pm ON o.payment_method_id = pm.id
    LEFT JOIN shipping_options so ON o.shipping_option_id = so.id
    WHERE o.user_id = ?
    ORDER BY o.submitted_at DESC, o.id DESC
    LIMIT ?
  `,
  orderItemsByOrderId: `
    SELECT
      id,
      order_id,
      product_id,
      product_name,
      product_sku,
      unit_price_cents,
      quantity,
      line_total_cents,
      product_snapshot_json
    FROM order_items
    WHERE order_id = ?
    ORDER BY id
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

app.post('/api/orders', requireAuth, async (req, res, next) => {
  const payload = req.body || {}
  const customer = payload.customer || {}
  const shippingOptionIdRaw = payload.shippingOptionId || payload.shippingOption?.id || ''
  const paymentMethodIdRaw = payload.paymentMethodId || payload.paymentMethod?.id || ''
  const shippingOptionId = sanitizeText(shippingOptionIdRaw) || null
  const paymentMethodId = sanitizeText(paymentMethodIdRaw) || null

  const customerName = sanitizeName(customer.name)
  const customerEmail = normalizeEmail(customer.email)
  const customerPhone = sanitizeText(customer.phone)
  const customerCity = sanitizeText(customer.city)
  const customerAddress = sanitizeText(customer.address)
  const customerNotesRaw = sanitizeText(customer.notes || '')
  const customerNotes = customerNotesRaw.length > 0 ? customerNotesRaw : null

  if (!customerName) {
    return res.status(400).json({ message: 'El nombre es obligatorio.' })
  }
  if (!customerEmail || !customerEmail.includes('@')) {
    return res.status(400).json({ message: 'Debes ingresar un correo válido.' })
  }
  if (!customerPhone) {
    return res.status(400).json({ message: 'Debes ingresar un teléfono de contacto.' })
  }
  if (!customerCity) {
    return res.status(400).json({ message: 'Debes indicar la ciudad para el envío.' })
  }
  if (!customerAddress) {
    return res.status(400).json({ message: 'Debes indicar la dirección de entrega.' })
  }

  const pool = getPool()
  const connection = await pool.getConnection()

  try {
    await connection.beginTransaction()

    const now = new Date()
    const nowSql = formatDateForSql(now)
    const shippingAddressPayload = {
      name: customerName,
      phone: customerPhone,
      city: customerCity,
      address: customerAddress,
      notes: customerNotes || undefined
    }
    const metadata = {
      origin: 'checkout-web',
      submittedAt: now.toISOString()
    }

    let cartId = null
    let cartItemsForResponse = []
    let orderItemsForInsert = []
    let subtotalCents = 0

    const [cartRows] = await connection.execute(SQL.findActiveCart, [req.userId])
    const cart = cartRows[0]
    if (cart) {
      cartId = cart.id
      const [itemRows] = await connection.execute(SQL.selectCartItems, [cart.id])

      for (const row of itemRows) {
        const quantity = safeInteger(row.quantity, 0)
        if (quantity <= 0) {
          // eslint-disable-next-line no-continue
          continue
        }
        const unitPrice = safeInteger(row.unit_price_cents, 0)
        const lineTotal = safeInteger(row.line_total_cents, unitPrice * quantity)
        const snapshot = parseJsonSafe(row.product_snapshot_json)
        const productId = row.product_id || (snapshot?.id ? String(snapshot.id) : null)
        const productName = snapshot?.name || snapshot?.title || (productId ? `Producto ${productId}` : 'Producto')
        const productSku = snapshot?.sku || productId || null
        const snapshotJson = snapshot ? JSON.stringify(snapshot) : row.product_snapshot_json

        subtotalCents += lineTotal

        orderItemsForInsert.push({
          productId,
          productName,
          productSku,
          unitPrice,
          quantity,
          lineTotal,
          snapshotJson
        })

        const productDescriptor = normalizeProductSnapshot(snapshot, {
          id: productId,
          name: productName,
          unitPrice
        })

        cartItemsForResponse.push({
          product: productDescriptor,
          quantity,
          unitPrice,
          lineTotal
        })
      }
    }

    if (orderItemsForInsert.length === 0) {
      const payloadItems = Array.isArray(payload.items) ? payload.items : []
      payloadItems.forEach((item) => {
        const quantity = safeInteger(item?.quantity, 0)
        if (quantity <= 0) {
          return
        }
        const product = item?.product || null
        const snapshot = product && typeof product === 'object' ? product : null
        const unitPrice = safeInteger(product?.price, 0)
        const lineTotal = unitPrice * quantity
        if (unitPrice < 0) {
          return
        }
        const productId = product?.id ? String(product.id) : null
        const productName = sanitizeText(product?.name || '') || (productId ? `Producto ${productId}` : 'Producto')
        const productSku = product?.sku || productId || null
        const snapshotJson = snapshot ? JSON.stringify(snapshot) : null

        subtotalCents += lineTotal

        orderItemsForInsert.push({
          productId,
          productName,
          productSku,
          unitPrice,
          quantity,
          lineTotal,
          snapshotJson
        })

        const productDescriptor = normalizeProductSnapshot(snapshot, {
          id: productId,
          name: productName,
          unitPrice
        })

        cartItemsForResponse.push({
          product: productDescriptor,
          quantity,
          unitPrice,
          lineTotal
        })
      })
    }

    if (orderItemsForInsert.length === 0 || subtotalCents <= 0) {
      await connection.rollback()
      return res.status(400).json({ message: 'Tu carrito está vacío o no pudimos procesar los productos.' })
    }

    let shippingOption = null
    let shippingCostCents = 0
    if (shippingOptionId) {
      const [shippingRows] = await connection.execute(SQL.shippingOptionById, [shippingOptionId])
      shippingOption = shippingRows[0]
      if (!shippingOption) {
        await connection.rollback()
        return res.status(400).json({ message: 'La opción de envío seleccionada no es válida.' })
      }
      shippingCostCents = safeInteger(shippingOption.price_cents, 0)
      metadata.shippingOptionLabel = shippingOption.label
    }

    let paymentMethod = null
    if (paymentMethodId) {
      const [paymentRows] = await connection.execute(SQL.paymentMethodById, [paymentMethodId])
      paymentMethod = paymentRows[0]
      if (!paymentMethod) {
        await connection.rollback()
        return res.status(400).json({ message: 'El método de pago seleccionado no es válido.' })
      }
      metadata.paymentMethodLabel = paymentMethod.label
    }

    const totalCents = subtotalCents + shippingCostCents
    metadata.itemsCount = orderItemsForInsert.length

    const shippingAddressJson = JSON.stringify(shippingAddressPayload)
    const metadataJson = JSON.stringify(metadata)

    let orderId = null
    let orderCode = null
    const maxAttempts = 5
    let attempts = 0
    // eslint-disable-next-line no-constant-condition
    while (attempts < maxAttempts) {
      attempts += 1
      orderCode = generateOrderCode()
      try {
        const [orderResult] = await connection.execute(SQL.insertOrder, [
          orderCode,
          req.userId,
          cartId,
          customerName,
          customerEmail,
          customerPhone,
          customerCity,
          customerAddress,
          customerNotes,
          paymentMethodId,
          shippingOptionId,
          subtotalCents,
          shippingCostCents,
          totalCents,
          'COP',
          nowSql,
          null,
          shippingAddressJson,
          metadataJson
        ])
        orderId = orderResult.insertId
        break
      } catch (error) {
        if (error && error.code === 'ER_DUP_ENTRY' && attempts < maxAttempts) {
          continue
        }
        throw error
      }
    }

    if (!orderId) {
      throw new Error('No pudimos generar el pedido. Intenta nuevamente.')
    }

    for (const item of orderItemsForInsert) {
      // eslint-disable-next-line no-await-in-loop
      await connection.execute(SQL.insertOrderItem, [
        orderId,
        item.productId,
        item.productName,
        item.productSku,
        item.unitPrice,
        item.quantity,
        item.lineTotal,
        item.snapshotJson
      ])
    }

    await connection.execute(SQL.insertOrderStatusHistory, [
      orderId,
      'pending',
      'system',
      'Orden creada desde el checkout web.'
    ])

    if (cartId) {
      await connection.execute(SQL.markCartSubmitted, ['submitted', nowSql, nowSql, nowSql, cartId])
    }

    await connection.commit()

    return res.status(201).json({
      order: {
        id: orderId,
        code: orderCode,
        status: 'pending',
        subtotal: subtotalCents,
        shippingCost: shippingCostCents,
        total: totalCents,
        currency: 'COP',
        submittedAt: now.toISOString(),
        customerName,
        customerCity,
        notes: customerNotes,
        paymentMethod: paymentMethod
          ? { id: paymentMethod.id, label: paymentMethod.label, description: paymentMethod.description || null }
          : null,
        shippingOption: shippingOption
          ? {
              id: shippingOption.id,
              label: shippingOption.label,
              description: shippingOption.description || null,
              price: safeInteger(shippingOption.price_cents, shippingCostCents)
            }
          : null,
        items: cartItemsForResponse
      }
    })
  } catch (error) {
    await connection.rollback()
    return next(error)
  } finally {
    connection.release()
  }
})

app.get('/api/orders', requireAuth, async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100)
    const [orderRows] = await query(SQL.ordersByUser, [req.userId, limit])

    if (orderRows.length === 0) {
      return res.json({ orders: [] })
    }

    const ordersWithItems = await Promise.all(
      orderRows.map(async (order) => {
        const [itemRows] = await query(SQL.orderItemsByOrderId, [order.id])
        const items = itemRows.map((row) => {
          const quantity = safeInteger(row.quantity, 0)
          const unitPrice = safeInteger(row.unit_price_cents, 0)
          const lineTotal = safeInteger(row.line_total_cents, unitPrice * quantity)
          const snapshot = parseJsonSafe(row.product_snapshot_json)
          const productId = row.product_id || (snapshot?.id ? String(snapshot.id) : null)
          const productName = snapshot?.name || row.product_name || (productId ? `Producto ${productId}` : 'Producto')
          const productDescriptor = normalizeProductSnapshot(snapshot, {
            id: productId,
            name: productName,
            unitPrice
          })

          return {
            product: productDescriptor,
            quantity,
            unitPrice,
            lineTotal
          }
        })

        return {
          id: order.id,
          code: order.code,
          status: order.status,
          subtotal: safeInteger(order.subtotal_cents, 0),
          shippingCost: safeInteger(order.shipping_cost_cents, 0),
          total: safeInteger(order.total_cents, 0),
          currency: order.currency || 'COP',
          submittedAt: order.submitted_at ? new Date(order.submitted_at).toISOString() : null,
          customerName: order.customer_name,
          customerCity: order.customer_city,
          notes: order.customer_notes || null,
          paymentMethod: order.payment_method_id
            ? {
                id: order.payment_method_id,
                label: order.payment_method_label || order.payment_method_id
              }
            : null,
          shippingOption: order.shipping_option_id
            ? {
                id: order.shipping_option_id,
                label: order.shipping_option_label || order.shipping_option_id,
                price: safeInteger(order.shipping_option_price, 0)
              }
            : null,
          items
        }
      })
    )

    return res.json({ orders: ordersWithItems })
  } catch (error) {
    return next(error)
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
