const path = require('path')
const fs = require('fs')

const envPath = path.join(__dirname, '.env')
require('dotenv').config(fs.existsSync(envPath) ? { path: envPath } : undefined)

const express = require('express')
const cors = require('cors')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const { initDatabase, query, getPool } = require('./db')
const { sendVerificationNotification } = require('./notifications')

const app = express()

const PORT = process.env.PORT || 4000
const JWT_SECRET = process.env.JWT_SECRET || 'macla-dev-secret'
const TOKEN_EXPIRATION = process.env.JWT_EXPIRATION || '7d'
const DEFAULT_ALLOWED_ORIGINS = ['http://localhost:5173', 'http://localhost:4000']
const CLIENT_DIST_PATH = path.join(__dirname, '..', 'dist')
const CLIENT_INDEX_PATH = path.join(CLIENT_DIST_PATH, 'index.html')

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

const DISCOUNT_CODES = {
  MACLA10: { type: 'percent', value: 10, minSubtotal: 60000, label: '10% en tu compra' },
  ENVIOFREE: { type: 'shipping', value: Number.MAX_SAFE_INTEGER, minSubtotal: 90000, label: 'Envío gratis' },
  VIP20: { type: 'percent', value: 20, maxCents: 60000, minSubtotal: 150000, label: 'VIP 20% OFF' }
}

const normalizeDiscountCode = (code = '') => String(code).trim().toUpperCase()

const calculateDiscount = ({ code, subtotalCents = 0, shippingCents = 0 }) => {
  const normalized = normalizeDiscountCode(code)
  const config = DISCOUNT_CODES[normalized]

  if (!config) {
    return {
      valid: false,
      code: normalized,
      discountCents: 0,
      shippingDiscountCents: 0,
      reason: 'Código no válido'
    }
  }

  if (config.minSubtotal && subtotalCents < config.minSubtotal) {
    return {
      valid: false,
      code: normalized,
      discountCents: 0,
      shippingDiscountCents: 0,
      reason: `Subtotal mínimo ${config.minSubtotal} requerido`
    }
  }

  let discountCents = 0
  let shippingDiscountCents = 0

  if (config.type === 'percent') {
    discountCents = Math.floor((subtotalCents * config.value) / 100)
    if (config.maxCents) {
      discountCents = Math.min(discountCents, config.maxCents)
    }
  } else if (config.type === 'flat') {
    discountCents = Math.min(config.value, subtotalCents)
  } else if (config.type === 'shipping') {
    shippingDiscountCents = Math.min(shippingCents || config.value, shippingCents || config.value)
  }

  discountCents = Math.max(0, Math.min(discountCents, subtotalCents))
  shippingDiscountCents = Math.max(0, shippingDiscountCents)

  return {
    valid: discountCents > 0 || shippingDiscountCents > 0,
    code: normalized,
    discountCents,
    shippingDiscountCents,
    label: config.label || normalized,
    type: config.type
  }
}

const TOKEN_CONFIG = {
  activation: Number(process.env.ACTIVATION_TOKEN_EXPIRES_MINUTES || 30),
  password_reset: Number(process.env.PASSWORD_RESET_TOKEN_EXPIRES_MINUTES || 15)
}

const hashToken = (value) => crypto.createHash('sha256').update(value).digest('hex')
const generateRawToken = () => crypto.randomBytes(32).toString('hex')
const generateNumericCode = () => {
  const code = Math.floor(100000 + Math.random() * 900000)
  return String(code)
}
const addMinutes = (date, minutes) => new Date(date.getTime() + minutes * 60000)
const sanitizePhone = (value = '') => String(value).replace(/[^\d+]/g, '').slice(0, 20)

const createVerificationToken = async ({ userId, type, channel = 'email', metadata = null }) => {
  const now = new Date()
  const expiresMinutes = TOKEN_CONFIG[type] && Number.isFinite(TOKEN_CONFIG[type]) ? TOKEN_CONFIG[type] : 15
  const expiresDate = addMinutes(now, expiresMinutes)
  const token = generateRawToken()
  const code = generateNumericCode()
  const tokenHash = hashToken(token)
  const payload = metadata ? JSON.stringify(metadata) : null
  const nowSql = formatDateForSql(now)
  const expiresSql = formatDateForSql(expiresDate)

  await query(SQL.invalidateTokensByType, [nowSql, nowSql, userId, type])
  await query(SQL.insertVerificationToken, [
    userId,
    type,
    tokenHash,
    code,
    channel,
    expiresSql,
    payload,
    nowSql,
    nowSql
  ])

  return {
    token,
    code,
    expiresAt: expiresDate.toISOString(),
    channel
  }
}

const validateVerificationToken = async ({ userId, type, token, code }) => {
  if (!token && !code) {
    return null
  }
  const now = new Date()
  const nowSql = formatDateForSql(now)
  const hashedToken = token ? hashToken(token) : null
  const [rows] = await query(SQL.findTokenForValidation, [
    userId,
    type,
    nowSql,
    hashedToken,
    token || null,
    code || null,
    code || null
  ])
  const record = rows[0]
  if (!record) {
    return null
  }
  await query(SQL.consumeTokenById, [nowSql, nowSql, record.id])
  return record
}

const SQL = {
  userByEmail:
    'SELECT id, name, email, password_hash, role, is_active, phone, city, address_line, email_verified_at FROM users WHERE email = ?',
  userByPhone:
    'SELECT id, name, email, password_hash, role, is_active, phone, city, address_line, email_verified_at FROM users WHERE phone = ?',
  userForAuth:
    'SELECT id, name, email, role, is_active, phone, city, address_line, email_verified_at FROM users WHERE id = ?',
  insertUser: `
    INSERT INTO users (
      id,
      name,
      email,
      password_hash,
      phone,
      city,
      address_line,
      email_verified_at,
      is_active,
      role,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
  updateUserLogin:
    'UPDATE users SET updated_at = ?, last_login_at = ?, is_active = 1, email_verified_at = COALESCE(email_verified_at, ?) WHERE id = ?',
  userProfileById:
    'SELECT id, name, email, role, phone, city, address_line, email_verified_at, created_at, updated_at FROM users WHERE id = ?',
  updateUserProfile: 'UPDATE users SET name = ?, phone = ?, city = ?, address_line = ?, updated_at = ? WHERE id = ?',
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
  userAddressesByUser: `
    SELECT id, label, contact_name, contact_phone, city, address_line, notes, is_default_shipping, is_default_billing
    FROM user_addresses
    WHERE user_id = ?
    ORDER BY is_default_shipping DESC, id DESC
  `,
  userAddressById: `
    SELECT id, user_id, label, contact_name, contact_phone, city, address_line, notes, is_default_shipping, is_default_billing
    FROM user_addresses
    WHERE id = ?
      AND user_id = ?
    LIMIT 1
  `,
  insertUserAddress: `
    INSERT INTO user_addresses (
      user_id,
      label,
      contact_name,
      contact_phone,
      city,
      address_line,
      notes,
      is_default_shipping,
      is_default_billing,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
  updateUserAddress: `
    UPDATE user_addresses
    SET
      label = ?,
      contact_name = ?,
      contact_phone = ?,
      city = ?,
      address_line = ?,
      notes = ?,
      is_default_shipping = ?,
      is_default_billing = ?,
      updated_at = ?
    WHERE id = ?
      AND user_id = ?
  `,
  clearDefaultShipping: 'UPDATE user_addresses SET is_default_shipping = 0 WHERE user_id = ?',
  clearDefaultBilling: 'UPDATE user_addresses SET is_default_billing = 0 WHERE user_id = ?',
  deleteUserAddress: 'DELETE FROM user_addresses WHERE id = ? AND user_id = ?',
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
      discount_cents,
      total_cents,
      currency,
      status,
      submitted_at,
      billing_address_json,
      shipping_address_json,
      metadata_json
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)
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
      o.discount_cents,
      o.total_cents,
      o.currency,
      o.submitted_at,
      o.metadata_json,
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
  `,
  insertVerificationToken: `
    INSERT INTO user_verification_tokens (
      user_id,
      type,
      token_hash,
      code,
      channel,
      expires_at,
      metadata_json,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
  invalidateTokensByType: `
    UPDATE user_verification_tokens
    SET consumed_at = ?, updated_at = ?
    WHERE user_id = ?
      AND type = ?
      AND consumed_at IS NULL
  `,
  findTokenForValidation: `
    SELECT *
    FROM user_verification_tokens
    WHERE user_id = ?
      AND type = ?
      AND consumed_at IS NULL
      AND expires_at > ?
      AND (
        (token_hash = ? AND ? IS NOT NULL)
        OR (code = ? AND ? IS NOT NULL)
      )
    ORDER BY created_at DESC
    LIMIT 1
  `,
  consumeTokenById: 'UPDATE user_verification_tokens SET consumed_at = ?, updated_at = ? WHERE id = ?',
  deleteExpiredTokens: 'DELETE FROM user_verification_tokens WHERE expires_at < ?'
}

const toUserDto = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  role: row.role || 'customer',
  phone: row.phone || null,
  city: row.city || null,
  address: row.address_line || null,
  emailVerified: Boolean(row.email_verified_at)
})

const toAddressDto = (row) => ({
  id: row.id,
  label: row.label,
  contactName: row.contact_name,
  contactPhone: row.contact_phone,
  city: row.city,
  address: row.address_line,
  notes: row.notes || null,
  isDefaultShipping: Boolean(row.is_default_shipping),
  isDefaultBilling: Boolean(row.is_default_billing)
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
    if (!user) {
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
    const phone = sanitizePhone(req.body.phone)
    const city = sanitizeText(req.body.city)
    const address = sanitizeText(req.body.address)

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

    const now = new Date()
    const nowSql = formatDateForSql(now)
    const passwordHash = bcrypt.hashSync(password, 10)
    const id =
      typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : crypto.randomBytes(16).toString('hex')

    await query(SQL.insertUser, [
      id,
      name,
      email,
      passwordHash,
      phone || null,
      city || null,
      address || null,
      nowSql,
      1,
      'customer',
      nowSql,
      nowSql
    ])

    const [profileRows] = await query(SQL.userProfileById, [id])
    const profile =
      profileRows[0] ||
      {
        id,
        name,
        email,
        role: 'customer',
        phone: phone || null,
        city: city || null,
        address_line: address || null,
        email_verified_at: nowSql
      }

    const jwtToken = issueToken(id)

    return res.status(201).json({
      token: jwtToken,
      user: toUserDto(profile),
      message: 'Tu cuenta fue creada. Ya puedes continuar navegando.'
    })
  } catch (error) {
    return next(error)
  }
})

app.post('/api/auth/activate', async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email)
    if (!email) {
      return res.status(400).json({ message: 'Debes indicar el correo de la cuenta.' })
    }

    const [userRows] = await query(SQL.userByEmail, [email])
    const user = userRows[0]
    if (!user) {
      return res.status(404).json({ message: 'No encontramos una cuenta con este correo.' })
    }

    const nowSql = formatDateForSql(new Date())
    if (user.is_active === 0 || !user.email_verified_at) {
      await query(
        'UPDATE users SET is_active = 1, email_verified_at = COALESCE(email_verified_at, ?), updated_at = ? WHERE id = ?',
        [nowSql, nowSql, user.id]
      )
    }

    return res.json({
      alreadyActive: true,
      message: 'La activación ya no es necesaria. Inicia sesión con tu correo y contraseña.'
    })
  } catch (error) {
    return next(error)
  }
})

app.post('/api/auth/resend-activation', async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email)
    if (!email) {
      return res.status(400).json({ message: 'Debes ingresar el correo registrado.' })
    }
    const [userRows] = await query(SQL.userByEmail, [email])
    const user = userRows[0]
    if (!user) {
      return res.json({ message: 'Si la cuenta existe, ya puede iniciar sesión sin códigos.' })
    }

    const nowSql = formatDateForSql(new Date())
    if (user.is_active === 0 || !user.email_verified_at) {
      await query(
        'UPDATE users SET is_active = 1, email_verified_at = COALESCE(email_verified_at, ?), updated_at = ? WHERE id = ?',
        [nowSql, nowSql, user.id]
      )
    }

    return res.json({
      message: 'La activación ya no es necesaria. Inicia sesión con tu correo y contraseña.'
    })
  } catch (error) {
    return next(error)
  }
})

app.post('/api/auth/recover', async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email || req.body.identifier || '')
    const phone = sanitizePhone(req.body.phone || req.body.identifier || '')
    const requestedChannel = String(req.body.channel || '').toLowerCase()

    if (!email && !phone) {
      return res.status(400).json({ message: 'Ingresa el correo o teléfono asociado a tu cuenta.' })
    }

    let user = null
    if (email) {
      const [rows] = await query(SQL.userByEmail, [email])
      user = rows[0] || null
    }
    if (!user && phone) {
      const [rows] = await query(SQL.userByPhone, [phone])
      user = rows[0] || null
    }

    if (!user) {
      return res.json({ message: 'Si encontramos tu cuenta, enviaremos instrucciones de recuperación.' })
    }

    const channel = requestedChannel === 'sms' && user.phone ? 'sms' : 'email'
    const resetToken = await createVerificationToken({
      userId: user.id,
      type: 'password_reset',
      channel,
      metadata: { email: user.email, phone: user.phone || null }
    })

    sendVerificationNotification({
      type: 'password_reset',
      code: resetToken.code,
      token: resetToken.token,
      email: user.email,
      phone: user.phone || null,
      channel
    }).catch((notifyError) => {
      console.error('[auth] Error enviando recuperación:', notifyError)
    })

    if (process.env.NODE_ENV !== 'production') {
      console.info('[auth] Recuperación solicitada', {
        email: user.email,
        channel,
        token: resetToken.token,
        code: resetToken.code
      })
    }

    return res.json({
      message: 'Si encontramos tu cuenta, enviamos los pasos para restablecer tu contraseña.',
      channel,
      debug: process.env.NODE_ENV === 'production' ? undefined : resetToken
    })
  } catch (error) {
    return next(error)
  }
})

app.post('/api/auth/reset-password', async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email)
    const token = String(req.body.token || '').trim() || null
    const code = String(req.body.code || '').trim() || null
    const password = String(req.body.password || '')

    if (!email || password.length < 6) {
      return res.status(400).json({ message: 'Debes ingresar correo y una contraseña válida (mínimo 6 caracteres).' })
    }
    if (!token && !code) {
      return res.status(400).json({ message: 'Ingresa el código o token recibido para continuar.' })
    }

    const [userRows] = await query(SQL.userByEmail, [email])
    const user = userRows[0]
    if (!user) {
      return res.status(404).json({ message: 'No encontramos una cuenta con este correo.' })
    }

    const verification = await validateVerificationToken({
      userId: user.id,
      type: 'password_reset',
      token,
      code
    })

    if (!verification) {
      return res.status(400).json({ message: 'El código ingresado no es válido o ya expiró.' })
    }

    const passwordHash = bcrypt.hashSync(password, 10)
    const nowSql = formatDateForSql(new Date())
    await query('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?', [passwordHash, nowSql, user.id])

    const [profileRows] = await query(SQL.userProfileById, [user.id])
    const profile = profileRows[0] || user
    const jwtToken = issueToken(user.id)
    return res.json({
      token: jwtToken,
      user: toUserDto(profile)
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

    const isValid = bcrypt.compareSync(password, user.password_hash)
    if (!isValid) {
      return res.status(401).json({ message: 'Credenciales inválidas.' })
    }

    const now = formatDateForSql(new Date())
    await query(SQL.updateUserLogin, [now, now, now, user.id])

    const token = issueToken(user.id)
    return res.json({
      token,
      user: toUserDto({ ...user, email_verified_at: user.email_verified_at || now, is_active: 1 })
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

app.put('/api/profile', requireAuth, async (req, res, next) => {
  try {
    const name = sanitizeName(req.body.name)
    const phone = sanitizePhone(req.body.phone)
    const city = sanitizeText(req.body.city)
    const address = sanitizeText(req.body.address)

    if (!name) {
      return res.status(400).json({ message: 'El nombre es obligatorio.' })
    }

    const nowSql = formatDateForSql(new Date())
    await query(SQL.updateUserProfile, [name, phone || null, city || null, address || null, nowSql, req.userId])

    const [rows] = await query(SQL.userProfileById, [req.userId])
    const user = rows[0]
    return res.json({ user: toUserDto(user) })
  } catch (error) {
    return next(error)
  }
})

app.get('/api/addresses', requireAuth, async (req, res, next) => {
  try {
    const [rows] = await query(SQL.userAddressesByUser, [req.userId])
    const addresses = rows.map(toAddressDto)
    return res.json({ addresses })
  } catch (error) {
    return next(error)
  }
})

app.post('/api/addresses', requireAuth, async (req, res, next) => {
  try {
    const payload = req.body || {}
    const label = sanitizeText(payload.label || 'Mi dirección')
    const contactName = sanitizeName(payload.contactName || req.authUser?.name)
    const contactPhone = sanitizePhone(payload.contactPhone || req.authUser?.phone)
    const city = sanitizeText(payload.city || req.authUser?.city)
    const address = sanitizeText(payload.address)
    const notes = sanitizeText(payload.notes || '')
    const isDefaultShipping = Boolean(payload.isDefaultShipping)
    const isDefaultBilling = Boolean(payload.isDefaultBilling)

    if (!label || !contactName || !contactPhone || !city || !address) {
      return res.status(400).json({ message: 'Completa nombre, teléfono, ciudad y dirección para guardar.' })
    }

    const nowSql = formatDateForSql(new Date())

    if (isDefaultShipping) {
      await query(SQL.clearDefaultShipping, [req.userId])
    }
    if (isDefaultBilling) {
      await query(SQL.clearDefaultBilling, [req.userId])
    }

    const [result] = await query(SQL.insertUserAddress, [
      req.userId,
      label,
      contactName,
      contactPhone,
      city,
      address,
      notes || null,
      isDefaultShipping ? 1 : 0,
      isDefaultBilling ? 1 : 0,
      nowSql,
      nowSql
    ])

    const [rows] = await query(SQL.userAddressById, [result.insertId, req.userId])
    const created = rows[0]
    return res.status(201).json({ address: created ? toAddressDto(created) : null })
  } catch (error) {
    return next(error)
  }
})

app.put('/api/addresses/:id', requireAuth, async (req, res, next) => {
  try {
    const addressId = safeInteger(req.params.id, 0)
    const [existingRows] = await query(SQL.userAddressById, [addressId, req.userId])
    const existing = existingRows[0]
    if (!existing) {
      return res.status(404).json({ message: 'Dirección no encontrada.' })
    }

    const payload = req.body || {}
    const label = sanitizeText(payload.label || existing.label)
    const contactName = sanitizeName(payload.contactName || existing.contact_name)
    const contactPhone = sanitizePhone(payload.contactPhone || existing.contact_phone)
    const city = sanitizeText(payload.city || existing.city)
    const address = sanitizeText(payload.address || existing.address_line)
    const notes = sanitizeText(payload.notes || existing.notes || '')
    const isDefaultShipping = payload.isDefaultShipping ? 1 : existing.is_default_shipping
    const isDefaultBilling = payload.isDefaultBilling ? 1 : existing.is_default_billing

    if (!label || !contactName || !contactPhone || !city || !address) {
      return res.status(400).json({ message: 'Completa nombre, teléfono, ciudad y dirección para guardar.' })
    }

    if (isDefaultShipping) {
      await query(SQL.clearDefaultShipping, [req.userId])
    }
    if (isDefaultBilling) {
      await query(SQL.clearDefaultBilling, [req.userId])
    }

    const nowSql = formatDateForSql(new Date())
    await query(SQL.updateUserAddress, [
      label,
      contactName,
      contactPhone,
      city,
      address,
      notes || null,
      isDefaultShipping ? 1 : 0,
      isDefaultBilling ? 1 : 0,
      nowSql,
      addressId,
      req.userId
    ])

    const [rows] = await query(SQL.userAddressById, [addressId, req.userId])
    const updated = rows[0]
    return res.json({ address: updated ? toAddressDto(updated) : null })
  } catch (error) {
    return next(error)
  }
})

app.delete('/api/addresses/:id', requireAuth, async (req, res, next) => {
  try {
    const addressId = safeInteger(req.params.id, 0)
    await query(SQL.deleteUserAddress, [addressId, req.userId])
    return res.status(204).send()
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

app.post('/api/discounts/validate', requireAuth, async (req, res) => {
  const subtotalCents = safeInteger(req.body?.subtotalCents, 0)
  const shippingCents = safeInteger(req.body?.shippingCents, 0)
  const code = normalizeDiscountCode(req.body?.code || req.body?.discountCode || '')

  if (!code) {
    return res.status(400).json({ message: 'Ingresa un código para validarlo.' })
  }

  const result = calculateDiscount({ code, subtotalCents, shippingCents })
  if (!result.valid) {
    return res.status(400).json({ message: 'El código no es válido para este pedido.' })
  }

  const totalDiscountCents = result.discountCents + result.shippingDiscountCents
  const adjustedShipping = Math.max(0, shippingCents - result.shippingDiscountCents)
  const estimatedTotal = Math.max(0, subtotalCents - result.discountCents + adjustedShipping)

  return res.json({
    code: result.code,
    discount: totalDiscountCents,
    breakdown: {
      products: result.discountCents,
      shipping: result.shippingDiscountCents
    },
    label: result.label,
    estimatedTotal
  })
})

app.post('/api/orders', requireAuth, async (req, res, next) => {
  const payload = req.body || {}
  const customer = payload.customer || {}
  const shippingOptionIdRaw = payload.shippingOptionId || payload.shippingOption?.id || ''
  const paymentMethodIdRaw = payload.paymentMethodId || payload.paymentMethod?.id || ''
  const shippingOptionId = sanitizeText(shippingOptionIdRaw) || null
  const paymentMethodId = sanitizeText(paymentMethodIdRaw) || null
  const discountCodeRaw = sanitizeText(payload.discountCode || payload.coupon || '')
  const discountCode = normalizeDiscountCode(discountCodeRaw)
  const addressId = safeInteger(payload.addressId, 0)

  const customerEmail = normalizeEmail(customer.email)

  if (!customerEmail || !customerEmail.includes('@')) {
    return res.status(400).json({ message: 'Debes ingresar un correo válido.' })
  }

  let addressRecord = null
  if (addressId > 0) {
    const [addressRows] = await query(SQL.userAddressById, [addressId, req.userId])
    addressRecord = addressRows[0] || null
    if (!addressRecord) {
      return res.status(404).json({ message: 'La dirección seleccionada no existe.' })
    }
  }

  const customerName = sanitizeName(customer.name || addressRecord?.contact_name)
  const customerPhone = sanitizeText(customer.phone || addressRecord?.contact_phone)
  const customerCity = sanitizeText(customer.city || addressRecord?.city)
  const customerAddress = sanitizeText(customer.address || addressRecord?.address_line)
  const customerNotesRaw = sanitizeText(customer.notes || addressRecord?.notes || '')
  const customerNotes = customerNotesRaw.length > 0 ? customerNotesRaw : null

  if (!customerName) {
    return res.status(400).json({ message: 'El nombre es obligatorio.' })
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
    const shippingAddressPayload = addressRecord
      ? {
          id: addressRecord.id,
          label: addressRecord.label,
          name: addressRecord.contact_name,
          phone: addressRecord.contact_phone,
          city: addressRecord.city,
          address: addressRecord.address_line,
          notes: addressRecord.notes || undefined
        }
      : {
          name: customerName,
          phone: customerPhone,
          city: customerCity,
          address: customerAddress,
          notes: customerNotes || undefined
        }
    const metadata = {
      origin: 'checkout-web',
      submittedAt: now.toISOString(),
      addressId: addressRecord?.id || null
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

    let discountDetails = {
      discountCents: 0,
      shippingDiscountCents: 0,
      code: null,
      label: null
    }

    if (discountCode) {
      const calc = calculateDiscount({ code: discountCode, subtotalCents, shippingCents: shippingCostCents })
      if (!calc.valid) {
        await connection.rollback()
        return res.status(400).json({ message: 'El código de descuento no es válido o no aplica al pedido.' })
      }
      discountDetails = calc
      metadata.discount = {
        code: calc.code,
        label: calc.label,
        products: calc.discountCents,
        shipping: calc.shippingDiscountCents
      }
    }

    const shippingCostFinalCents = Math.max(0, shippingCostCents - discountDetails.shippingDiscountCents)
    const totalDiscountCents = discountDetails.discountCents + (shippingCostCents - shippingCostFinalCents)
    const totalCents = Math.max(0, subtotalCents - discountDetails.discountCents + shippingCostFinalCents)
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
          shippingCostFinalCents,
          totalDiscountCents,
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
        shippingCost: shippingCostFinalCents,
        discount: totalDiscountCents,
        discountCode: discountDetails.code,
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

        const metadata = parseJsonSafe(order.metadata_json) || {}

        return {
          id: order.id,
          code: order.code,
          status: order.status,
          subtotal: safeInteger(order.subtotal_cents, 0),
          shippingCost: safeInteger(order.shipping_cost_cents, 0),
          discount: safeInteger(order.discount_cents, 0),
          discountCode: metadata?.discount?.code || null,
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

let canServeClient = false
try {
  canServeClient = fs.existsSync(CLIENT_DIST_PATH) && fs.existsSync(CLIENT_INDEX_PATH)
} catch (_error) {
  canServeClient = false
}

if (canServeClient) {
  app.use(express.static(CLIENT_DIST_PATH))
  app.get(/^(?!\/api).*$/, (req, res, next) => {
    if (req.method.toUpperCase() !== 'GET') {
      return next()
    }
    return res.sendFile(CLIENT_INDEX_PATH)
  })
} else {
  console.warn(
    `[server] Build de frontend no encontrado en ${CLIENT_DIST_PATH}. Ejecuta "npm run build" en la raíz para servir la app desde Express.`
  )
}

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
