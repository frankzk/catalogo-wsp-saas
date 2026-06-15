import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { syncSubscriptionForCustomer } from "@/lib/billing";
import { serverEnv } from "@/lib/env";

export const runtime = "nodejs";

/**
 * Stripe redirects here after a successful Checkout. We synchronously sync the
 * subscription so the dashboard sees an active status immediately (instead of
 * racing the asynchronous webhook), then forward to the dashboard.
 */
export async function GET(request: Request) {
  const env = serverEnv();
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session_id");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${env.appBaseUrl}/login`);
  }

  if (sessionId) {
    try {
      const stripe = getStripe();
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["subscription"],
      });
      if (session.customer) {
        const sub =
          session.subscription && typeof session.subscription === "object"
            ? (session.subscription as Stripe.Subscription)
            : undefined;
        await syncSubscriptionForCustomer(session.customer as string, sub);
      }
    } catch (err) {
      console.error("Post-checkout sync failed:", err);
    }
  }

  return NextResponse.redirect(`${env.appBaseUrl}/dashboard?checkout=success`);
}
