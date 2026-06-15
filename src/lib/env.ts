/**
 * Centralized environment access.
 *
 * Public values (safe in the browser) are referenced literally as
 * `process.env.NEXT_PUBLIC_*` so Next.js can inline them at build time.
 * Server-only secrets are read lazily through `serverEnv()` so that a missing
 * value fails at request time with a clear message instead of breaking builds.
 */

// ---- Public (browser-safe) --------------------------------------------------
export const NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const NEXT_PUBLIC_APP_BASE_URL =
  process.env.NEXT_PUBLIC_APP_BASE_URL ?? "http://localhost:3000";

// ---- Server-only ------------------------------------------------------------
export function serverEnv() {
  const appBaseUrl =
    process.env.APP_BASE_URL ?? NEXT_PUBLIC_APP_BASE_URL ?? "http://localhost:3000";

  return {
    appBaseUrl,
    // Supabase (fall back to the public values when the server-only alias is unset)
    supabaseUrl: process.env.SUPABASE_URL ?? NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? NEXT_PUBLIC_SUPABASE_ANON_KEY,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    // Stripe
    stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
    stripePriceId: process.env.STRIPE_PRICE_ID ?? "",
    stripeUsagePriceId: process.env.STRIPE_USAGE_PRICE_ID ?? "",
    stripeUsageMeterEvent:
      process.env.STRIPE_USAGE_METER_EVENT ?? "order_generated",
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
    stripePortalReturnUrl:
      process.env.STRIPE_PORTAL_RETURN_URL ?? `${appBaseUrl}/dashboard/billing`,
    stripeTrialDays: Number(process.env.STRIPE_TRIAL_DAYS ?? "0"),
    // Shopify (used in Phase 2)
    shopifyApiKey: process.env.SHOPIFY_API_KEY ?? "",
    shopifyApiSecret: process.env.SHOPIFY_API_SECRET ?? "",
    shopifyScopes:
      process.env.SHOPIFY_SCOPES ??
      "read_products,read_inventory,write_orders,read_customers,write_customers",
    shopifyAppUrl: process.env.SHOPIFY_APP_URL ?? appBaseUrl,
    // Encryption
    tokenEncryptionKey: process.env.TOKEN_ENCRYPTION_KEY ?? "",
  };
}

/** Throw a clear error when a required value is missing. */
export function requireEnv(value: string, name: string): string {
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Add it to .env.local (see .env.example).`,
    );
  }
  return value;
}
