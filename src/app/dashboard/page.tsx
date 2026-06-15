import Link from "next/link";
import { getCurrentMerchant } from "@/lib/subscription";
import { SubscriptionBadge } from "@/components/subscription-badge";

export const metadata = { title: "Resumen" };

function formatDate(value: string | null): string | null {
  if (!value) return null;
  return new Date(value).toLocaleDateString("es", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const ONBOARDING = [
  {
    title: "Activa tu suscripción",
    body: "Comienza tu prueba gratis de 14 días.",
    done: true,
    href: "/dashboard/billing",
    cta: "Ver facturación",
  },
  {
    title: "Conecta tu tienda Shopify",
    body: "Instala la app con un clic para sincronizar productos. (Fase 2)",
    done: false,
    soon: true,
  },
  {
    title: "Configura tu catálogo",
    body: "Marca, descuento, WhatsApp, COD y Telegram. (Fase 2)",
    done: false,
    soon: true,
  },
  {
    title: "Publica y vende",
    body: "Comparte el enlace de tu catálogo y recibe pedidos. (Fase 3)",
    done: false,
    soon: true,
  },
];

export default async function DashboardHome({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const params = await searchParams;
  const merchant = await getCurrentMerchant();
  const trialEnds = formatDate(merchant?.trial_ends_at ?? null);

  return (
    <div className="space-y-8">
      {params.checkout === "success" && (
        <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
          ¡Listo! Tu suscripción quedó activa. Bienvenido a bordo. 🎉
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold">Resumen</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configura tu catálogo y empieza a vender por WhatsApp o COD.
        </p>
      </div>

      {/* Subscription card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Suscripción
          </h2>
          <SubscriptionBadge status={merchant?.subscription_status} />
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div>
            <p className="text-lg font-semibold">
              Plan Pro · $4.90/mes + $0.10/pedido
            </p>
            {trialEnds && (
              <p className="text-sm text-gray-500">
                Prueba hasta el {trialEnds}
              </p>
            )}
          </div>
          <Link
            href="/dashboard/billing"
            className="text-sm font-medium text-whatsapp-teal hover:underline"
          >
            Gestionar →
          </Link>
        </div>
      </div>

      {/* Onboarding checklist */}
      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Primeros pasos
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {ONBOARDING.map((step, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-5"
            >
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  step.done
                    ? "bg-whatsapp text-white"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {step.done ? "✓" : i + 1}
              </span>
              <div>
                <p className="font-medium">
                  {step.title}
                  {step.soon && (
                    <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-gray-500">
                      Próximamente
                    </span>
                  )}
                </p>
                <p className="mt-1 text-sm text-gray-500">{step.body}</p>
                {step.href && step.cta && (
                  <Link
                    href={step.href}
                    className="mt-2 inline-block text-sm font-medium text-whatsapp-teal hover:underline"
                  >
                    {step.cta} →
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
