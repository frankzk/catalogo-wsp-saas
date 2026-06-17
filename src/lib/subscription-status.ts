/**
 * Pure subscription-status helpers. No server/Node imports so this module is
 * safe to use from Edge middleware and from client components.
 */

export type SubscriptionStatus =
  | "none"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired"
  | "paused";

/** Statuses that grant access to the paid product. */
const ENTITLED: ReadonlySet<string> = new Set(["trialing", "active"]);

/**
 * Whether a subscription status grants access. We deliberately cut access on
 * `past_due` / `unpaid` / `canceled` ("CORTAN acceso si no paga").
 */
export function isSubscriptionActive(
  status: string | null | undefined,
): boolean {
  return !!status && ENTITLED.has(status);
}
