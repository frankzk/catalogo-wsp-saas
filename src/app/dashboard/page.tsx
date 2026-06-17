import Link from "next/link";
import { getCurrentMerchant } from "@/lib/subscription";
import { createClient } from "@/lib/supabase/server";
import { PlanBadge } from "@/components/plan-badge";
import {
  FREE_ORDER_LIMIT,
  PRO_INCLUDED_ORDERS,
  PRO_OVERAGE_RATE,
  PRO_PRICE_MONTHLY,
  formatUsd,
  includedOrders,
  planTier,
} from "@/lib/plans";

export const metadata = { title: "Resumen" };

function formatDate(value: string | null): string | null {
  if (!value) return null;
  return new Date(value).toLocaleDateString("es", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

async function getOrdersThisMonth(): Promise<number> {
  const supabase = await createClient();
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  // RLS scopes orders to the current merchant's stores.
  const { count } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .neq("status", "merged")
    .neq("status", "cancelled")
    .gte("created_at", start.toISOString());
  return count ?? 0;
}

export default async function DashboardHome({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const params = await searchParams;
  const merchant = await getCurrentMerchant();
  const tier = planTier(merchant?.subscription_status);
  const ordersThisMonth = await getOrdersThisMonth();
  const limit = includedOrders(tier);
  const trialEnds = formatDate(merchant?.trial_ends_at ?? null);

  const onboarding: Array<{
    title: string;
    body: string;
    done: boolean;
    soon?: boolean;
    href?: string;
    cta?: string;
  }> = [
    {
      title: "Tu cuenta está lista",
      body: `Estás en el plan ${tier === "pro" ? "Pro" : "Free"}. Puedes empezar a configurar.`,
      done: true,
    },
    {
      title: "Conecta tu tienda Shopify",
      body: "Instala la app con un clic para sincronizar productos.",
      done: false,
      href: "/dashboard/stores",
      cta: "Conectar",
    },
    {
      title: "Configura tu catálogo",
      body: "Marca, descuento, WhatsApp, COD y Telegram.",
      done: false,
      href: "/dashboard/stores",
      cta: "Configurar",
    },
    {
      title: "Publica y vende",
      body: "Comparte el enlace de tu catálogo y recibe pedidos. (Fase 3)",
      done: false,
      soon: true,
    },
  ];

  return (
    <div className="space-y-8">
      {params.checkout === "success" && (
        <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
          ¡Listo! Ahora estás en el plan Pro. 🎉
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold">Resumen</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configura tu catálogo y empieza a vender por WhatsApp o COD.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Plan card */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              Plan
            </h2>
            <PlanBadge tier={tier} />
          </div>
          <p className="mt-3 text-lg font-semibold">
            {tier === "pro"
              ? `Pro · ${formatUsd(PRO_PRICE_MONTHLY)}/mes`
              : "Free · $0/mes"}
          </p>
          <p className="text-sm text-gray-500">
            {tier === "pro"
              ? `${PRO_INCLUDED_ORDERS} pedidos incluidos, luego ${formatUsd(PRO_OVERAGE_RATE)} c/u`
              : `Hasta ${FREE_ORDER_LIMIT} pedidos al mes`}
          </p>
          {trialEnds && tier === "pro" && (
            <p className="mt-1 text-xs text-gray-400">
              {merchant?.subscription_status === "trialing"
                ? `Prueba hasta el ${trialEnds}`
                : `Periodo de prueba: hasta el ${trialEnds}`}
            </p>
          )}
          <Link
            href="/dashboard/billing"
            className="mt-4 inline-block text-sm font-medium text-whatsapp-teal hover:underline"
          >
            {tier === "pro" ? "Gestionar suscripción →" : "Pasar a Pro →"}
          </Link>
        </div>

        {/* Usage card */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Pedidos este mes
          </h2>
          <p className="mt-3 text-3xl font-extrabold">
            {ordersThisMonth}
            <span className="text-base font-medium text-gray-400">
              {tier === "pro" ? "" : ` / ${limit}`}
            </span>
          </p>
          {tier === "pro" ? (
            <p className="mt-1 text-sm text-gray-500">
              {PRO_INCLUDED_ORDERS} incluidos · excedente a {formatUsd(PRO_OVERAGE_RATE)} c/u
            </p>
          ) : (
            <>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-whatsapp"
                  style={{
                    width: `${Math.min(100, (ordersThisMonth / limit) * 100)}%`,
                  }}
                />
              </div>
              {ordersThisMonth >= limit && (
                <p className="mt-2 text-sm text-amber-700">
                  Alcanzaste el tope del plan Free.{" "}
                  <Link href="/dashboard/billing" className="font-medium underline">
                    Pasa a Pro
                  </Link>{" "}
                  para seguir vendiendo.
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Onboarding checklist */}
      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Primeros pasos
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {onboarding.map((step, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-5"
            >
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  step.done ? "bg-whatsapp text-white" : "bg-gray-100 text-gray-400"
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
