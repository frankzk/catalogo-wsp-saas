import { getCurrentMerchant, isSubscriptionActive } from "@/lib/subscription";
import { SubscriptionBadge } from "@/components/subscription-badge";
import {
  ManageBillingButton,
  SubscribeButton,
} from "@/components/billing-buttons";

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
  const trialEnds = formatDate(merchant?.trial_ends_at ?? null);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Facturación</h1>
        <p className="mt-1 text-sm text-gray-500">
          Gestiona tu suscripción al plan Pro.
        </p>
      </div>

      {params.reason === "subscription_required" && !active && (
        <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Necesitas una suscripción activa para acceder al panel. Activa tu
          prueba gratis para continuar.
        </div>
      )}

      {params.checkout === "cancelled" && (
        <div className="rounded-lg bg-gray-100 px-4 py-3 text-sm text-gray-700">
          Cancelaste el proceso de pago. Puedes intentarlo de nuevo cuando
          quieras.
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Plan Pro</h2>
          <SubscriptionBadge status={merchant?.subscription_status} />
        </div>
        <p className="mt-1 text-3xl font-extrabold">
          $29
          <span className="text-base font-medium text-gray-500">/mes</span>
        </p>

        {trialEnds && (
          <p className="mt-2 text-sm text-gray-500">
            {merchant?.subscription_status === "trialing"
              ? `Tu prueba termina el ${trialEnds}.`
              : `Periodo de prueba: hasta el ${trialEnds}.`}
          </p>
        )}

        <div className="mt-6">
          {active ? (
            <ManageBillingButton />
          ) : (
            <>
              <SubscribeButton
                label={
                  merchant?.stripe_customer_id
                    ? "Reactivar suscripción"
                    : "Empezar prueba gratis de 14 días"
                }
              />
              <p className="mt-3 text-xs text-gray-400">
                Serás redirigido a Stripe para completar el proceso de forma
                segura. Puedes cancelar en cualquier momento.
              </p>
            </>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600">
        <h3 className="mb-2 font-semibold text-gray-900">¿Qué incluye?</h3>
        <ul className="space-y-1">
          <li>✓ Catálogo estilo WhatsApp por tienda</li>
          <li>✓ Checkout COD y WhatsApp</li>
          <li>✓ Integración con Shopify</li>
          <li>✓ Notificaciones por Telegram</li>
          <li>✓ Métricas y panel de control</li>
        </ul>
      </div>
    </div>
  );
}
