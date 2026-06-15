import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { requireEnv, serverEnv } from "@/lib/env";

export const runtime = "nodejs";

/**
 * Creates a Stripe Checkout session for the monthly flat plan (with trial).
 * Ensures the merchant has a Stripe customer and persists its id.
 */
export async function POST() {
  const env = serverEnv();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: merchant } = await supabase
    .from("merchants")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!merchant) {
    return NextResponse.json({ error: "merchant_not_found" }, { status: 404 });
  }

  const stripe = getStripe();
  const admin = createAdminClient();

  // Ensure a Stripe customer exists for this merchant.
  let customerId = merchant.stripe_customer_id as string | null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { merchant_id: merchant.id, supabase_user_id: user.id },
    });
    customerId = customer.id;
    await admin
      .from("merchants")
      .update({ stripe_customer_id: customerId })
      .eq("id", merchant.id);
  }

  const priceId = requireEnv(env.stripePriceId, "STRIPE_PRICE_ID");
  const trialDays = env.stripeTrialDays;

  // Pro base plan ($4.90/mo) + optional metered overage price (tiered: first 10
  // orders $0, then $0.05/order). Metered prices must NOT include a quantity.
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    { price: priceId, quantity: 1 },
  ];
  if (env.stripeUsagePriceId) {
    lineItems.push({ price: env.stripeUsagePriceId });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: lineItems,
    subscription_data: {
      // Only first-timers should really get a trial; for MVP we always offer it.
      trial_period_days: trialDays > 0 ? trialDays : undefined,
      metadata: { merchant_id: merchant.id },
    },
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    success_url: `${env.appBaseUrl}/api/stripe/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.appBaseUrl}/dashboard/billing?checkout=cancelled`,
  });

  return NextResponse.json({ url: session.url });
}
