import { getCurrentMerchant, isSubscriptionActive } from "@/lib/subscription";
import { SubscriptionBadge } from "@/components/subscription-badge";
import { PlanBadge } from "@/components/plan-badge";
import {
  ManageBillingButton,
  SubscribeButton,
} from "@/components/billing-buttons";
import {
  FREE_ORDER_LIMIT,
  PRO_INCLUDED_ORDERS,
  PRO_OVERAGE_RATE,
  PRO_PRICE_MONTHLY,
  formatUsd,
  planTier,
} from "@/lib/plans";

export const metadata = { title: "Facturación" };

function formatDate(value: string | null): string | null {
  if (!value) return null;
  return new Date(value).toLocaleDateString("es", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string; checkout?: string }>;
}) {
  const params = await searchParams;
  const merchant = await getCurrentMerchant();
  const active = isSubscriptionActive(merchant?.subscription_status);
  const tier = planTier(merchant?.subscription_status);
  const trialEnds = formatDate(merchant?.trial_ends_at ?? null);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Facturación</h1>
        <p className="mt-1 text-sm text-gray-500">
          Tu plan actual y opciones de suscripción.
        </p>
      </div>

      {params.checkout === "cancelled" && (
        <div className="rounded-lg bg-gray-100 px-4 py-3 text-sm text-gray-700">
          Cancelaste el proceso de pago. Puedes intentarlo de nuevo cuando
          quieras.
        </div>
      )}

      {/* Current plan */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Tu plan
          </h2>
          <PlanBadge tier={tier} />
        </div>

        {tier === "pro" ? (
          <>
            <div className="mt-3 flex items-center gap-2">
              <p className="text-2xl font-extrabold">
                Pro · {formatUsd(PRO_PRICE_MONTHLY)}
                <span className="text-base font-medium text-gray-500">/mes</span>
              </p>
              <SubscriptionBadge status={merchant?.subscription_status} />
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {PRO_INCLUDED_ORDERS} pedidos incluidos, luego{" "}
              {formatUsd(PRO_OVERAGE_RATE)} por pedido extra.
            </p>
            {trialEnds && (
              <p className="mt-1 text-sm text-gray-500">
                {merchant?.subscription_status === "trialing"
                  ? `Tu prueba termina el ${trialEnds}.`
                  : `Periodo de prueba: hasta el ${trialEnds}.`}
              </p>
            )}
            <div className="mt-6">
              <ManageBillingButton />
            </div>
          </>
        ) : (
          <>
            <p className="mt-3 text-2xl font-extrabold">
              Free · $0<span className="text-base font-medium text-gray-500">/mes</span>
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Incluye hasta {FREE_ORDER_LIMIT} pedidos al mes.
            </p>
          </>
        )}
      </div>

      {/* Upgrade card (only for Free) */}
      {!active && (
        <div className="rounded-xl border-2 border-whatsapp bg-white p-6">
          <h2 className="text-lg font-semibold">Pasar a Pro</h2>
          <p className="mt-1 text-3xl font-extrabold">
            {formatUsd(PRO_PRICE_MONTHLY)}
            <span className="text-base font-medium text-gray-500">/mes</span>
          </p>
          <p className="text-sm font-medium text-gray-600">
            {PRO_INCLUDED_ORDERS} pedidos incluidos · luego{" "}
            {formatUsd(PRO_OVERAGE_RATE)} por pedido extra
          </p>
          <ul className="mt-4 space-y-1 text-sm text-gray-700">
            <li>✓ Pedidos sin tope mensual</li>
            <li>✓ Todo lo del plan Free</li>
            <li>✓ Métricas y panel de control</li>
            <li>✓ Soporte prioritario</li>
          </ul>
          <div className="mt-6">
            <SubscribeButton
              label={
                merchant?.stripe_customer_id ? "Reactivar Pro" : "Pasar a Pro"
              }
            />
            <p className="mt-3 text-xs text-gray-400">
              Serás redirigido a Stripe para completar el proceso de forma
              segura. Puedes cancelar en cualquier momento.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
