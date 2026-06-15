import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  buildInstallUrl,
  isValidShopDomain,
  normalizeShopDomain,
} from "@/lib/shopify";
import { requireEnv, serverEnv } from "@/lib/env";

export const runtime = "nodejs";

/**
 * Starts the Shopify OAuth install flow. Must be reached by an authenticated
 * merchant (self-serve from the dashboard). Sets a CSRF nonce cookie and
 * redirects to Shopify's authorize screen.
 */
export async function GET(request: Request) {
  const env = serverEnv();
  const { searchParams } = new URL(request.url);

  const shop = normalizeShopDomain(searchParams.get("shop"));
  if (!isValidShopDomain(shop)) {
    return NextResponse.redirect(
      `${env.appBaseUrl}/dashboard/stores?error=invalid_shop`,
    );
  }

  // Require an authenticated merchant; bounce through login if needed.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const login = new URL("/login", env.appBaseUrl);
    login.searchParams.set(
      "redirectedFrom",
      `/api/shopify/install?shop=${shop}`,
    );
    return NextResponse.redirect(login);
  }

  requireEnv(env.shopifyApiKey, "SHOPIFY_API_KEY");
  requireEnv(env.shopifyApiSecret, "SHOPIFY_API_SECRET");

  const nonce = crypto.randomBytes(16).toString("hex");
  const authUrl = buildInstallUrl(shop, nonce);

  const response = NextResponse.redirect(authUrl);
  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 600, // 10 minutes
  };
  response.cookies.set("shopify_oauth_state", nonce, cookieOpts);
  response.cookies.set("shopify_oauth_shop", shop, cookieOpts);
  return response;
}
