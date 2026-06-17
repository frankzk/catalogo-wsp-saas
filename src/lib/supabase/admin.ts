import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { requireEnv, serverEnv } from "@/lib/env";

/**
 * Supabase client using the service_role key. BYPASSES Row Level Security.
 * SERVER ONLY — use for Stripe/Shopify webhooks, server-side order creation
 * and public-catalog event tracking. Never import this into client code.
 */
export function createAdminClient() {
  const env = serverEnv();
  return createSupabaseClient(
    requireEnv(env.supabaseUrl, "SUPABASE_URL"),
    requireEnv(env.supabaseServiceRoleKey, "SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}
