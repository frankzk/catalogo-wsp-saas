import { NextResponse } from "next/server";
import {
  discountedInt,
  getCatalogContext,
  isCheckoutBlocked,
} from "@/lib/catalog";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/crypto";
import {
  cancelOrder,
  createOrder,
  findCustomerByPhone,
  findMergeableShopifyOrder,
  getProducts,
  type ShopifyAddress,
} from "@/lib/shopify";
import { mergeOrderItems } from "@/lib/order-merge";
import { reportOrderUsage } from "@/lib/billing";
import { sendTelegramMessage } from "@/lib/telegram";
import { planTier } from "@/lib/plans";
import { formatMoney } from "@/lib/money";
import type { OrderItem } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ctx = await getCatalogContext(slug);
  if (!ctx) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { store, config, merchant } = ctx;
  if (config.checkout_mode !== "cod") {
    return NextResponse.json({ error: "not_cod" }, { status: 400 });
  }
  if (!store.access_token_encrypted || !store.shopify_domain) {
    return NextResponse.json({ error: "store_not_connected" }, { status: 400 });
  }
  const shopDomain = store.shopify_domain;
  const encryptedToken = store.access_token_encrypted;

  const body = (await request.json().catch(() => null)) as {
    phone?: string;
    name?: string;
    address?: Record<string, string>;
    items?: { variantId: number; quantity: number }[];
  } | null;

  const phone = (body?.phone ?? "").trim();
  const name = (body?.name ?? "").trim();
  const itemsIn = Array.isArray(body?.items) ? body!.items : [];
  if (!phone || itemsIn.length === 0) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const token = decrypt(encryptedToken);

  // Recompute prices/availability from Shopify — never trust the client.
  const raw = await getProducts(shopDomain, token);
  const index = new Map<
    number,
    { price: number; available: boolean; title: string; productTitle: string }
  >();
  for (const p of raw) {
    for (const v of p.variants) {
      index.set(v.id, {
        price: discountedInt(v.price, config.discount_percent),
        available:
          v.inventory_management == null || (v.inventory_quantity ?? 0) > 0,
        title: v.title,
        productTitle: p.title,
      });
    }
  }

  const newItems: OrderItem[] = [];
  for (const it of itemsIn) {
    const variantId = Number(it.variantId);
    const quantity = Math.max(1, Math.min(99, Number(it.quantity) || 1));
    const v = index.get(variantId);
    if (!v || !v.available) continue;
    newItems.push({
      variant_id: variantId,
      title:
        v.title && v.title !== "Default Title"
          ? `${v.productTitle} - ${v.title}`
          : v.productTitle,
      quantity,
      price: v.price,
    });
  }
  if (newItems.length === 0) {
    return NextResponse.json({ error: "no_valid_items" }, { status: 400 });
  }

  // --- Order merging --------------------------------------------------------
  // Look across ALL of the customer's Shopify orders (by phone) in the last 48h
  // for one that is open, unfulfilled and UNPAID (paid orders are never touched,
  // to avoid refunds). If found, consolidate into a single new order.
  const since48h = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
  const merge = await findMergeableShopifyOrder(
    shopDomain,
    token,
    phone,
    since48h,
  ).catch(() => null);

  const admin = createAdminClient();

  // Was the order to merge one of OURS (already counted/metered this period)?
  let mergedOursId: string | null = null;
  if (merge) {
    const { data: ourRow } = await admin
      .from("orders")
      .select("id")
      .eq("shopify_order_id", String(merge.id))
      .neq("status", "merged")
      .neq("status", "cancelled")
      .maybeSingle();
    mergedOursId = ourRow?.id ?? null;
  }
  const mergeIsOurs = !!mergedOursId;

  // The monthly Free cap is bypassed only when merging one of our own orders
  // (net count unchanged). A merge of an external order is a net-new order.
  if (!(merge && mergeIsOurs)) {
    const { blocked } = await isCheckoutBlocked(ctx);
    if (blocked) {
      return NextResponse.json({ error: "limit_reached" }, { status: 402 });
    }
  }

  const { itemsJson, total } = merge
    ? mergeOrderItems(merge.items, newItems)
    : {
        itemsJson: newItems,
        total: newItems.reduce((s, it) => s + it.price * it.quantity, 0),
      };

  const lineItems = itemsJson
    .filter((it) => it.variant_id != null)
    .map((it) => ({
      variant_id: Number(it.variant_id),
      quantity: it.quantity,
      price: String(it.price),
    }));
  if (lineItems.length === 0) {
    return NextResponse.json({ error: "no_valid_items" }, { status: 400 });
  }

  // Customer by phone (repeat order → reuse saved address).
  const existing = await findCustomerByPhone(shopDomain, token, phone).catch(
    () => null,
  );
  const addr = body?.address ?? {};
  const hasNewAddress = !!(addr.address1 || addr.city);
  const shippingAddress: ShopifyAddress | undefined = hasNewAddress
    ? {
        address1: addr.address1 || undefined,
        city: addr.city || undefined,
        province: addr.province || undefined,
        zip: addr.zip || undefined,
        country_code: config.country || undefined,
      }
    : (existing?.default_address ?? undefined);

  const created = await createOrder(shopDomain, token, {
    lineItems,
    phone,
    name: name || undefined,
    customerId: existing?.id,
    shippingAddress,
    currency: config.currency,
    note: merge
      ? `Pedido fusionado (incluye el pedido ${merge.name} de <48h del mismo cliente)`
      : undefined,
  });
  if (!created) {
    return NextResponse.json({ error: "shopify_error" }, { status: 502 });
  }

  // Cancel the previous (unpaid) order and mark our copy as merged, if any.
  if (merge) {
    await cancelOrder(shopDomain, token, merge.id).catch(() => {});
    if (mergedOursId) {
      await admin
        .from("orders")
        .update({ status: "merged" })
        .eq("id", mergedOursId);
    }
  }

  const { data: dbOrder } = await admin
    .from("orders")
    .insert({
      store_id: store.id,
      shopify_order_id: String(created.id),
      status: "pending",
      name: name || null,
      phone,
      total,
      currency: config.currency,
      items_json: itemsJson,
    })
    .select("id")
    .single();

  await admin.from("events").insert({
    store_id: store.id,
    type: "order",
    payload_json: {
      channel: "cod",
      shopify_order_id: created.id,
      total,
      merged: !!merge,
    },
  });

  // Meter the order unless we merged one of our already-metered orders.
  const tier = planTier(merchant?.subscription_status);
  if (
    !(merge && mergeIsOurs) &&
    tier === "pro" &&
    merchant?.stripe_customer_id
  ) {
    await reportOrderUsage(merchant.stripe_customer_id, {
      identifier: dbOrder?.id ?? String(created.id),
    });
  }

  // Telegram notification.
  if (config.telegram_bot_token_enc && config.telegram_chat_id) {
    try {
      const botToken = decrypt(config.telegram_bot_token_enc);
      const lines = itemsJson.map((i) => `• ${i.quantity}x ${i.title}`).join("\n");
      const mergeNote = merge
        ? `\n🔗 <i>Fusiona el pedido ${merge.name} (&lt;48h, sin pagar), cancelado para envío único.</i>`
        : "";
      const text = `🛒 <b>Nuevo pedido</b> ${created.name}\n${lines}\n\n<b>Total:</b> ${formatMoney(
        total,
        config.currency,
      )}\n<b>Cliente:</b> ${name || "—"}\n<b>WhatsApp:</b> ${phone}${mergeNote}`;
      await sendTelegramMessage(botToken, config.telegram_chat_id, text);
    } catch (err) {
      console.error("Telegram notify failed:", err);
    }
  }

  return NextResponse.json({
    ok: true,
    orderName: created.name,
    merged: !!merge,
  });
}
