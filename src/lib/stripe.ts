import Stripe from "stripe";
import { requireEnv, serverEnv } from "@/lib/env";

let cached: Stripe | null = null;

/** Lazily-initialized Stripe client (server only). */
export function getStripe(): Stripe {
  if (cached) return cached;
  const key = requireEnv(serverEnv().stripeSecretKey, "STRIPE_SECRET_KEY");
  cached = new Stripe(key, {
    // Omit apiVersion to use the version pinned by the installed SDK.
    typescript: true,
    appInfo: { name: "Catalogo WhatsApp COD SaaS" },
  });
  return cached;
}
