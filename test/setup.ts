// Test environment values (no real secrets).
process.env.TOKEN_ENCRYPTION_KEY = Buffer.from(
  "0123456789abcdef0123456789abcdef", // 32 bytes
).toString("base64");
process.env.SHOPIFY_API_SECRET = "test_shopify_secret";
process.env.SHOPIFY_API_KEY = "test_api_key";
process.env.SHOPIFY_APP_URL = "https://app.example.com";
process.env.NEXT_PUBLIC_APP_BASE_URL = "https://app.example.com";
