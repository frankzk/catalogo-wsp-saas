import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Merchant } from "@/lib/types";

export {
  isSubscriptionActive,
  type SubscriptionStatus,
} from "@/lib/subscription-status";

/** Fetch the merchant row for the currently authenticated user (RLS-scoped). */
export async function getCurrentMerchant(): Promise<Merchant | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("merchants")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  return (data as Merchant) ?? null;
}
