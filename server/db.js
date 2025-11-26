const mysql = require('mysql2/promise')
const { categories, products, shippingOptions, paymentMethods } = require('./seed-data')

const {
  DB_HOST = 'localhost',
  DB_PORT = '3306',
  DB_USER = 'root',
  DB_PASSWORD = '',
  DB_NAME = 'macla_store',
  DB_CONNECTION_LIMIT = '10'
} = process.env

let pool

const ensurePool = () => {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initDatabase() first.')
  }
  return pool
}

const createDatabaseIfNeeded = async () => {
  const connection = await mysql.createConnection({
    host: DB_HOST,
    port: Number(DB_PORT),
    user: DB_USER,
    password: DB_PASSWORD
  })

  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  )

  await connection.end()
}

const columnExists = async (poolRef, table, column) => {
  const [rows] = await poolRef.query(
    `
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
      LIMIT 1
    `,
    [DB_NAME, table, column]
  )
  return rows.length > 0
}

const indexExists = async (poolRef, table, indexName) => {
  const [rows] = await poolRef.query(
    `
      SELECT 1
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = ?
        AND INDEX_NAME = ?
      LIMIT 1
    `,
    [DB_NAME, table, indexName]
  )
  return rows.length > 0
}

const constraintExists = async (poolRef, table, constraintName) => {
  const [rows] = await poolRef.query(
    `
      SELECT 1
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = ?
        AND CONSTRAINT_NAME = ?
      LIMIT 1
    `,
    [DB_NAME, table, constraintName]
  )
  return rows.length > 0
}

const createSchemaIfNeeded = async () => {
  const localPool = ensurePool()

  const schemaStatements = [
    `
      CREATE TABLE IF NOT EXISTS users (
        id CHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NULL,
        city VARCHAR(255) NULL,
        address_line TEXT NULL,
        email_verified_at DATETIME(3) NULL,
        created_at DATETIME(3) NOT NULL,
        updated_at DATETIME(3) NOT NULL,
        INDEX idx_users_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `,
    `
      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(64) PRIMARY KEY,
        label VARCHAR(255) NOT NULL,
        description TEXT NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `,
    `
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(64) PRIMARY KEY,
        category_id VARCHAR(64) NOT NULL,
        name VARCHAR(255) NOT NULL,
        short_description TEXT NOT NULL,
        description TEXT NOT NULL,
        price_cents INT UNSIGNED NOT NULL,
        currency CHAR(3) NOT NULL,
        stock INT UNSIGNED NOT NULL DEFAULT 0,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id)
          ON UPDATE CASCADE ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `,
    `
      CREATE TABLE IF NOT EXISTS product_images (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        product_id VARCHAR(64) NOT NULL,
        image_url TEXT NOT NULL,
        sort_order INT UNSIGNED NOT NULL DEFAULT 0,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        CONSTRAINT fk_product_images_product FOREIGN KEY (product_id) REFERENCES products(id)
          ON UPDATE CASCADE ON DELETE CASCADE,
        INDEX idx_product_images_product (product_id),
        INDEX idx_product_images_sort (product_id, sort_order)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `,
    `
      CREATE TABLE IF NOT EXISTS product_features (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        product_id VARCHAR(64) NOT NULL,
        feature_text TEXT NOT NULL,
        sort_order INT UNSIGNED NOT NULL DEFAULT 0,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        CONSTRAINT fk_product_features_product FOREIGN KEY (product_id) REFERENCES products(id)
          ON UPDATE CASCADE ON DELETE CASCADE,
        INDEX idx_product_features_product (product_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `,
    `
      CREATE TABLE IF NOT EXISTS product_highlights (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        product_id VARCHAR(64) NOT NULL,
        highlight_text TEXT NOT NULL,
        sort_order INT UNSIGNED NOT NULL DEFAULT 0,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        CONSTRAINT fk_product_highlights_product FOREIGN KEY (product_id) REFERENCES products(id)
          ON UPDATE CASCADE ON DELETE CASCADE,
        INDEX idx_product_highlights_product (product_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `,
    `
      CREATE TABLE IF NOT EXISTS product_specs (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        product_id VARCHAR(64) NOT NULL,
        spec_key VARCHAR(255) NOT NULL,
        spec_value VARCHAR(255) NOT NULL,
        sort_order INT UNSIGNED NOT NULL DEFAULT 0,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        CONSTRAINT fk_product_specs_product FOREIGN KEY (product_id) REFERENCES products(id)
          ON UPDATE CASCADE ON DELETE CASCADE,
        INDEX idx_product_specs_product (product_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `,
    `
      CREATE TABLE IF NOT EXISTS product_tags (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        product_id VARCHAR(64) NOT NULL,
        tag VARCHAR(64) NOT NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        CONSTRAINT fk_product_tags_product FOREIGN KEY (product_id) REFERENCES products(id)
          ON UPDATE CASCADE ON DELETE CASCADE,
        INDEX idx_product_tags_product (product_id),
        INDEX idx_product_tags_tag (tag)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `,
    `
      CREATE TABLE IF NOT EXISTS shipping_options (
        id VARCHAR(64) PRIMARY KEY,
        label VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        price_cents INT UNSIGNED NOT NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `,
    `
      CREATE TABLE IF NOT EXISTS shipping_regions (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        shipping_option_id VARCHAR(64) NOT NULL,
        region VARCHAR(255) NOT NULL,
        sort_order INT UNSIGNED NOT NULL DEFAULT 0,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        CONSTRAINT fk_shipping_regions_option FOREIGN KEY (shipping_option_id) REFERENCES shipping_options(id)
          ON UPDATE CASCADE ON DELETE CASCADE,
        INDEX idx_shipping_regions_option (shipping_option_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `,
    `
      CREATE TABLE IF NOT EXISTS payment_methods (
        id VARCHAR(64) PRIMARY KEY,
        label VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `,
    `
      CREATE TABLE IF NOT EXISTS user_addresses (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id CHAR(36) NOT NULL,
        label VARCHAR(120) NOT NULL,
        contact_name VARCHAR(255) NOT NULL,
        contact_phone VARCHAR(50) NOT NULL,
        city VARCHAR(255) NOT NULL,
        address_line TEXT NOT NULL,
        notes TEXT NULL,
        is_default_shipping TINYINT(1) NOT NULL DEFAULT 0,
        is_default_billing TINYINT(1) NOT NULL DEFAULT 0,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        CONSTRAINT fk_user_addresses_user FOREIGN KEY (user_id) REFERENCES users(id)
          ON UPDATE CASCADE ON DELETE CASCADE,
        INDEX idx_user_addresses_user (user_id),
        INDEX idx_user_addresses_defaults (user_id, is_default_shipping, is_default_billing)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `,
    `
      CREATE TABLE IF NOT EXISTS shopping_carts (
        id CHAR(36) PRIMARY KEY,
        user_id CHAR(36) NOT NULL,
        status ENUM('active','submitted','abandoned') NOT NULL DEFAULT 'active',
        total_items INT UNSIGNED NOT NULL DEFAULT 0,
        total_cents INT UNSIGNED NOT NULL DEFAULT 0,
        currency CHAR(3) NOT NULL DEFAULT 'COP',
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        last_activity_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        submitted_at DATETIME(3) NULL,
        CONSTRAINT fk_shopping_carts_user FOREIGN KEY (user_id) REFERENCES users(id)
          ON UPDATE CASCADE ON DELETE CASCADE,
        INDEX idx_shopping_carts_user (user_id),
        INDEX idx_shopping_carts_status (status),
        INDEX idx_shopping_carts_last_activity (last_activity_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `,
    `
      CREATE TABLE IF NOT EXISTS shopping_cart_items (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        cart_id CHAR(36) NOT NULL,
        product_id VARCHAR(64) NULL,
        product_snapshot_json LONGTEXT NULL,
        quantity INT UNSIGNED NOT NULL,
        unit_price_cents INT UNSIGNED NOT NULL,
        line_total_cents INT UNSIGNED NOT NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        CONSTRAINT fk_shopping_cart_items_cart FOREIGN KEY (cart_id) REFERENCES shopping_carts(id)
          ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT fk_shopping_cart_items_product FOREIGN KEY (product_id) REFERENCES products(id)
          ON UPDATE CASCADE ON DELETE SET NULL,
        INDEX idx_shopping_cart_items_cart (cart_id),
        INDEX idx_shopping_cart_items_product (product_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `,
    `
      CREATE TABLE IF NOT EXISTS orders (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(32) NOT NULL UNIQUE,
        user_id CHAR(36) NULL,
        cart_id CHAR(36) NULL,
        customer_name VARCHAR(255) NOT NULL,
        customer_email VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(50) NOT NULL,
        customer_city VARCHAR(255) NOT NULL,
        customer_address TEXT NOT NULL,
        customer_notes TEXT NULL,
        payment_method_id VARCHAR(64) NULL,
        shipping_option_id VARCHAR(64) NULL,
        subtotal_cents INT UNSIGNED NOT NULL,
        shipping_cost_cents INT UNSIGNED NOT NULL,
        discount_cents INT UNSIGNED NOT NULL DEFAULT 0,
        total_cents INT UNSIGNED NOT NULL,
        currency CHAR(3) NOT NULL DEFAULT 'COP',
        status ENUM('pending','paid','shipped','cancelled') NOT NULL DEFAULT 'pending',
        submitted_at DATETIME(3) NOT NULL,
        billing_address_json LONGTEXT NULL,
        shipping_address_json LONGTEXT NULL,
        metadata_json LONGTEXT NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id)
          ON UPDATE CASCADE ON DELETE SET NULL,
        CONSTRAINT fk_orders_payment FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id)
          ON UPDATE CASCADE ON DELETE SET NULL,
        CONSTRAINT fk_orders_shipping FOREIGN KEY (shipping_option_id) REFERENCES shipping_options(id)
          ON UPDATE CASCADE ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `,
    `
      CREATE TABLE IF NOT EXISTS order_items (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        order_id BIGINT UNSIGNED NOT NULL,
        product_id VARCHAR(64) NULL,
        product_name VARCHAR(255) NOT NULL,
        product_sku VARCHAR(64) NULL,
        unit_price_cents INT UNSIGNED NOT NULL,
        quantity INT UNSIGNED NOT NULL,
        line_total_cents INT UNSIGNED NOT NULL,
        product_snapshot_json LONGTEXT NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id)
          ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products(id)
          ON UPDATE CASCADE ON DELETE SET NULL,
        INDEX idx_order_items_order (order_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `,
    `
      CREATE TABLE IF NOT EXISTS order_status_history (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        order_id BIGINT UNSIGNED NOT NULL,
        from_status ENUM('pending','paid','shipped','cancelled') NULL,
        to_status ENUM('pending','paid','shipped','cancelled') NOT NULL,
        changed_by VARCHAR(255) NULL,
        note TEXT NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        CONSTRAINT fk_order_status_history_order FOREIGN KEY (order_id) REFERENCES orders(id)
          ON UPDATE CASCADE ON DELETE CASCADE,
        INDEX idx_order_status_history_order (order_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `,
    `
      CREATE TABLE IF NOT EXISTS order_payments (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        order_id BIGINT UNSIGNED NOT NULL,
        payment_method VARCHAR(64) NOT NULL,
        transaction_reference VARCHAR(128) NULL,
        status ENUM('pending','authorized','completed','failed','refunded') NOT NULL DEFAULT 'pending',
        amount_cents INT UNSIGNED NOT NULL,
        processed_at DATETIME(3) NULL,
        metadata_json LONGTEXT NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        CONSTRAINT fk_order_payments_order FOREIGN KEY (order_id) REFERENCES orders(id)
          ON UPDATE CASCADE ON DELETE CASCADE,
        INDEX idx_order_payments_order (order_id),
        INDEX idx_order_payments_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `,
    `
      CREATE TABLE IF NOT EXISTS invoices (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        order_id BIGINT UNSIGNED NOT NULL UNIQUE,
        invoice_number VARCHAR(64) NOT NULL UNIQUE,
        status ENUM('draft','issued','paid','cancelled') NOT NULL DEFAULT 'draft',
        issued_at DATETIME(3) NULL,
        due_at DATETIME(3) NULL,
        subtotal_cents INT UNSIGNED NOT NULL,
        tax_cents INT UNSIGNED NOT NULL DEFAULT 0,
        total_cents INT UNSIGNED NOT NULL,
        currency CHAR(3) NOT NULL DEFAULT 'COP',
        notes TEXT NULL,
        metadata_json LONGTEXT NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        CONSTRAINT fk_invoices_order FOREIGN KEY (order_id) REFERENCES orders(id)
          ON UPDATE CASCADE ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `,
    `
      CREATE TABLE IF NOT EXISTS invoice_items (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        invoice_id BIGINT UNSIGNED NOT NULL,
        order_item_id BIGINT UNSIGNED NULL,
        description VARCHAR(255) NOT NULL,
        quantity INT UNSIGNED NOT NULL,
        unit_price_cents INT UNSIGNED NOT NULL,
        tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
        tax_cents INT UNSIGNED NOT NULL DEFAULT 0,
        line_total_cents INT UNSIGNED NOT NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        CONSTRAINT fk_invoice_items_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id)
          ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT fk_invoice_items_order_item FOREIGN KEY (order_item_id) REFERENCES order_items(id)
          ON UPDATE CASCADE ON DELETE SET NULL,
        INDEX idx_invoice_items_invoice (invoice_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `,
    `
      CREATE TABLE IF NOT EXISTS user_verification_tokens (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id CHAR(36) NOT NULL,
        type ENUM('activation','password_reset') NOT NULL,
        token_hash CHAR(64) NOT NULL,
        code VARCHAR(10) NULL,
        channel ENUM('email','sms') NOT NULL DEFAULT 'email',
        expires_at DATETIME(3) NOT NULL,
        consumed_at DATETIME(3) NULL,
        metadata_json LONGTEXT NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        CONSTRAINT fk_user_tokens_user FOREIGN KEY (user_id) REFERENCES users(id)
          ON UPDATE CASCADE ON DELETE CASCADE,
        INDEX idx_user_tokens_user (user_id),
        INDEX idx_user_tokens_lookup (user_id, type, expires_at, consumed_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `
  ]

  for (const statement of schemaStatements) {
    // eslint-disable-next-line no-await-in-loop
    await localPool.execute(statement)
  }

  await ensureSchemaUpgrades(localPool)
  await seedInitialData()
}

const ensureSchemaUpgrades = async (localPool) => {
  if (!(await columnExists(localPool, 'users', 'is_active'))) {
    await localPool.execute(
      'ALTER TABLE users ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER password_hash'
    )
  }
  if (!(await columnExists(localPool, 'users', 'role'))) {
    await localPool.execute(
      "ALTER TABLE users ADD COLUMN role ENUM('customer','admin') NOT NULL DEFAULT 'customer' AFTER is_active"
    )
  }
  if (!(await columnExists(localPool, 'users', 'last_login_at'))) {
    await localPool.execute('ALTER TABLE users ADD COLUMN last_login_at DATETIME(3) NULL AFTER updated_at')
  }
  if (!(await columnExists(localPool, 'users', 'phone'))) {
    await localPool.execute('ALTER TABLE users ADD COLUMN phone VARCHAR(50) NULL AFTER password_hash')
  }
  if (!(await columnExists(localPool, 'users', 'city'))) {
    await localPool.execute('ALTER TABLE users ADD COLUMN city VARCHAR(255) NULL AFTER phone')
  }
  if (!(await columnExists(localPool, 'users', 'address_line'))) {
    await localPool.execute('ALTER TABLE users ADD COLUMN address_line TEXT NULL AFTER city')
  }
  if (!(await columnExists(localPool, 'users', 'email_verified_at'))) {
    await localPool.execute('ALTER TABLE users ADD COLUMN email_verified_at DATETIME(3) NULL AFTER address_line')
  }

  if (!(await columnExists(localPool, 'orders', 'cart_id'))) {
    await localPool.execute('ALTER TABLE orders ADD COLUMN cart_id CHAR(36) NULL AFTER user_id')
  }
  if (!(await columnExists(localPool, 'orders', 'currency'))) {
    await localPool.execute("ALTER TABLE orders ADD COLUMN currency CHAR(3) NOT NULL DEFAULT 'COP' AFTER total_cents")
  }
  if (!(await columnExists(localPool, 'orders', 'discount_cents'))) {
    await localPool.execute(
      'ALTER TABLE orders ADD COLUMN discount_cents INT UNSIGNED NOT NULL DEFAULT 0 AFTER shipping_cost_cents'
    )
  }
  if (!(await columnExists(localPool, 'orders', 'billing_address_json'))) {
    await localPool.execute(
      'ALTER TABLE orders ADD COLUMN billing_address_json LONGTEXT NULL AFTER submitted_at'
    )
  }
  if (!(await columnExists(localPool, 'orders', 'shipping_address_json'))) {
    await localPool.execute(
      'ALTER TABLE orders ADD COLUMN shipping_address_json LONGTEXT NULL AFTER billing_address_json'
    )
  }
  if (!(await columnExists(localPool, 'orders', 'metadata_json'))) {
    await localPool.execute(
      'ALTER TABLE orders ADD COLUMN metadata_json LONGTEXT NULL AFTER shipping_address_json'
    )
  }
  if (!(await indexExists(localPool, 'orders', 'idx_orders_user'))) {
    await localPool.execute('CREATE INDEX idx_orders_user ON orders (user_id)')
  }
  if (!(await indexExists(localPool, 'orders', 'idx_orders_status'))) {
    await localPool.execute('CREATE INDEX idx_orders_status ON orders (status)')
  }
  if (!(await indexExists(localPool, 'orders', 'idx_orders_submitted_at'))) {
    await localPool.execute('CREATE INDEX idx_orders_submitted_at ON orders (submitted_at)')
  }
  if (!(await constraintExists(localPool, 'orders', 'fk_orders_cart'))) {
    await localPool.execute(
      'ALTER TABLE orders ADD CONSTRAINT fk_orders_cart FOREIGN KEY (cart_id) REFERENCES shopping_carts(id) ON UPDATE CASCADE ON DELETE SET NULL'
    )
  }

  if (!(await columnExists(localPool, 'order_items', 'product_snapshot_json'))) {
    await localPool.execute(
      'ALTER TABLE order_items ADD COLUMN product_snapshot_json LONGTEXT NULL AFTER line_total_cents'
    )
  }

  await localPool.execute(
    `
      CREATE TABLE IF NOT EXISTS user_verification_tokens (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id CHAR(36) NOT NULL,
        type ENUM('activation','password_reset') NOT NULL,
        token_hash CHAR(64) NOT NULL,
        code VARCHAR(10) NULL,
        channel ENUM('email','sms') NOT NULL DEFAULT 'email',
        expires_at DATETIME(3) NOT NULL,
        consumed_at DATETIME(3) NULL,
        metadata_json LONGTEXT NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        CONSTRAINT fk_user_tokens_user FOREIGN KEY (user_id) REFERENCES users(id)
          ON UPDATE CASCADE ON DELETE CASCADE,
        INDEX idx_user_tokens_user (user_id),
        INDEX idx_user_tokens_lookup (user_id, type, expires_at, consumed_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `
  )
}

const seedInitialData = async () => {
  const localPool = ensurePool()
  const connection = await localPool.getConnection()

  try {
    await connection.beginTransaction()

    for (const category of categories) {
      // eslint-disable-next-line no-await-in-loop
      await connection.execute(
        `
          INSERT INTO categories (id, label, description, is_active)
          VALUES (?, ?, ?, 1)
          ON DUPLICATE KEY UPDATE
            label = VALUES(label),
            description = VALUES(description),
            is_active = VALUES(is_active),
            updated_at = CURRENT_TIMESTAMP(3)
        `,
        [category.id, category.label, category.description]
      )
    }

    for (const option of shippingOptions) {
      // eslint-disable-next-line no-await-in-loop
      await connection.execute(
        `
          INSERT INTO shipping_options (id, label, description, price_cents, is_active)
          VALUES (?, ?, ?, ?, 1)
          ON DUPLICATE KEY UPDATE
            label = VALUES(label),
            description = VALUES(description),
            price_cents = VALUES(price_cents),
            is_active = VALUES(is_active),
            updated_at = CURRENT_TIMESTAMP(3)
        `,
        [option.id, option.label, option.description, option.price]
      )

      // eslint-disable-next-line no-await-in-loop
      await connection.execute('DELETE FROM shipping_regions WHERE shipping_option_id = ?', [option.id])

      // eslint-disable-next-line no-await-in-loop
      for (const [index, region] of option.regions.entries()) {
        // eslint-disable-next-line no-await-in-loop
        await connection.execute(
          `
            INSERT INTO shipping_regions (shipping_option_id, region, sort_order)
            VALUES (?, ?, ?)
          `,
          [option.id, region, index]
        )
      }
    }

    for (const method of paymentMethods) {
      // eslint-disable-next-line no-await-in-loop
      await connection.execute(
        `
          INSERT INTO payment_methods (id, label, description, is_active)
          VALUES (?, ?, ?, 1)
          ON DUPLICATE KEY UPDATE
            label = VALUES(label),
            description = VALUES(description),
            is_active = VALUES(is_active),
            updated_at = CURRENT_TIMESTAMP(3)
        `,
        [method.id, method.label, method.description]
      )
    }

    for (const product of products) {
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

      // eslint-disable-next-line no-await-in-loop
      await connection.execute(
        `
          INSERT INTO products (
            id,
            category_id,
            name,
            short_description,
            description,
            price_cents,
            currency,
            stock,
            is_active,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
          ON DUPLICATE KEY UPDATE
            category_id = VALUES(category_id),
            name = VALUES(name),
            short_description = VALUES(short_description),
            description = VALUES(description),
            price_cents = VALUES(price_cents),
            currency = VALUES(currency),
            stock = VALUES(stock),
            is_active = VALUES(is_active),
            updated_at = CURRENT_TIMESTAMP(3)
        `,
        [
          product.id,
          product.categoryId,
          product.name,
          product.shortDescription,
          product.description,
          product.price,
          product.currency,
          product.stock,
          now,
          now
        ]
      )

      // eslint-disable-next-line no-await-in-loop
      await connection.execute('DELETE FROM product_images WHERE product_id = ?', [product.id])
      for (const [index, imageUrl] of product.images.entries()) {
        // eslint-disable-next-line no-await-in-loop
        await connection.execute(
          `
            INSERT INTO product_images (product_id, image_url, sort_order)
            VALUES (?, ?, ?)
          `,
          [product.id, imageUrl, index]
        )
      }

      // eslint-disable-next-line no-await-in-loop
      await connection.execute('DELETE FROM product_features WHERE product_id = ?', [product.id])
      for (const [index, feature] of product.features.entries()) {
        // eslint-disable-next-line no-await-in-loop
        await connection.execute(
          `
            INSERT INTO product_features (product_id, feature_text, sort_order)
            VALUES (?, ?, ?)
          `,
          [product.id, feature, index]
        )
      }

      // eslint-disable-next-line no-await-in-loop
      await connection.execute('DELETE FROM product_highlights WHERE product_id = ?', [product.id])
      for (const [index, highlight] of product.highlights.entries()) {
        // eslint-disable-next-line no-await-in-loop
        await connection.execute(
          `
            INSERT INTO product_highlights (product_id, highlight_text, sort_order)
            VALUES (?, ?, ?)
          `,
          [product.id, highlight, index]
        )
      }

      // eslint-disable-next-line no-await-in-loop
      await connection.execute('DELETE FROM product_specs WHERE product_id = ?', [product.id])
      const specEntries = Object.entries(product.specs || {})
      for (const [index, [key, value]] of specEntries.entries()) {
        // eslint-disable-next-line no-await-in-loop
        await connection.execute(
          `
            INSERT INTO product_specs (product_id, spec_key, spec_value, sort_order)
            VALUES (?, ?, ?, ?)
          `,
          [product.id, key, String(value), index]
        )
      }

      // eslint-disable-next-line no-await-in-loop
      await connection.execute('DELETE FROM product_tags WHERE product_id = ?', [product.id])
      for (const tag of product.tags || []) {
        // eslint-disable-next-line no-await-in-loop
        await connection.execute(
          `
            INSERT INTO product_tags (product_id, tag)
            VALUES (?, ?)
          `,
          [product.id, tag]
        )
      }
    }

    await connection.commit()
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

const initDatabase = async () => {
  if (pool) {
    return pool
  }

  await createDatabaseIfNeeded()

  pool = mysql.createPool({
    host: DB_HOST,
    port: Number(DB_PORT),
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: Number(DB_CONNECTION_LIMIT),
    queueLimit: 0,
    supportBigNumbers: true,
    namedPlaceholders: false
  })

  await createSchemaIfNeeded()

  return pool
}

const query = (sql, params = []) => {
  const localPool = ensurePool()
  return localPool.execute(sql, params)
}

module.exports = {
  initDatabase,
  query,
  getPool: () => ensurePool()
}
