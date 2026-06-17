const LABELS: Record<string, string> = {
  none: "Sin suscripción",
  trialing: "En prueba",
  active: "Activa",
  past_due: "Pago pendiente",
  canceled: "Cancelada",
  unpaid: "Impaga",
  incomplete: "Incompleta",
  incomplete_expired: "Expirada",
  paused: "Pausada",
};

const STYLES: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  trialing: "bg-blue-100 text-blue-700",
  past_due: "bg-amber-100 text-amber-700",
  unpaid: "bg-red-100 text-red-700",
  canceled: "bg-red-100 text-red-700",
  incomplete_expired: "bg-red-100 text-red-700",
};

export function SubscriptionBadge({
  status,
}: {
  status: string | null | undefined;
}) {
  const s = status ?? "none";
  const cls = STYLES[s] ?? "bg-gray-100 text-gray-600";
  return (
    <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${cls}`}>
      {LABELS[s] ?? s}
    </span>
  );
}
