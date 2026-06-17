# Catálogo WhatsApp / COD — SaaS multi-tenant

SaaS por suscripción para que comercios conviertan su tienda **Shopify** en un
**catálogo estilo WhatsApp Business** y vendan por **WhatsApp** o **contra
entrega (COD)**.

- **Frontend + API**: Next.js (App Router) en Vercel
- **Base de datos + Auth**: Supabase (Postgres + Auth, con Row Level Security)
- **Cobros**: Stripe Billing (Checkout + Customer Portal + Webhooks). Modelo **freemium**: plan **Free** (hasta 10 pedidos/mes, sin costo) y plan **Pro** ($4.90/mes, 10 pedidos incluidos + $0.05 por pedido extra)
- **Integración**: Shopify App público (OAuth, token cifrado)

> Este repositorio implementa la **Fase 1** completa: scaffold de Next.js,
> autenticación con Supabase, esquema con RLS, suscripción con Stripe
> (checkout / portal / webhooks) y _gating_ por suscripción. Las fases 2–4 están
> documentadas en el [Roadmap](#roadmap).

---

## Tabla de contenido

1. [Qué incluye (Fases 1–4)](#qué-incluye-fases-14)
2. [Estructura del proyecto](#estructura-del-proyecto)
3. [Inicio rápido (local)](#inicio-rápido-local)
4. [Guía de cuentas y claves](#guía-de-cuentas-y-claves) ← _empieza aquí_
   - [1. Supabase](#1-supabase)
   - [2. Stripe](#2-stripe)
   - [3. Clave de cifrado](#3-clave-de-cifrado)
   - [4. Shopify Partners](#4-shopify-partners)
   - [5. Vercel](#5-vercel)
   - [6. Dominio](#6-dominio)
5. [Variables de entorno](#variables-de-entorno)
6. [Checklist de despliegue (Vercel)](#checklist-de-despliegue-vercel)
7. [Cómo funcionan los planes y el gating](#cómo-funcionan-los-planes-y-el-gating)
8. [Roadmap](#roadmap)
9. [Notas de seguridad](#notas-de-seguridad)

---

## Qué incluye (Fases 1–4)

**Fase 1 — cuentas, suscripción y planes**

- ✅ Registro / login de comercios (Supabase Auth: email + Google)
- ✅ Creación automática del `merchant` al registrarse (trigger en DB)
- ✅ Planes Free / Pro con Stripe Checkout (Pro: $4.90/mes, 10 pedidos incluidos + $0.05 excedente)
- ✅ Customer Portal de Stripe para gestionar / cancelar
- ✅ Webhooks de Stripe que sincronizan el plan (Free ↔ Pro)
- ✅ Esquema Postgres completo (`merchants`, `stores`, `store_configs`, `orders`, `events`) con **Row Level Security**
- ✅ Middleware: el dashboard requiere autenticación (Free y Pro tienen acceso completo)
- ✅ Páginas de marketing, Política de Privacidad y Términos

**Fase 2 — Shopify + configuración**

- ✅ OAuth de app pública de Shopify con 1 clic (`install` → `callback`)
- ✅ Verificación **HMAC** del callback y protección CSRF (state + cookie)
- ✅ Token **offline** guardado **cifrado** (AES-256-GCM) en Postgres
- ✅ Dashboard de configuración por tienda: marca, logo, % descuento, WhatsApp,
  país/moneda, modo checkout (WhatsApp/COD), Telegram (cifrado), sellos, slug
- ✅ Conectar/desconectar tiendas; slug único por catálogo

**Fase 3 — catálogo, checkout COD y métricas**

- ✅ Catálogo público en `/c/[slug]`: grilla estilo WhatsApp, categorías auto,
  más vendidos primero, precios enteros con descuento, agotados ocultos
- ✅ Pantalla de acceso que pide el celular (selector de país + validación)
- ✅ Detalle con carrusel de imágenes, variantes y reseña
- ✅ Checkout **COD server-side**: el backend crea el pedido en Shopify
  (pago pendiente), identifica al cliente por teléfono y reutiliza su dirección
  en recompras; precios recalculados en el servidor (no se confía en el cliente)
- ✅ **Fusión de pedidos**: si el cliente ya tiene un pedido pendiente de <48h,
  se cancela en Shopify (con restock) y sus productos se consolidan en el nuevo
  para un solo envío; no se cuenta ni cobra doble
- ✅ Modo **WhatsApp** alternativo (mensaje wa.me con el pedido)
- ✅ Notificación de pedido por **Telegram**
- ✅ Tope de 10 pedidos/mes del plan Free + reporte de excedente Pro a Stripe
- ✅ Panel de **analítica** (Recharts): KPIs con comparación vs. periodo anterior
  (ingresos, pedidos, ticket promedio, conversión), embudo de conversión,
  tendencia de ingresos/pedidos, top productos, ventas por tienda, pedidos por
  día, % de recompra y **cohortes de retención mensual**; selector de periodo (7/30/90 días)
- ✅ Panel de **Pedidos**: filtros (tienda + búsqueda), **scroll infinito** y
  **detalle del pedido** (artículos, cliente, total, enlace a Shopify)
- ✅ Tests unitarios con **Vitest** (planes, cifrado, HMAC OAuth/webhook, slug, etc.)

**Fase 4 — cumplimiento y deploy**

- ✅ Webhooks de Shopify con verificación **HMAC** (base64 del body crudo)
- ✅ Webhooks GDPR obligatorios: `customers/data_request`, `customers/redact`, `shop/redact`
- ✅ `app/uninstalled` registrado tras OAuth (deja de usar el token)
- ✅ 404 del catálogo, `metadataBase` y checklist de despliegue
- ✅ Compila y despliega sin configuración previa (las claves se validan en tiempo de petición)

---

## Estructura del proyecto

```
catalogo-wsp-saas/
├── middleware.ts                 # Refresh de sesión + gating del dashboard
├── supabase/
│   └── schema.sql                # Tablas, triggers, funciones y RLS (ejecutar en Supabase)
├── src/
│   ├── app/
│   │   ├── page.tsx              # Landing de marketing
│   │   ├── login / signup        # Autenticación
│   │   ├── auth/callback         # Intercambio de código OAuth / email
│   │   ├── dashboard/            # Panel (requiere login)
│   │   │   ├── stores/           # Conectar Shopify + configurar catálogo (actions.ts, [id]/)
│   │   │   ├── metrics/          # Métricas por tienda
│   │   │   ├── orders/          # Pedidos (filtros + scroll infinito + [id] detalle)
│   │   │   └── billing/          # Plan Free/Pro (upgrade / portal)
│   │   ├── c/[slug]/             # Catálogo público (grilla WhatsApp, COD/WhatsApp)
│   │   ├── privacy / terms       # Legales
│   │   └── api/
│   │       ├── stripe/           # checkout · checkout/success · portal · webhook
│   │       ├── shopify/          # install · callback · webhooks (GDPR/HMAC)
│   │       ├── orders/           # lista paginada + filtrada (scroll infinito)
│   │       └── c/[slug]/         # order (COD server-side) · track (métricas)
│   ├── components/
│   │   ├── catalog/              # phone-gate · product-detail · catalog-app
│   │   └── …                     # auth, billing, plan, store config
│   └── lib/
│       ├── env.ts                # Acceso central a variables de entorno
│       ├── crypto.ts             # AES-256-GCM (tokens en reposo)
│       ├── stripe.ts             # Cliente Stripe
│       ├── shopify.ts            # OAuth + HMAC + Admin API (productos, pedidos)
│       ├── catalog.ts            # Carga catálogo público + descuento + gating
│       ├── analytics.ts          # Agregación de métricas (KPIs, embudo, series)
│       ├── retention.ts          # Cohortes de retención (puro, testeado)
│       ├── order-merge.ts        # Fusión de pedidos <48h (puro, testeado)
│       ├── billing.ts            # Sync de suscripción + reporte de uso
│       ├── plans.ts              # Modelo de planes (Free/Pro, límites, tarifas)
│       ├── telegram.ts           # Notificaciones de pedido
│       ├── money.ts · countries.ts
│       ├── subscription*.ts      # Helpers de estado / gating
│       └── supabase/             # Clientes browser / server / admin / middleware
└── .env.example                  # Plantilla de variables
```

---

## Inicio rápido (local)

```bash
# 1. Instalar dependencias
npm install

# 2. Crear tu archivo de entorno
cp .env.example .env.local
#    …y rellenarlo siguiendo la "Guía de cuentas y claves" de abajo.

# 3. Correr en desarrollo
npm run dev
#    Abre http://localhost:3000

# (opcional) reenviar webhooks de Stripe a tu localhost — ver sección Stripe
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Scripts útiles: `npm run dev`, `npm run build`, `npm run start`,
`npm run lint`, `npm run typecheck`, `npm test` (Vitest).

---

## Guía de cuentas y claves

Crea las cuentas en este orden. Cada paso indica **qué variable de `.env.local`
rellenar**.

### 1. Supabase

1. Crea un proyecto en <https://supabase.com> → **New project**. Guarda la
   contraseña de la base de datos.
2. Ve a **SQL Editor** → **New query**, pega el contenido de
   [`supabase/schema.sql`](supabase/schema.sql) y pulsa **Run**. Esto crea las
   tablas, los triggers (incluido el que provisiona el `merchant` al registrarse)
   y las políticas de RLS.
3. Ve a **Project Settings → API** y copia:
   - **Project URL** → `SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key (secreta) → `SUPABASE_SERVICE_ROLE_KEY`
4. **Authentication → URL Configuration**:
   - **Site URL**: `http://localhost:3000` (en prod, tu dominio)
   - **Redirect URLs**: agrega `http://localhost:3000/auth/callback`
     (y `https://TU_DOMINIO/auth/callback` en prod)
5. **Email** ya viene activado. Para **Google** (opcional pero recomendado):
   - En **Google Cloud Console** → _APIs & Services → Credentials_ → crea un
     **OAuth client ID** (tipo _Web application_).
   - **Authorized redirect URI**:
     `https://<TU-REF-DE-PROYECTO>.supabase.co/auth/v1/callback`
   - Copia el **Client ID** y **Client Secret** y pégalos en Supabase:
     **Authentication → Providers → Google** (habilítalo).

> 💡 Mientras desarrollas, puedes desactivar “Confirm email” en
> **Authentication → Providers → Email** para entrar sin confirmar el correo.

### 2. Stripe

El modelo es **freemium**: el plan **Free** no requiere pago (tope de 10
pedidos/mes, controlado en la app). El plan **Pro** se cobra con Stripe: una
cuota base fija + un excedente por pedido a partir del #11. Solo configuras Pro
en Stripe.

1. Crea tu cuenta en <https://stripe.com> (puedes empezar en **modo test**).
2. **Precio base de Pro (cuota fija)**: **Product catalog → Add product**. Crea
   un precio **recurrente mensual** de **$4.90/mes**. Copia el **Price ID**
   (`price_…`) → `STRIPE_PRICE_ID`.
3. **Excedente por pedido (uso medido, escalonado)**:
   - **Billing → Meters → Create meter**. En _Event name_ pon `order_generated`
     (debe coincidir con `STRIPE_USAGE_METER_EVENT`) y agregación **Sum**.
   - Crea un **precio medido (metered) escalonado** (_graduated/tiered_)
     vinculado a ese meter: **primer tramo hasta 10 unidades a $0** y **el resto
     a $0.05 por unidad**. Copia su **Price ID** → `STRIPE_USAGE_PRICE_ID`.
   - Así Stripe aplica solo, por cada cliente Pro, los 10 pedidos incluidos y
     cobra $0.05 desde el #11. El código reporta 1 evento por pedido; Stripe
     hace el cálculo de los tramos.
   - Si prefieres un Pro sin excedente (todo incluido), deja
     `STRIPE_USAGE_PRICE_ID` vacío.
4. **API key**: **Developers → API keys** → copia la **Secret key**
   (`sk_test_…`) → `STRIPE_SECRET_KEY`.
5. **Customer Portal**: **Settings → Billing → Customer portal** → actívalo y
   permite cancelar la suscripción (necesario para `/api/stripe/portal`).
6. **Webhook** (producción): **Developers → Webhooks → Add endpoint**:
   - URL: `https://TU_DOMINIO/api/stripe/webhook`
   - Eventos a escuchar:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_failed`
     - `invoice.paid`
   - Copia el **Signing secret** (`whsec_…`) → `STRIPE_WEBHOOK_SECRET`
7. Define también:
   - `STRIPE_PORTAL_RETURN_URL` = `http://localhost:3000/dashboard/billing`
     (o tu dominio en prod)
   - `STRIPE_TRIAL_DAYS` = `0` (el plan Free ya es la entrada; pon `14` si
     además quieres ofrecer prueba de Pro)

**Webhooks en local** (con la [Stripe CLI](https://stripe.com/docs/stripe-cli)):

```bash
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
# Copia el "whsec_..." que imprime a STRIPE_WEBHOOK_SECRET en .env.local
```

### 3. Clave de cifrado

Los tokens de acceso (Shopify, Telegram) se guardan cifrados con AES-256-GCM.
Genera una clave de 32 bytes en base64:

```bash
openssl rand -base64 32
```

Pégala en `TOKEN_ENCRYPTION_KEY`.

### 4. Shopify Partners

El flujo OAuth ya está implementado (`/api/shopify/install` → `/api/shopify/callback`).

1. Crea una cuenta en <https://partners.shopify.com>.
2. **Apps → Create app → Create app manually** (app pública).
3. En **Configuration → App URL**: `https://TU_DOMINIO` (`SHOPIFY_APP_URL`).
   En local puedes usar un túnel (p. ej. `cloudflared` / `ngrok`) porque Shopify
   exige HTTPS para el callback.
4. **Allowed redirection URL(s)**: `https://TU_DOMINIO/api/shopify/callback`.
5. Copia **Client ID** → `SHOPIFY_API_KEY` y **Client secret** → `SHOPIFY_API_SECRET`.
6. `SHOPIFY_SCOPES` = `read_products,read_inventory,write_orders,read_customers,write_customers`.
7. _(opcional)_ `SHOPIFY_API_VERSION` (por defecto `2024-10`).
8. **Webhooks de cumplimiento (GDPR)**: en el app, sección _Compliance webhooks_,
   apunta los tres a `https://TU_DOMINIO/api/shopify/webhooks`
   (`customers/data_request`, `customers/redact`, `shop/redact`). El
   `app/uninstalled` se registra automáticamente tras la instalación. Todos se
   verifican con HMAC.

**Cómo conectar una tienda**: inicia sesión → **Tiendas** → escribe
`tu-tienda.myshopify.com` → **Conectar Shopify**. Tras autorizar, el token
**offline** se guarda **cifrado** (AES-256-GCM) y se crea la config del catálogo.

### 5. Vercel

1. Sube este repo a GitHub y conéctalo en <https://vercel.com> → **Add New
   Project** (Vercel detecta Next.js automáticamente).
2. En **Settings → Environment Variables** agrega **todas** las variables de
   `.env.local` (ver tabla abajo). Pon `APP_BASE_URL` y
   `NEXT_PUBLIC_APP_BASE_URL` con tu dominio de producción.
3. **Deploy**. Después actualiza con el dominio final:
   - el endpoint del **webhook de Stripe**,
   - las **Redirect URLs** de Supabase,
   - las **URLs** del app de Shopify.

### 6. Dominio

En Vercel → **Settings → Domains** agrega tu dominio y apunta el DNS según las
instrucciones. Una vez activo, usa `https://tu-dominio.com` en `APP_BASE_URL`,
`NEXT_PUBLIC_APP_BASE_URL`, `SHOPIFY_APP_URL` y en las URLs de Stripe/Supabase/Shopify.

---

## Variables de entorno

Copia `.env.example` → `.env.local` y rellena. **Nunca** subas `.env.local`.

| Variable | Dónde se obtiene | Notas |
|---|---|---|
| `APP_BASE_URL` / `NEXT_PUBLIC_APP_BASE_URL` | Tú | `http://localhost:3000` en local |
| `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL` | Supabase → API | Project URL |
| `SUPABASE_ANON_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → API | anon/public |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API | **secreto**, solo servidor |
| `STRIPE_SECRET_KEY` | Stripe → API keys | `sk_test_…` / `sk_live_…` |
| `STRIPE_PRICE_ID` | Stripe → Precio base | `price_…` (cuota fija $4.90/mes) |
| `STRIPE_USAGE_PRICE_ID` | Stripe → Precio medido | `price_…` (escalonado: 10 a $0, luego $0.05; vacío = sin excedente) |
| `STRIPE_USAGE_METER_EVENT` | Stripe → Meter | nombre del evento (`order_generated`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Webhooks / CLI | `whsec_…` |
| `STRIPE_PORTAL_RETURN_URL` | Tú | regreso del portal |
| `STRIPE_TRIAL_DAYS` | Tú | p. ej. `14` |
| `TOKEN_ENCRYPTION_KEY` | `openssl rand -base64 32` | 32 bytes base64 |
| `SHOPIFY_API_KEY` | Shopify Partners | Client ID |
| `SHOPIFY_API_SECRET` | Shopify Partners | Client secret |
| `SHOPIFY_SCOPES` | Tú | scopes separados por coma |
| `SHOPIFY_APP_URL` | Tú | URL pública del app (HTTPS) |
| `SHOPIFY_API_VERSION` | Tú | versión Admin API (`2024-10`) |

> Las variables `NEXT_PUBLIC_*` se exponen al navegador (son públicas por
> diseño). Todo lo demás permanece solo en el servidor.

---

## Checklist de despliegue (Vercel)

1. **Sube el repo a GitHub** e impórtalo en Vercel (detecta Next.js solo).
2. **Variables de entorno** (Settings → Environment Variables): copia todas las
   de `.env.example`. Pon `APP_BASE_URL`, `NEXT_PUBLIC_APP_BASE_URL` y
   `SHOPIFY_APP_URL` con tu dominio de producción. Genera un
   `TOKEN_ENCRYPTION_KEY` nuevo (`openssl rand -base64 32`).
3. **Supabase**: ejecuta `supabase/schema.sql` y agrega
   `https://TU_DOMINIO/auth/callback` a las _Redirect URLs_ (y _Site URL_).
4. **Stripe**: crea el webhook `https://TU_DOMINIO/api/stripe/webhook` con los
   eventos listados arriba y copia el `whsec_…` a `STRIPE_WEBHOOK_SECRET`.
   Verifica que existan el precio base y el precio medido escalonado.
5. **Shopify Partners**: App URL = tu dominio; redirect =
   `https://TU_DOMINIO/api/shopify/callback`; compliance webhooks →
   `https://TU_DOMINIO/api/shopify/webhooks`.
6. **Deploy** y prueba el flujo: registro → conectar Shopify → configurar
   catálogo → abrir `/c/[slug]` → pedido COD de prueba (revisa Shopify, la tabla
   `orders`, Telegram y, en Pro, el uso en Stripe).

> Tip: el build **no requiere** variables (las claves se validan en tiempo de
> petición), así que los _preview deployments_ de Vercel no se rompen.

---

## Cómo funcionan los planes y el gating

- Al registrarse, un **trigger** crea el `merchant` en el plan **Free**
  (`subscription_status = 'none'`, `plan = 'free'`).
- El **middleware** solo exige **autenticación** para `/dashboard/*` (sin
  sesión → `/login`). Free y Pro tienen acceso completo al panel.
- Para pasar a **Pro**, el comercio inicia el **Checkout** desde
  `/dashboard/billing`. Al volver, `/api/stripe/checkout/success` sincroniza el
  estado de inmediato (sin esperar al webhook).
- Los **webhooks** mantienen el estado al día (renovaciones, fallos de pago,
  cancelaciones). Al cancelar o impagar (`past_due` / `unpaid` / `canceled`), el
  comercio **vuelve a Free** (`plan = 'free'`).
- **Tope del plan Free**: máximo 10 pedidos/mes. Se cuenta por mes en la app y,
  al alcanzarlo, se desactiva el checkout del catálogo hasta el próximo mes o
  hasta pasar a Pro (campo `store_configs.disable_checkout_when_unpaid`; se
  aplica en Fase 3).
- **Fusión de pedidos**: un pedido fusionado se marca `status = 'merged'` y se
  excluye del tope, las métricas y la facturación; el pedido previo (ya
  contado/medido) sigue siendo el que cuenta, así que la fusión no duplica.
- **Excedente Pro**: cada pedido generado en Shopify se reporta a Stripe
  (`reportOrderUsage` en `src/lib/billing.ts`); el precio medido escalonado
  aplica los 10 incluidos y cobra $0.05 desde el pedido #11.

---

## Roadmap

- **Fase 1 — ✅**: Next.js + Supabase (auth + esquema con RLS) +
  Stripe (checkout / portal / webhook) + planes Free/Pro.
- **Fase 2 — ✅**: OAuth de Shopify (`/api/shopify/install` → `/api/shopify/callback`),
  token offline cifrado + verificación HMAC + dashboard de configuración por
  tienda (marca, descuento, WhatsApp, COD, Telegram, sellos).
- **Fase 3 — ✅**: catálogo dinámico en `/c/[slug]` (grilla estilo WhatsApp,
  pantalla de acceso con celular, detalle con carrusel + reseña, categorías auto,
  precios enteros con descuento, ocultar agotados, más vendidos primero),
  checkout COD server-side que crea el pedido en Shopify (cliente por teléfono,
  recompra reutiliza dirección), modo WhatsApp alternativo, notificación por
  Telegram, métricas y tope de pedidos del plan Free + excedente Pro.
- **Fase 4 — ✅**: webhooks GDPR obligatorios de Shopify
  (`customers/data_request`, `customers/redact`, `shop/redact`) +
  `app/uninstalled`, con verificación HMAC; pulido (404 del catálogo,
  `metadataBase`) y checklist de despliegue.

---

## Notas de seguridad

- Los tokens se cifran con **AES-256-GCM** (`src/lib/crypto.ts`); la clave vive
  solo en `TOKEN_ENCRYPTION_KEY`.
- **RLS** garantiza que cada comercio solo accede a sus datos. El
  `service_role` (solo servidor) se usa para webhooks y tareas server-side.
- Ningún secreto se expone en el front (solo las `NEXT_PUBLIC_*`).
- El webhook de Stripe **verifica la firma** (`stripe-signature`) antes de
  procesar.
- Los webhooks de Shopify **verifican HMAC** (base64 del body crudo) antes de
  procesar; las solicitudes inválidas se rechazan con 401.
- Cumplimiento GDPR de Shopify: `customers/redact` borra el PII de pedidos
  (nombre/teléfono) y `shop/redact` elimina toda la data de la tienda.
- El checkout COD **recalcula precios en el servidor** (no confía en el cliente).
- Revisa la Política de Privacidad y los Términos (`/privacy`, `/terms`) con un
  asesor legal antes de operar.
```
