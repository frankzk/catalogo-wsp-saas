import "server-only";
import crypto from "node:crypto";
import { serverEnv } from "@/lib/env";
import type { OrderItem } from "@/lib/types";

/**
 * Shopify public-app OAuth + Admin API helpers. Node runtime only.
 * Docs: https://shopify.dev/docs/apps/auth/oauth
 */

// ---- Shop domain helpers ----------------------------------------------------

/** Normalize user input ("my-shop", "my-shop.myshopify.com", a URL) to a domain. */
export function normalizeShopDomain(input: string | null | undefined): string | null {
  if (!input) return null;
  let s = input.trim().toLowerCase();
  s = s.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (!s) return null;
  if (!s.includes(".")) s = `${s}.myshopify.com`;
  return s;
}

export function isValidShopDomain(shop: string | null | undefined): shop is string {
  return !!shop && /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop);
}

/** URL-safe slug from arbitrary text. */
export function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // strip accents
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "tienda"
  );
}

// ---- OAuth ------------------------------------------------------------------

/** Build the Shopify authorize URL to redirect the merchant to. */
export function buildInstallUrl(shop: string, state: string): string {
  const env = serverEnv();
  const params = new URLSearchParams({
    client_id: env.shopifyApiKey,
    scope: env.shopifyScopes,
    redirect_uri: `${env.shopifyAppUrl}/api/shopify/callback`,
    state,
    // offline access token is the default (no grant_options[]=per-user)
  });
  return `https://${shop}/admin/oauth/authorize?${params.toString()}`;
}

/**
 * Verify the HMAC of an OAuth callback request (query-string based).
 * (Webhook HMAC is different — base64 of the raw body — handled in Phase 4.)
 */
export function verifyOauthHmac(params: URLSearchParams): boolean {
  const env = serverEnv();
  const hmac = params.get("hmac");
  if (!hmac || !env.shopifyApiSecret) return false;

  const entries: string[] = [];
  params.forEach((value, key) => {
    if (key === "hmac" || key === "signature") return;
    entries.push(`${key}=${value}`);
  });
  entries.sort();
  const message = entries.join("&");

  const digest = crypto
    .createHmac("sha256", env.shopifyApiSecret)
    .update(message)
    .digest("hex");

  const a = Buffer.from(digest, "utf8");
  const b = Buffer.from(hmac, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Verify a Shopify webhook. Unlike the OAuth HMAC (query string, hex), webhook
 * HMAC is the base64 HMAC-SHA256 of the RAW request body.
 */
export function verifyWebhookHmac(
  rawBody: string,
  hmacHeader: string | null,
): boolean {
  const env = serverEnv();
  if (!hmacHeader || !env.shopifyApiSecret) return false;
  const digest = crypto
    .createHmac("sha256", env.shopifyApiSecret)
    .update(rawBody, "utf8")
    .digest("base64");
  const a = Buffer.from(digest, "utf8");
  const b = Buffer.from(hmacHeader, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

interface AccessTokenResponse {
  access_token: string;
  scope: string;
}

/** Exchange the OAuth `code` for an offline access token. */
export async function exchangeCodeForToken(
  shop: string,
  code: string,
): Promise<AccessTokenResponse> {
  const env = serverEnv();
  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: env.shopifyApiKey,
      client_secret: env.shopifyApiSecret,
      code,
    }),
  });
  if (!res.ok) {
    throw new Error(`Shopify token exchange failed: ${res.status}`);
  }
  return (await res.json()) as AccessTokenResponse;
}

// ---- Admin API --------------------------------------------------------------

/** Low-level Admin REST fetch. `path` starts with "/" (after the version). */
export async function shopifyAdminFetch(
  shop: string,
  accessToken: string,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const env = serverEnv();
  const url = `https://${shop}/admin/api/${env.shopifyApiVersion}${path}`;
  return fetch(url, {
    ...init,
    headers: {
      "X-Shopify-Access-Token": accessToken,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

/** Register a webhook (e.g. app/uninstalled) after install. Best-effort. */
export async function registerWebhook(
  shop: string,
  accessToken: string,
  topic: string,
  address: string,
): Promise<boolean> {
  const res = await shopifyAdminFetch(shop, accessToken, "/webhooks.json", {
    method: "POST",
    body: JSON.stringify({ webhook: { topic, address, format: "json" } }),
  });
  return res.ok;
}

export interface ShopInfo {
  name: string;
  currency: string | null;
  countryCode: string | null;
}

/** Fetch basic shop info to seed the store config (name, currency, country). */
export async function getShopInfo(
  shop: string,
  accessToken: string,
): Promise<ShopInfo | null> {
  const res = await shopifyAdminFetch(shop, accessToken, "/shop.json");
  if (!res.ok) return null;
  const data = (await res.json()) as {
    shop?: { name?: string; currency?: string; country_code?: string };
  };
  if (!data.shop) return null;
  return {
    name: data.shop.name ?? shop,
    currency: data.shop.currency ?? null,
    countryCode: data.shop.country_code ?? null,
  };
}

// ---- Products ---------------------------------------------------------------

export interface ShopifyVariant {
  id: number;
  title: string;
  price: string;
  compare_at_price: string | null;
  inventory_quantity: number;
  inventory_management: string | null;
}

export interface ShopifyProduct {
  id: number;
  title: string;
  body_html: string | null;
  product_type: string | null;
  tags: string;
  status: string;
  images: { src: string }[];
  variants: ShopifyVariant[];
}

/** Fetch active products (cached for 5 min via the Next data cache). */
export async function getProducts(
  shop: string,
  accessToken: string,
  limit = 250,
): Promise<ShopifyProduct[]> {
  const res = await shopifyAdminFetch(
    shop,
    accessToken,
    `/products.json?status=active&limit=${limit}`,
    { next: { revalidate: 300 } },
  );
  if (!res.ok) return [];
  const data = (await res.json()) as { products?: ShopifyProduct[] };
  return data.products ?? [];
}

// ---- Customers & orders (COD checkout) -------------------------------------

export interface ShopifyAddress {
  address1?: string;
  address2?: string;
  city?: string;
  province?: string;
  zip?: string;
  country_code?: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
}

export interface ShopifyCustomer {
  id: number;
  default_address?: ShopifyAddress | null;
}

/** Find an existing customer by phone (for repeat-order address reuse). */
export async function findCustomerByPhone(
  shop: string,
  accessToken: string,
  phone: string,
): Promise<ShopifyCustomer | null> {
  const query = encodeURIComponent(`phone:${phone}`);
  const res = await shopifyAdminFetch(
    shop,
    accessToken,
    `/customers/search.json?query=${query}`,
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { customers?: ShopifyCustomer[] };
  return data.customers?.[0] ?? null;
}

// Financial statuses where money is involved — never cancel these (would refund).
const NON_MERGEABLE_FINANCIAL = new Set([
  "paid",
  "partially_paid",
  "partially_refunded",
  "refunded",
  "authorized",
]);

interface ShopifyLineItem {
  variant_id: number | null;
  title: string;
  name?: string;
  quantity: number;
  price: string;
}

interface ShopifyOrderFull {
  id: number;
  name: string;
  created_at: string;
  financial_status: string | null;
  fulfillment_status: string | null;
  cancelled_at: string | null;
  line_items: ShopifyLineItem[];
}

export interface MergeableShopifyOrder {
  id: number;
  name: string;
  items: OrderItem[];
}

/**
 * Find a still-open, UNPAID, unfulfilled order for the customer (by phone),
 * placed since `sinceISO` — across ALL of the shop's orders, not just ours.
 * Paid/refunded/authorized orders are skipped so we never trigger a refund.
 */
export async function findMergeableShopifyOrder(
  shop: string,
  accessToken: string,
  phone: string,
  sinceISO: string,
): Promise<MergeableShopifyOrder | null> {
  const customer = await findCustomerByPhone(shop, accessToken, phone);
  if (!customer) return null;

  const res = await shopifyAdminFetch(
    shop,
    accessToken,
    `/orders.json?customer_id=${customer.id}&status=open&created_at_min=${encodeURIComponent(
      sinceISO,
    )}&fields=id,name,created_at,financial_status,fulfillment_status,cancelled_at,line_items&limit=20`,
  );
  if (!res.ok) return null;

  const data = (await res.json()) as { orders?: ShopifyOrderFull[] };
  const orders = (data.orders ?? [])
    .slice()
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  for (const o of orders) {
    if (o.cancelled_at) continue;
    if (o.fulfillment_status != null) continue; // already (partly) shipped
    if (NON_MERGEABLE_FINANCIAL.has((o.financial_status ?? "").toLowerCase())) {
      continue; // paid / refunded / authorized → don't touch
    }
    const lines = o.line_items ?? [];
    if (lines.length === 0) continue;
    // Only merge if every line can be reconstructed (has a variant).
    if (!lines.every((li) => li.variant_id != null)) continue;

    const items: OrderItem[] = lines.map((li) => ({
      variant_id: li.variant_id as number,
      title: li.title || li.name || "Producto",
      quantity: li.quantity,
      price: Number(li.price),
    }));
    return { id: o.id, name: o.name, items };
  }
  return null;
}

/** Cancel an order (restocking inventory). Used when merging pending orders. */
export async function cancelOrder(
  shop: string,
  accessToken: string,
  orderId: string | number,
): Promise<boolean> {
  const res = await shopifyAdminFetch(
    shop,
    accessToken,
    `/orders/${orderId}/cancel.json`,
    {
      method: "POST",
      body: JSON.stringify({ restock: true, reason: "other", email: false }),
    },
  );
  return res.ok;
}

export interface CreateOrderInput {
  lineItems: { variant_id: number; quantity: number; price: string }[];
  phone: string;
  name?: string;
  customerId?: number;
  shippingAddress?: ShopifyAddress;
  currency?: string | null;
  note?: string;
  tags?: string;
}

export interface CreatedOrder {
  id: number;
  name: string;
  total: string;
}

/** Create a pending (cash-on-delivery) order in Shopify. */
export async function createOrder(
  shop: string,
  accessToken: string,
  input: CreateOrderInput,
): Promise<CreatedOrder | null> {
  const order: Record<string, unknown> = {
    line_items: input.lineItems,
    financial_status: "pending",
    gateway: "Cash on Delivery (COD)",
    send_receipt: false,
    send_fulfillment_receipt: false,
    inventory_behaviour: "decrement_obeying_policy",
    tags: input.tags ?? "COD, Catalogo WSP",
    note: input.note ?? "Pedido contra entrega (COD) vía catálogo",
  };

  order.customer = input.customerId
    ? { id: input.customerId }
    : { phone: input.phone, first_name: input.name ?? "Cliente" };

  if (input.shippingAddress) {
    order.shipping_address = {
      ...input.shippingAddress,
      phone: input.phone,
      first_name: input.shippingAddress.first_name ?? input.name ?? "Cliente",
      last_name: input.shippingAddress.last_name ?? "",
    };
  }
  if (input.currency) order.currency = input.currency;

  const res = await shopifyAdminFetch(shop, accessToken, "/orders.json", {
    method: "POST",
    body: JSON.stringify({ order }),
  });
  if (!res.ok) {
    console.error(
      "Shopify order creation failed:",
      res.status,
      await res.text().catch(() => ""),
    );
    return null;
  }
  const data = (await res.json()) as {
    order?: { id: number; name: string; total_price: string };
  };
  if (!data.order) return null;
  return {
    id: data.order.id,
    name: data.order.name,
    total: data.order.total_price,
  };
}
