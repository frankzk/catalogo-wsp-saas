import type { PlanTier } from "@/lib/plans";

export function PlanBadge({ tier }: { tier: PlanTier }) {
  const isPro = tier === "pro";
  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
        isPro ? "bg-whatsapp text-white" : "bg-gray-100 text-gray-600"
      }`}
    >
      {isPro ? "Pro" : "Free"}
    </span>
  );
}
