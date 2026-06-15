import "server-only";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Mirrors a customer's latest Stripe subscription into the merchants table.
 * Shared by the Stripe webhook and the post-checkout success redirect (the
 * latter avoids the race where the user returns before the webhook lands).
 */
export async function syncSubscriptionForCustomer(
  customerId: string,
  provided?: Stripe.Subscription,
): Promise<void> {
  const stripe = getStripe();

  let subscription = provided;
  if (!subscription) {
    const subs = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 1,
    });
    subscription = subs.data[0];
  }

  const status = subscription?.status ?? "canceled";
  const trialEnd = subscription?.trial_end
    ? new Date(subscription.trial_end * 1000).toISOString()
    : null;
  const priceId = subscription?.items?.data?.[0]?.price?.id ?? null;

  const admin = createAdminClient();
  const { error } = await admin
    .from("merchants")
    .update({
      subscription_status: status,
      trial_ends_at: trialEnd,
      plan: priceId,
    })
    .eq("stripe_customer_id", customerId);

  if (error) {
    console.error("Failed to sync subscription for", customerId, error);
  }
}
