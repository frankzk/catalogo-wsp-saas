import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { serverEnv } from "@/lib/env";

export const runtime = "nodejs";

/** Opens the Stripe Customer Portal so the merchant can manage/cancel their plan. */
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
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!merchant?.stripe_customer_id) {
    return NextResponse.json(
      { error: "no_stripe_customer" },
      { status: 400 },
    );
  }

  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: merchant.stripe_customer_id,
    return_url: env.stripePortalReturnUrl,
  });

  return NextResponse.json({ url: session.url });
}
