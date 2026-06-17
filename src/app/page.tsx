import Link from "next/link";
import {
  FREE_ORDER_LIMIT,
  PRO_INCLUDED_ORDERS,
  PRO_OVERAGE_RATE,
  PRO_PRICE_MONTHLY,
  formatUsd,
} from "@/lib/plans";

const FEATURES = [
  {
    title: "Catálogo estilo WhatsApp",
    body: "Grilla de productos, categorías automáticas, más vendidos primero y detalle con carrusel + reseñas.",
  },
  {
    title: "Conecta Shopify en 1 clic",
    body: "Instala la app pública con OAuth. Sincroniza productos, inventario y crea pedidos por ti.",
  },
  {
    title: "Checkout COD o WhatsApp",
    body: "Vende contra entrega creando el pedido en Shopify desde el servidor, o redirige a WhatsApp.",
  },
  {
    title: "Descuentos y marca",
    body: "Aplica un % de descuento, tu logo, número de WhatsApp, país/moneda y sellos de confianza.",
  },
  {
    title: "Notificaciones por Telegram",
    body: "Recibe cada pedido al instante en tu bot de Telegram.",
  },
  {
    title: "Métricas por tienda",
    body: "Vistas, agregados al carrito y pedidos, todo en tu panel.",
  },
];

export default function MarketingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Nav */}
      <header className="border-b border-gray-100">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-lg font-bold tracking-tight">
            Catálogo<span className="text-whatsapp">WSP</span>
          </span>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/login" className="text-gray-600 hover:text-gray-900">
              Iniciar sesión
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-whatsapp px-4 py-2 font-medium text-white hover:bg-whatsapp-dark"
            >
              Empezar gratis
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-6 py-20 text-center">
          <p className="mb-3 inline-block rounded-full bg-whatsapp-light px-3 py-1 text-sm font-medium text-whatsapp-teal">
            Empieza gratis · hasta {FREE_ORDER_LIMIT} pedidos al mes · sin tarjeta
          </p>
          <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl">
            Tu tienda Shopify como un{" "}
            <span className="text-whatsapp">catálogo de WhatsApp</span> que vende
            contra entrega
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
            Convierte tu catálogo en una experiencia de compra por WhatsApp o COD.
            Conecta Shopify, aplica descuentos, recibe pedidos por Telegram y mide
            todo desde un panel.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link
              href="/signup"
              className="rounded-lg bg-whatsapp px-6 py-3 font-semibold text-white shadow-sm hover:bg-whatsapp-dark"
            >
              Crear mi catálogo
            </Link>
            <Link
              href="#pricing"
              className="rounded-lg border border-gray-300 px-6 py-3 font-semibold text-gray-700 hover:bg-gray-50"
            >
              Ver precio
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="bg-gray-50 py-20">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-center text-3xl font-bold">Todo lo que necesitas para vender</h2>
            <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
                >
                  <h3 className="text-lg font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm text-gray-600">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-20">
          <div className="mx-auto max-w-4xl px-6">
            <h2 className="text-center text-3xl font-bold">
              Empieza gratis, paga solo cuando creces
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-gray-600">
              Sin costo hasta {FREE_ORDER_LIMIT} pedidos al mes. Cuando vendes más,
              el plan Pro se encarga.
            </p>

            <div className="mt-12 grid gap-8 md:grid-cols-2">
              {/* Free */}
              <div className="flex flex-col rounded-2xl border border-gray-200 p-8 shadow-sm">
                <p className="text-sm font-medium uppercase tracking-wide text-gray-500">
                  Free
                </p>
                <p className="mt-4 text-5xl font-extrabold">
                  $0<span className="text-lg font-medium text-gray-500">/mes</span>
                </p>
                <p className="mt-1 text-sm font-medium text-gray-600">
                  Hasta {FREE_ORDER_LIMIT} pedidos al mes
                </p>
                <ul className="mt-6 flex-1 space-y-3 text-sm text-gray-700">
                  {[
                    "Catálogo estilo WhatsApp",
                    "Checkout COD y WhatsApp",
                    "Integración con Shopify",
                    `Hasta ${FREE_ORDER_LIMIT} pedidos al mes`,
                    "Notificaciones por Telegram",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="text-whatsapp">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className="mt-8 block rounded-lg border border-gray-300 px-6 py-3 text-center font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Empezar gratis
                </Link>
              </div>

              {/* Pro */}
              <div className="relative flex flex-col rounded-2xl border-2 border-whatsapp p-8 shadow-sm">
                <span className="absolute -top-3 left-8 rounded-full bg-whatsapp px-3 py-1 text-xs font-semibold text-white">
                  Recomendado
                </span>
                <p className="text-sm font-medium uppercase tracking-wide text-whatsapp-teal">
                  Pro
                </p>
                <p className="mt-4 text-5xl font-extrabold">
                  {formatUsd(PRO_PRICE_MONTHLY)}
                  <span className="text-lg font-medium text-gray-500">/mes</span>
                </p>
                <p className="mt-1 text-sm font-medium text-gray-600">
                  {PRO_INCLUDED_ORDERS} pedidos incluidos · luego{" "}
                  {formatUsd(PRO_OVERAGE_RATE)} por pedido extra
                </p>
                <ul className="mt-6 flex-1 space-y-3 text-sm text-gray-700">
                  {[
                    "Todo lo del plan Free",
                    "Pedidos ilimitados (10 incluidos + excedente)",
                    "Métricas y panel de control",
                    "Soporte prioritario",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="text-whatsapp">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className="mt-8 block rounded-lg bg-whatsapp px-6 py-3 text-center font-semibold text-white hover:bg-whatsapp-dark"
                >
                  Empezar con Pro
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-gray-500 sm:flex-row">
          <span>© {new Date().getFullYear()} Catálogo WSP. Todos los derechos reservados.</span>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-gray-900">
              Privacidad
            </Link>
            <Link href="/terms" className="hover:text-gray-900">
              Términos
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
