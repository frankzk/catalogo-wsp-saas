import crypto from "node:crypto";
import { describe, it, expect } from "vitest";
import {
  normalizeShopDomain,
  isValidShopDomain,
  slugify,
  verifyOauthHmac,
  verifyWebhookHmac,
} from "@/lib/shopify";

const SECRET = "test_shopify_secret"; // matches test/setup.ts

describe("normalizeShopDomain", () => {
  it("normalizes various inputs", () => {
    expect(normalizeShopDomain("my-shop")).toBe("my-shop.myshopify.com");
    expect(normalizeShopDomain("https://My-Shop.myshopify.com/admin")).toBe(
      "my-shop.myshopify.com",
    );
    expect(normalizeShopDomain("   ")).toBeNull();
    expect(normalizeShopDomain(null)).toBeNull();
  });
});

describe("isValidShopDomain", () => {
  it("accepts only *.myshopify.com", () => {
    expect(isValidShopDomain("cool.myshopify.com")).toBe(true);
    expect(isValidShopDomain("evil.com")).toBe(false);
    expect(isValidShopDomain("a.myshopify.com.evil.com")).toBe(false);
    expect(isValidShopDomain(null)).toBe(false);
  });
});

describe("slugify", () => {
  it("produces url-safe slugs and strips accents", () => {
    expect(slugify("Mi Tienda Genial!")).toBe("mi-tienda-genial");
    expect(slugify("Café Olé")).toBe("cafe-ole");
    expect(slugify("")).toBe("tienda");
  });
});

describe("verifyOauthHmac", () => {
  function signOauth(params: Record<string, string>): string {
    const msg = Object.keys(params)
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join("&");
    return crypto.createHmac("sha256", SECRET).update(msg).digest("hex");
  }

  it("accepts a valid signature", () => {
    const base = {
      shop: "x.myshopify.com",
      code: "abc",
      state: "nonce",
      timestamp: "123",
    };
    const sp = new URLSearchParams({ ...base, hmac: signOauth(base) });
    expect(verifyOauthHmac(sp)).toBe(true);
  });

  it("rejects a tampered request", () => {
    const base = { shop: "x.myshopify.com", code: "abc" };
    const hmac = signOauth(base);
    const sp = new URLSearchParams({ ...base, code: "CHANGED", hmac });
    expect(verifyOauthHmac(sp)).toBe(false);
  });

  it("rejects when hmac is missing", () => {
    expect(verifyOauthHmac(new URLSearchParams({ shop: "x" }))).toBe(false);
  });
});

describe("verifyWebhookHmac", () => {
  it("accepts the base64 HMAC of the raw body", () => {
    const body = JSON.stringify({ topic: "shop/redact" });
    const h = crypto
      .createHmac("sha256", SECRET)
      .update(body, "utf8")
      .digest("base64");
    expect(verifyWebhookHmac(body, h)).toBe(true);
  });

  it("rejects invalid / missing signatures", () => {
    expect(verifyWebhookHmac("{}", "bad")).toBe(false);
    expect(verifyWebhookHmac("{}", null)).toBe(false);
  });
});
