# MACLA Distribuciones – Tienda Online

Tienda React + Vite para el catálogo de MACLA Distribuciones S.A.S. Incluye navegación completa, carrito con persistencia, checkout con webhook configurable y páginas informativas basadas en el brief de la marca.

## Requisitos
- Node.js 18+
- npm 9+

## Scripts disponibles
- `npm install` – instala dependencias
- `npm run dev` – entorno de desarrollo (http://localhost:5173)
- `npm run build` – genera la versión de producción en `dist/`
- `npm run lint` – valida el código con ESLint

## Variables de entorno
Configura un archivo `.env` (no versionado) en la raíz con los siguientes valores según tu infraestructura:

```bash
VITE_API_URL=http://localhost:4000/api                       # URL base de la API (por defecto puerto 4000)
VITE_ORDER_WEBHOOK_URL=https://tu-servicio.com/webhook  # URL que recibirá los pedidos en formato JSON
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX                    # ID de Google Analytics 4 (opcional)
```

Si `VITE_API_URL` no se define, el frontend asumirá `http://localhost:4000/api`.  
Si `VITE_ORDER_WEBHOOK_URL` no está definido, el checkout seguirá funcionando y dejará el pedido en la consola del navegador para pruebas.

## API y base de datos (MySQL)
La carpeta `server/` contiene una API Express + MySQL para manejar usuarios autenticados y carritos persistentes.

1. Copia `server/.env.example` a `server/.env` y ajusta las variables (asegúrate de contar con un servidor MySQL en ejecución):
   - `JWT_SECRET` y `JWT_EXPIRATION` para los tokens.
   - `ACTIVATION_TOKEN_EXPIRES_MINUTES` y `PASSWORD_RESET_TOKEN_EXPIRES_MINUTES` para definir la caducidad (en minutos) de los códigos de activación y recuperación enviados al usuario.
   - **Correo (SMTP)**: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_IGNORE_TLS`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`. Con estos valores configurados el backend usará Nodemailer para enviar los códigos de activación y recuperación a través de tu proveedor (Mailtrap, Gmail, Outlook, SendGrid SMTP, etc.).
   - **SMS/WhatsApp (Twilio)**: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`. Si los defines, además del correo se enviará un mensaje de texto (o WhatsApp si tu número emisor está habilitado). Si no configuras Twilio el sistema caerá automáticamente en el envío por correo.
   - `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` y `DB_CONNECTION_LIMIT` para la conexión a MySQL.  
     El usuario configurado debe tener permisos para crear la base de datos especificada en `DB_NAME` (el servidor inicializa el esquema automáticamente).
2. Instala dependencias del frontend (`npm install`) y, por única vez, las del servidor:
   ```bash
   npm install --prefix server
   ```
   Luego levanta la API:
   ```bash
   npm run server   # Ejecuta node server/index.js (puerto 4000 por defecto)
   ```
   Si además quieres servir la aplicación React desde el mismo servidor Express (http://localhost:4000), ejecuta antes:
    ```bash
    npm run build   # Genera la carpeta dist consumida por el backend
    ```
3. En otra terminal inicia el frontend:
   ```bash
   npm run dev
   ```

### Estructura de datos
El backend crea y sincroniza automáticamente todas las entidades necesarias para operar la tienda:

- **Usuarios**: `users`, `user_addresses` (roles, estado activo, direcciones favoritas, fecha de último inicio de sesión).
- **Catálogo**: `categories`, `products`, `product_images`, `product_features`, `product_highlights`, `product_specs`, `product_tags`.
- **Logística y pagos**: `shipping_options`, `shipping_regions`, `payment_methods`.
- **Carritos**: `shopping_carts`, `shopping_cart_items` (histórico de carritos por usuario, estado `active`/`submitted`/`abandoned`, totales, snapshots de producto).
- **Pedidos**: `orders`, `order_items`, `order_status_history`, `order_payments` (base para registrar checkout, trazabilidad de estados y pagos).
- **Facturación**: `invoices`, `invoice_items` (listos para emitir comprobantes a partir de un pedido).

Al iniciar el servidor se insertan/actualizan los datos iniciales de catálogo, métodos de pago y opciones de envío. Puedes consultarlos desde phpMyAdmin o la consola MySQL (`SELECT * FROM products;`) una vez levantada la API.  
> Nota: Si vienes de una versión previa que usaba la tabla `carts`, los datos continúan disponibles, pero el API ahora trabaja sobre `shopping_carts` y `shopping_cart_items`.

### Endpoints relevantes
- `POST /api/auth/register` – Registra usuario (ahora deja la cuenta en estado pendiente hasta que se valide el código enviado por correo/SMS).
- `POST /api/auth/activate` – Confirma la cuenta con código numérico o token.
- `POST /api/auth/resend-activation` – Genera un nuevo código para usuarios pendientes.
- `POST /api/auth/login` – Inicia sesión y entrega token JWT.
- `POST /api/auth/recover` – Envía código/token para restablecer contraseña (correo o teléfono).
- `POST /api/auth/reset-password` – Valida el código y actualiza la contraseña.
- `GET /api/auth/profile` – Obtiene datos del usuario autenticado.
- `PUT /api/profile` – Actualiza nombre, teléfono, ciudad y dirección del usuario autenticado.
- `GET /api/cart` – Recupera los items guardados del carrito.
- `PUT /api/cart` – Persiste el carrito para el usuario.
- `GET /api/admin/stats` – Resumen de usuarios, pedidos y carritos (requiere usuario con `role = 'admin'`).
- `GET /api/admin/carts` – Listado filtrable de carritos con totales e historial.
- `GET /api/admin/carts/:id` – Detalle de un carrito con sus ítems (snapshots incluidos).

Para promover a administrador a un usuario existente:
```sql
UPDATE users SET role = 'admin' WHERE email = 'correo@tuempresa.com';
```
Luego inicia sesión y reutiliza el token JWT para acceder a los endpoints `/api/admin/*`.

#### Consultas útiles (SQL)
- Usuarios registrados: `SELECT COUNT(*) FROM users;`
- Carritos activos por usuario: `SELECT user_id, COUNT(*) FROM shopping_carts WHERE status = 'active' GROUP BY user_id;`
- Carritos abandonados recientes:  
  ```sql
  SELECT sc.id, u.email, sc.total_cents, sc.updated_at
  FROM shopping_carts sc
  JOIN users u ON sc.user_id = u.id
  WHERE sc.status = 'abandoned'
  ORDER BY sc.updated_at DESC
  LIMIT 20;
  ```
- Pedidos listos para factura: `SELECT id, code FROM orders WHERE status = 'paid' AND id NOT IN (SELECT order_id FROM invoices);`

## Flujo de pedidos
1. El usuario completa `Checkout`.
2. Se envía un `POST` JSON al webhook con la siguiente forma:
   ```json
   {
     "code": "MAC-ABC123",
     "customer": { "name": "...", "email": "..." },
     "paymentMethod": { "id": "contraentrega", "label": "Contra-entrega" },
     "shippingOption": { "id": "medellin", "label": "Envío Medellín", "price": 10000 },
     "items": [ { "product": { ... }, "quantity": 2 } ],
     "subtotal": 289900,
     "shippingCost": 10000,
     "total": 299900,
     "submittedAt": "2025-03-17T03:00:00.000Z"
   }
   ```
3. Conecta el webhook a tu CRM, Sheets, Make/Zapier, etc. para gestionar la orden.

## Analytics
- Si defines `VITE_GA_MEASUREMENT_ID`, se carga Google Analytics 4 automáticamente.
- Se registran pageviews en cada navegación, eventos `add_to_cart`, `remove_from_cart`, actualizaciones de cantidades y `purchase` al completar el pedido.
- Puedes extender los eventos en `src/utils/analytics.ts`.

## Gestión de productos
- Los productos y categorías viven en `src/data/products.ts`.
- Actualiza stock, precios y copys editando este archivo. Los cambios se reflejan automáticamente sin build adicional en dev.
- Los textos corporativos/legales se encuentran en `src/pages/*.tsx`.

Si planeas delegar la autogestión:
1. Crea un branch o fork para Maria Clara.
2. Documenta claramente qué campos modificar y revisa el build antes de publicar.
3. Evalúa migrar a una fuente externa (CMS headless, Google Sheets + API) si el catálogo crece.

## Estilos
- Estilos globales en `src/index.css` siguiendo la línea minimalista blanco/negro.
- Ajusta variables CSS (`:root`) para modificar colores, sombras o radios.

## Deploy sugerido
1. Ejecuta `npm run build`.
2. Sube el contenido de `dist/` a tu hosting estático (Vercel, Netlify, S3 + CloudFront, etc.).
3. Configura HTTPS y apunta el dominio `macla-distribuciones.com` al hosting.
4. Asegúrate de que `/site.webmanifest`, `/robots.txt` y las meta etiquetas del `index.html` estén accesibles.

## Próximos pasos recomendados
- Integrar una pasarela de pago oficial o instrucciones de transferencia automática.
- Conectar WhatsApp Business API o Chatbot si desean asistencia en tiempo real.
- Automatizar campañas y remarketing con los eventos ya disparados en GA4.
