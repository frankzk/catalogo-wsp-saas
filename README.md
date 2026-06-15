# Catálogo WhatsApp / COD — SaaS multi-tenant

SaaS por suscripción para que comercios conviertan su tienda **Shopify** en un
**catálogo estilo WhatsApp Business** y vendan por **WhatsApp** o **contra
entrega (COD)**.

- **Frontend + API**: Next.js (App Router) en Vercel
- **Base de datos + Auth**: Supabase (Postgres + Auth, con Row Level Security)
- **Cobros**: Stripe Billing (Checkout + Customer Portal + Webhooks): cuota base mensual ($4.90) + $0.10 por pedido generado (uso medido), con prueba de 14 días
- **Integración**: Shopify App público (OAuth) — _Fase 2_

> Este repositorio implementa la **Fase 1** completa: scaffold de Next.js,
> autenticación con Supabase, esquema con RLS, suscripción con Stripe
> (checkout / portal / webhooks) y _gating_ por suscripción. Las fases 2–4 están
> documentadas en el [Roadmap](#roadmap).

---

## Tabla de contenido

1. [Qué incluye la Fase 1](#qué-incluye-la-fase-1)
2. [Estructura del proyecto](#estructura-del-proyecto)
3. [Inicio rápido (local)](#inicio-rápido-local)
4. [Guía de cuentas y claves](#guía-de-cuentas-y-claves) ← _empieza aquí_
   - [1. Supabase](#1-supabase)
   - [2. Stripe](#2-stripe)
   - [3. Clave de cifrado](#3-clave-de-cifrado)
   - [4. Shopify Partners (Fase 2)](#4-shopify-partners-fase-2)
   - [5. Vercel](#5-vercel)
   - [6. Dominio](#6-dominio)
5. [Variables de entorno](#variables-de-entorno)
6. [Cómo funciona el gating](#cómo-funciona-el-gating)
7. [Roadmap](#roadmap)
8. [Notas de seguridad](#notas-de-seguridad)

---

## Qué incluye la Fase 1

- ✅ Registro / login de comercios (Supabase Auth: email + Google)
- ✅ Creación automática del `merchant` al registrarse (trigger en DB)
- ✅ Suscripción: cuota base mensual + cargo por uso ($0.10/pedido) con Stripe Checkout + prueba de 14 días
- ✅ Customer Portal de Stripe para gestionar / cancelar
- ✅ Webhooks de Stripe que sincronizan el estado y **cortan acceso** si no se paga
- ✅ Esquema Postgres completo (`merchants`, `stores`, `store_configs`, `orders`, `events`) con **Row Level Security**
- ✅ Middleware de _gating_: el dashboard exige suscripción activa / en prueba
- ✅ Cifrado AES-256-GCM listo para los tokens (Shopify / Telegram)
- ✅ Páginas de marketing, Política de Privacidad y Términos
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
│   │   ├── dashboard/            # Panel (protegido)
│   │   │   └── billing/          # Suscripción (siempre accesible para activar/pagar)
│   │   ├── privacy / terms       # Legales
│   │   └── api/stripe/
│   │       ├── checkout          # Crea la sesión de Checkout
│   │       ├── checkout/success  # Sync síncrono post-pago (evita race con el webhook)
│   │       ├── portal            # Abre el Customer Portal
│   │       └── webhook           # Recibe eventos de Stripe
│   ├── components/               # UI (auth, botones de billing, badges, legal)
│   └── lib/
│       ├── env.ts                # Acceso central a variables de entorno
│       ├── crypto.ts             # AES-256-GCM
│       ├── stripe.ts             # Cliente Stripe
│       ├── billing.ts            # Sync de suscripción → merchants
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
`npm run lint`, `npm run typecheck`.

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

El modelo de cobro es **híbrido**: una cuota base fija + un cargo por uso
(metered) por cada pedido generado.

1. Crea tu cuenta en <https://stripe.com> (puedes empezar en **modo test**).
2. **Precio base (cuota fija)**: **Product catalog → Add product**. Crea un
   precio **recurrente mensual** de **$4.90/mes**. Copia el **Price ID**
   (`price_…`) → `STRIPE_PRICE_ID`.
3. **Cobro por pedido (uso medido)**:
   - **Billing → Meters → Create meter**. En _Event name_ pon `order_generated`
     (debe coincidir con `STRIPE_USAGE_METER_EVENT`) y agregación **Sum**.
   - Crea un **precio medido** (metered) vinculado a ese meter, de **$0.10 por
     unidad** (puede ir dentro del mismo producto). Copia su **Price ID** →
     `STRIPE_USAGE_PRICE_ID`.
   - _(Opcional)_ ¿Quieres incluir un cupo gratis (p. ej. los primeros 50
     pedidos del mes sin costo)? Usa **precios escalonados (tiered)** en ese
     precio: primer tramo hasta _N_ a $0 y el resto a $0.10. El código no
     cambia: siempre reporta 1 evento por pedido y Stripe aplica los tramos.
   - Para desactivar el cobro por pedido, deja `STRIPE_USAGE_PRICE_ID` vacío.
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
   - `STRIPE_TRIAL_DAYS` = `14`

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

### 4. Shopify Partners (Fase 2)

Puedes dejarlo listo desde ya aunque el flujo OAuth se implementa en la Fase 2.

1. Crea una cuenta en <https://partners.shopify.com>.
2. **Apps → Create app → Create app manually** (app pública).
3. En **Configuration → App URL**: `https://TU_DOMINIO` (`SHOPIFY_APP_URL`).
4. **Allowed redirection URL(s)**: `https://TU_DOMINIO/api/shopify/callback`.
5. Copia **Client ID** → `SHOPIFY_API_KEY` y **Client secret** → `SHOPIFY_API_SECRET`.
6. `SHOPIFY_SCOPES` = `read_products,read_inventory,write_orders,read_customers,write_customers`.

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
| `STRIPE_USAGE_PRICE_ID` | Stripe → Precio medido | `price_…` ($0.10/pedido; vacío = sin cobro por uso) |
| `STRIPE_USAGE_METER_EVENT` | Stripe → Meter | nombre del evento (`order_generated`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Webhooks / CLI | `whsec_…` |
| `STRIPE_PORTAL_RETURN_URL` | Tú | regreso del portal |
| `STRIPE_TRIAL_DAYS` | Tú | p. ej. `14` |
| `TOKEN_ENCRYPTION_KEY` | `openssl rand -base64 32` | 32 bytes base64 |
| `SHOPIFY_API_KEY` | Shopify Partners | _Fase 2_ |
| `SHOPIFY_API_SECRET` | Shopify Partners | _Fase 2_ |
| `SHOPIFY_SCOPES` | Tú | scopes separados por coma |
| `SHOPIFY_APP_URL` | Tú | URL pública del app |

> Las variables `NEXT_PUBLIC_*` se exponen al navegador (son públicas por
> diseño). Todo lo demás permanece solo en el servidor.

---

## Cómo funciona el gating

- Al registrarse, un **trigger** crea el `merchant` con `subscription_status = 'none'`.
- El **middleware** protege `/dashboard/*`:
  - sin sesión → redirige a `/login`;
  - con sesión pero **sin** suscripción `active`/`trialing` → redirige a
    `/dashboard/billing` (única ruta del dashboard siempre accesible).
- En `/dashboard/billing` el comercio inicia el **Checkout** (con prueba de 14
  días). Al volver, `/api/stripe/checkout/success` sincroniza la suscripción de
  inmediato (sin esperar al webhook).
- Los **webhooks** mantienen el estado al día: renovaciones, fallos de pago y
  cancelaciones. Los estados `past_due` / `unpaid` / `canceled` **cortan el
  acceso**.
- El **cargo por uso** ($0.10/pedido) se reportará a Stripe al generar cada
  pedido (Fase 3) mediante _meter events_ (`reportOrderUsage` en
  `src/lib/billing.ts`); Stripe lo factura junto con la cuota base.
- El catálogo público (_Fase 3_) seguirá sirviéndose; si la suscripción está
  vencida, se podrá desactivar el checkout (campo
  `store_configs.disable_checkout_when_unpaid`).

---

## Roadmap

- **Fase 1 — ✅ (este repo)**: Next.js + Supabase (auth + esquema con RLS) +
  Stripe (checkout / portal / webhook) + gating.
- **Fase 2**: OAuth de Shopify (`/api/shopify/install` → `/api/shopify/callback`),
  guardar token cifrado + dashboard de configuración por tienda.
- **Fase 3**: catálogo dinámico en `/c/[slug]` (reusando la UI de
  `frankzk/catalogo-wsp`), checkout COD server-side (crea el pedido en Shopify),
  notificación por Telegram y métricas.
- **Fase 4**: pulido, deploy y documentación final. Webhooks GDPR obligatorios
  de Shopify (`customers/data_request`, `customers/redact`, `shop/redact`) +
  verificación HMAC, para listar en el App Store.

---

## Notas de seguridad

- Los tokens se cifran con **AES-256-GCM** (`src/lib/crypto.ts`); la clave vive
  solo en `TOKEN_ENCRYPTION_KEY`.
- **RLS** garantiza que cada comercio solo accede a sus datos. El
  `service_role` (solo servidor) se usa para webhooks y tareas server-side.
- Ningún secreto se expone en el front (solo las `NEXT_PUBLIC_*`).
- El webhook de Stripe **verifica la firma** (`stripe-signature`) antes de
  procesar.
- Revisa la Política de Privacidad y los Términos (`/privacy`, `/terms`) con un
  asesor legal antes de operar.
```
