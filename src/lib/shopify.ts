import "server-only";
import crypto from "node:crypto";
import { serverEnv } from "@/lib/env";

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
