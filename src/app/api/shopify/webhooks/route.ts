import { NextResponse } from "next/server";
import { verifyWebhookHmac } from "@/lib/shopify";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Single endpoint for Shopify webhooks. Handles the mandatory GDPR/compliance
 * topics (configured in the Partner Dashboard) and app/uninstalled (registered
 * automatically after OAuth). All requests are HMAC-verified against the raw body.
 */
export async function POST(request: Request) {
  const raw = await request.text();
  const hmac = request.headers.get("x-shopify-hmac-sha256");
  if (!verifyWebhookHmac(raw, hmac)) {
    return NextResponse.json({ error: "invalid_hmac" }, { status: 401 });
  }

  const topic = request.headers.get("x-shopify-topic") ?? "";
  const shopDomain = request.headers.get("x-shopify-shop-domain") ?? "";

  let payload: {
    customer?: { id?: number; email?: string; phone?: string };
  } = {};
  try {
    payload = JSON.parse(raw);
  } catch {
    // empty/invalid body — still acknowledged below
  }

  const admin = createAdminClient();

  try {
    switch (topic) {
      case "app/uninstalled": {
        // Merchant removed the app: stop using the token (keep history until shop/redact).
        if (shopDomain) {
          await admin
            .from("stores")
            .update({ access_token_encrypted: null })
            .eq("shopify_domain", shopDomain);
        }
        break;
      }
      case "shop/redact": {
        // Erase all data for the shop (sent ~48h after uninstall). Cascades to
        // store_configs / orders / events.
        if (shopDomain) {
          await admin.from("stores").delete().eq("shopify_domain", shopDomain);
        }
        break;
      }
      case "customers/redact": {
        // Erase the PII we hold for this customer (order name/phone).
        const phone = payload.customer?.phone;
        if (shopDomain && phone) {
          const { data: store } = await admin
            .from("stores")
            .select("id")
            .eq("shopify_domain", shopDomain)
            .maybeSingle();
          if (store) {
            await admin
              .from("orders")
              .update({ name: null, phone: null })
              .eq("store_id", store.id)
              .eq("phone", phone);
          }
        }
        break;
      }
      case "customers/data_request": {
        // We only store order name/phone. Acknowledge; the merchant fulfills the
        // request with the data available in their dashboard / Shopify.
        console.log(
          "customers/data_request",
          shopDomain,
          payload.customer?.id,
        );
        break;
      }
      default:
        break;
    }
  } catch (err) {
    // Log but still return 200 so Shopify doesn't retry indefinitely.
    console.error("Shopify webhook handler error", topic, err);
  }

  return NextResponse.json({ ok: true });
}
