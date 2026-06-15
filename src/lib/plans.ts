import { isSubscriptionActive } from "@/lib/subscription-status";

/**
 * Single source of truth for the pricing model (freemium):
 *  - Free: $0/mo, up to FREE_ORDER_LIMIT orders/month (hard cap).
 *  - Pro:  $4.90/mo, includes PRO_INCLUDED_ORDERS orders, then
 *          PRO_OVERAGE_RATE per extra order (billed via Stripe tiered meter).
 *
 * Pure module (no server/Node imports) so it is usable from client, server
 * and Edge middleware.
 */

export type PlanTier = "free" | "pro";

export const FREE_ORDER_LIMIT = 10; // pedidos/mes incluidos en Free (tope duro)
export const PRO_PRICE_MONTHLY = 4.9; // USD/mes
export const PRO_INCLUDED_ORDERS = 10; // incluidos en Pro antes del excedente
export const PRO_OVERAGE_RATE = 0.05; // USD por pedido excedente (#11+)

/** Entitlement tier derived from the Stripe subscription status. */
export function planTier(
  subscriptionStatus: string | null | undefined,
): PlanTier {
  return isSubscriptionActive(subscriptionStatus) ? "pro" : "free";
}

/** Orders included before any cap / overage applies. */
export function includedOrders(tier: PlanTier): number {
  return tier === "pro" ? PRO_INCLUDED_ORDERS : FREE_ORDER_LIMIT;
}

/** Format a USD amount as e.g. "$4.90" / "$0.05" / "$0". */
export function formatUsd(amount: number): string {
  return amount === 0 ? "$0" : `$${amount.toFixed(2)}`;
}
