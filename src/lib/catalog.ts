import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/crypto";
import { getProducts, type ShopifyProduct } from "@/lib/shopify";
import { FREE_ORDER_LIMIT, planTier } from "@/lib/plans";
import type {
  CatalogConfig,
  CatalogData,
  CatalogProduct,
  Merchant,
  OrderItem,
  Store,
  StoreConfig,
} from "@/lib/types";

export interface CatalogContext {
  store: Store;
  config: StoreConfig;
  merchant: Merchant | null;
}

/** Load store + config + merchant for a public slug (service role; RLS bypassed). */
export async function getCatalogContext(
  slug: string,
): Promise<CatalogContext | null> {
  const admin = createAdminClient();
  const { data: config } = await admin
    .from("store_configs")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (!config) return null;

  const { data: store } = await admin
    .from("stores")
    .select("*")
    .eq("id", config.store_id)
    .maybeSingle();
  if (!store) return null;

  const { data: merchant } = await admin
    .from("merchants")
    .select("*")
    .eq("id", store.merchant_id)
    .maybeSingle();

  return {
    store: store as Store,
    config: config as StoreConfig,
    merchant: (merchant as Merchant) ?? null,
  };
}

export async function getStoreIdBySlug(slug: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("store_configs")
    .select("store_id")
    .eq("slug", slug)
    .maybeSingle();
  return data?.store_id ?? null;
}

function startOfMonthISO(): string {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function ordersThisMonth(storeId: string): Promise<number> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId)
    .neq("status", "merged")
    .neq("status", "cancelled")
    .gte("created_at", startOfMonthISO());
  return count ?? 0;
}

export interface MergeableOrder {
  id: string;
  shopify_order_id: string;
  items_json: OrderItem[];
}

/**
 * Find a still-pending order from the same customer (phone) at the same store
 * placed within the last 48h — a candidate to merge the new order into.
 */
export async function findMergeableOrder(
  storeId: string,
  phone: string,
): Promise<MergeableOrder | null> {
  const admin = createAdminClient();
  const since = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
  const { data } = await admin
    .from("orders")
    .select("id, shopify_order_id, items_json")
    .eq("store_id", storeId)
    .eq("phone", phone)
    .eq("status", "pending")
    .not("shopify_order_id", "is", null)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data?.shopify_order_id) return null;
  return {
    id: data.id,
    shopify_order_id: data.shopify_order_id,
    items_json: (data.items_json ?? []) as OrderItem[],
  };
}

function discountFactor(percent: number): number {
  const p = Math.min(95, Math.max(0, percent || 0));
  return 1 - p / 100;
}

export function discountedInt(rawPrice: string | number, percent: number): number {
  return Math.round(Number(rawPrice) * discountFactor(percent));
}

function stripHtml(html: string | null): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

const BESTSELLER_RE = /best.?seller|destacad|m[aá]s.?vendido/i;

function transformProducts(
  raw: ShopifyProduct[],
  discount: number,
): { products: CatalogProduct[]; categories: string[] } {
  const products: CatalogProduct[] = [];

  for (const p of raw) {
    const variants = p.variants.map((v) => {
      const available =
        v.inventory_management == null || (v.inventory_quantity ?? 0) > 0;
      return {
        id: v.id,
        title: v.title,
        price: discountedInt(v.price, discount),
        compareAtPrice: discount > 0 ? Math.round(Number(v.price)) : null,
        available,
      };
    });

    // Hide sold-out products (all variants unavailable).
    if (!variants.some((v) => v.available)) continue;

    const prices = variants.map((v) => v.price);
    const category =
      (p.product_type && p.product_type.trim()) || "Otros";

    products.push({
      id: p.id,
      title: p.title,
      description: stripHtml(p.body_html),
      images: (p.images ?? []).map((i) => i.src),
      category,
      variants,
      priceFrom: Math.min(...prices),
      compareAtFrom:
        discount > 0 ? Math.min(...variants.map((v) => v.compareAtPrice ?? v.price)) : null,
      bestseller: BESTSELLER_RE.test(p.tags ?? ""),
    });
  }

  // "Más vendidos primero": bestseller tag first, then alphabetical.
  products.sort(
    (a, b) =>
      Number(b.bestseller) - Number(a.bestseller) ||
      a.title.localeCompare(b.title),
  );

  const categories = Array.from(new Set(products.map((p) => p.category)));
  return { products, categories };
}

function toCatalogConfig(
  config: StoreConfig,
  checkoutEnabled: boolean,
  reason: string | null,
): CatalogConfig {
  return {
    slug: config.slug,
    brandName: config.brand_name,
    logoUrl: config.logo_url,
    headline: config.headline,
    subtitle: config.subtitle,
    whatsappNumber: config.whatsapp_number,
    checkoutMode: config.checkout_mode,
    country: config.country,
    currency: config.currency,
    trustBadges: config.trust_badges_json ?? [],
    discountPercent: config.discount_percent,
    checkoutEnabled,
    checkoutDisabledReason: reason,
  };
}

/** Whether COD checkout should be blocked (Free monthly cap reached). */
export async function isCheckoutBlocked(
  ctx: CatalogContext,
): Promise<{ blocked: boolean; reason: string | null }> {
  const { store, config, merchant } = ctx;
  if (config.checkout_mode !== "cod") return { blocked: false, reason: null };

  const tier = planTier(merchant?.subscription_status);
  if (tier === "pro") return { blocked: false, reason: null };

  if (config.disable_checkout_when_unpaid) {
    const count = await ordersThisMonth(store.id);
    if (count >= FREE_ORDER_LIMIT) {
      return { blocked: true, reason: "limit_reached" };
    }
  }
  return { blocked: false, reason: null };
}

/** Build everything the public catalog page needs (no secrets included). */
export async function buildCatalogData(slug: string): Promise<CatalogData | null> {
  const ctx = await getCatalogContext(slug);
  if (!ctx) return null;
  const { store, config } = ctx;

  let products: CatalogProduct[] = [];
  let categories: string[] = [];
  if (store.access_token_encrypted) {
    try {
      const token = decrypt(store.access_token_encrypted);
      const raw = await getProducts(store.shopify_domain!, token);
      ({ products, categories } = transformProducts(raw, config.discount_percent));
    } catch (err) {
      console.error("Failed to load catalog products:", err);
    }
  }

  const { blocked, reason } = await isCheckoutBlocked(ctx);

  return {
    slug: config.slug,
    storeId: store.id,
    config: toCatalogConfig(config, !blocked, reason),
    categories,
    products,
  };
}
