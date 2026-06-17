import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encrypt } from "@/lib/crypto";
import {
  exchangeCodeForToken,
  getShopInfo,
  isValidShopDomain,
  registerWebhook,
  slugify,
  verifyOauthHmac,
} from "@/lib/shopify";
import { serverEnv } from "@/lib/env";

export const runtime = "nodejs";

function errorRedirect(base: string, code: string) {
  return NextResponse.redirect(`${base}/dashboard/stores?error=${code}`);
}

/** Find a globally-unique slug derived from `base`. */
async function uniqueSlug(base: string): Promise<string> {
  const admin = createAdminClient();
  const root = slugify(base);
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate =
      attempt === 0 ? root : `${root}-${Math.random().toString(36).slice(2, 6)}`;
    const { data } = await admin
      .from("store_configs")
      .select("store_id")
      .eq("slug", candidate)
      .maybeSingle();
    if (!data) return candidate;
  }
  return `${root}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function GET(request: Request) {
  const env = serverEnv();
  const url = new URL(request.url);
  const params = url.searchParams;

  const shop = params.get("shop") ?? "";
  const code = params.get("code") ?? "";
  const state = params.get("state") ?? "";

  // 1. Validate shop + HMAC + CSRF state.
  if (!isValidShopDomain(shop)) return errorRedirect(env.appBaseUrl, "invalid_shop");
  if (!verifyOauthHmac(params)) return errorRedirect(env.appBaseUrl, "bad_hmac");

  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookies = Object.fromEntries(
    cookieHeader.split(";").map((c) => {
      const [k, ...v] = c.trim().split("=");
      return [k, decodeURIComponent(v.join("="))];
    }),
  );
  if (
    !code ||
    !state ||
    cookies["shopify_oauth_state"] !== state ||
    cookies["shopify_oauth_shop"] !== shop
  ) {
    return errorRedirect(env.appBaseUrl, "bad_state");
  }

  // 2. Identify the authenticated merchant.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const login = new URL("/login", env.appBaseUrl);
    login.searchParams.set("redirectedFrom", "/dashboard/stores");
    return NextResponse.redirect(login);
  }
  const { data: merchant } = await supabase
    .from("merchants")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!merchant) return errorRedirect(env.appBaseUrl, "no_merchant");

  // 3. Exchange code for an offline access token.
  let accessToken: string;
  let grantedScopes: string;
  try {
    const token = await exchangeCodeForToken(shop, code);
    accessToken = token.access_token;
    grantedScopes = token.scope;
  } catch (err) {
    console.error("Shopify token exchange failed:", err);
    return errorRedirect(env.appBaseUrl, "token_exchange");
  }

  // 4. Fetch shop info (best-effort) to seed config.
  const info = await getShopInfo(shop, accessToken).catch(() => null);
  const encrypted = encrypt(accessToken);

  // 5. Upsert the store (RLS-scoped to this merchant).
  const { data: existing } = await supabase
    .from("stores")
    .select("id")
    .eq("shopify_domain", shop)
    .maybeSingle();

  let storeId: string;
  if (existing) {
    storeId = existing.id;
    await supabase
      .from("stores")
      .update({
        access_token_encrypted: encrypted,
        scopes: grantedScopes,
        country: info?.countryCode ?? null,
        currency: info?.currency ?? null,
      })
      .eq("id", storeId);
  } else {
    const { data: inserted, error } = await supabase
      .from("stores")
      .insert({
        merchant_id: merchant.id,
        shopify_domain: shop,
        access_token_encrypted: encrypted,
        scopes: grantedScopes,
        country: info?.countryCode ?? null,
        currency: info?.currency ?? null,
      })
      .select("id")
      .single();

    if (error || !inserted) {
      // Unique violation => shop already connected to another account.
      console.error("Store insert failed:", error);
      return errorRedirect(env.appBaseUrl, "shop_taken");
    }
    storeId = inserted.id;

    // Seed a default catalog config.
    const slug = await uniqueSlug(info?.name ?? shop.replace(".myshopify.com", ""));
    await supabase.from("store_configs").insert({
      store_id: storeId,
      slug,
      brand_name: info?.name ?? null,
      country: info?.countryCode ?? null,
      currency: info?.currency ?? null,
      checkout_mode: "whatsapp",
    });
  }

  // Register the uninstall webhook so we can clean up the token (best-effort).
  await registerWebhook(
    shop,
    accessToken,
    "app/uninstalled",
    `${env.shopifyAppUrl}/api/shopify/webhooks`,
  ).catch(() => {});

  // 6. Clear OAuth cookies and head to the store config.
  const response = NextResponse.redirect(
    `${env.appBaseUrl}/dashboard/stores/${storeId}?connected=1`,
  );
  response.cookies.delete("shopify_oauth_state");
  response.cookies.delete("shopify_oauth_shop");
  return response;
}
