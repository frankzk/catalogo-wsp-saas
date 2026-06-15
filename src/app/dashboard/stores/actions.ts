"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/crypto";
import { slugify } from "@/lib/shopify";
import type { TrustBadge } from "@/lib/types";

export interface SaveState {
  ok: boolean;
  message: string;
}

function str(value: FormDataEntryValue | null): string | null {
  const s = (value ?? "").toString().trim();
  return s.length ? s : null;
}

function clampInt(value: FormDataEntryValue | null, min: number, max: number): number {
  const n = Math.round(Number(value ?? 0));
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function parseBadges(value: string): TrustBadge[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 10)
    .map((text) => ({ text }));
}

/** Save (upsert) the public catalog config for a store the merchant owns. */
export async function saveStoreConfig(
  _prev: SaveState,
  formData: FormData,
): Promise<SaveState> {
  const storeId = String(formData.get("store_id") ?? "");
  if (!storeId) return { ok: false, message: "Falta la tienda." };

  const supabase = await createClient();

  // RLS ensures the merchant can only read their own store.
  const { data: store } = await supabase
    .from("stores")
    .select("id")
    .eq("id", storeId)
    .maybeSingle();
  if (!store) return { ok: false, message: "Tienda no encontrada." };

  const slug = slugify(String(formData.get("slug") ?? ""));
  if (!slug) return { ok: false, message: "El enlace (slug) es obligatorio." };

  const payload: Record<string, unknown> = {
    store_id: storeId,
    slug,
    brand_name: str(formData.get("brand_name")),
    logo_url: str(formData.get("logo_url")),
    headline: str(formData.get("headline")),
    subtitle: str(formData.get("subtitle")),
    discount_percent: clampInt(formData.get("discount_percent"), 0, 95),
    whatsapp_number: str(formData.get("whatsapp_number")),
    country: str(formData.get("country")),
    currency: str(formData.get("currency")),
    checkout_mode:
      String(formData.get("checkout_mode")) === "cod" ? "cod" : "whatsapp",
    telegram_chat_id: str(formData.get("telegram_chat_id")),
    trust_badges_json: parseBadges(String(formData.get("trust_badges") ?? "")),
    disable_checkout_when_unpaid:
      formData.get("disable_checkout_when_unpaid") === "on",
  };

  // Only overwrite the encrypted Telegram token when a new one is provided.
  const telegramToken = String(formData.get("telegram_bot_token") ?? "").trim();
  if (telegramToken) {
    payload.telegram_bot_token_enc = encrypt(telegramToken);
  }

  const { error } = await supabase
    .from("store_configs")
    .upsert(payload, { onConflict: "store_id" });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, message: "Ese enlace ya está en uso. Elige otro." };
    }
    console.error("saveStoreConfig error:", error);
    return { ok: false, message: "No se pudo guardar. Intenta de nuevo." };
  }

  revalidatePath(`/dashboard/stores/${storeId}`);
  return { ok: true, message: "Cambios guardados." };
}

/** Disconnect (delete) a store and its config/orders (cascade). */
export async function disconnectStore(formData: FormData) {
  const storeId = String(formData.get("store_id") ?? "");
  if (storeId) {
    const supabase = await createClient();
    await supabase.from("stores").delete().eq("id", storeId);
  }
  redirect("/dashboard/stores");
}
