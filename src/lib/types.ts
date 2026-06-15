/** TypeScript shapes mirroring the Postgres schema (see supabase/schema.sql). */

export interface Merchant {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  plan: string | null;
  subscription_status: string;
  trial_ends_at: string | null;
  created_at: string;
}

export interface Store {
  id: string;
  merchant_id: string;
  shopify_domain: string | null;
  access_token_encrypted: string | null;
  scopes: string | null;
  country: string | null;
  currency: string | null;
  created_at: string;
}

export type CheckoutMode = "whatsapp" | "cod";

export interface StoreConfig {
  store_id: string;
  slug: string;
  brand_name: string | null;
  logo_url: string | null;
  discount_percent: number;
  whatsapp_number: string | null;
  checkout_mode: CheckoutMode;
  telegram_bot_token_enc: string | null;
  telegram_chat_id: string | null;
  trust_badges_json: TrustBadge[];
  headline: string | null;
  subtitle: string | null;
  country: string | null;
  currency: string | null;
  disable_checkout_when_unpaid: boolean;
  created_at: string;
  updated_at: string;
}

export interface TrustBadge {
  icon?: string;
  text: string;
}

export interface Order {
  id: string;
  store_id: string;
  shopify_order_id: string | null;
  name: string | null;
  phone: string | null;
  total: number | null;
  currency: string | null;
  items_json: OrderItem[];
  created_at: string;
}

export interface OrderItem {
  variant_id?: string | number;
  product_id?: string | number;
  title?: string;
  quantity: number;
  price: number;
}

export type EventType = "view" | "view_product" | "add_to_cart" | "order";

export interface AnalyticsEvent {
  id: string;
  store_id: string;
  type: EventType;
  payload_json: Record<string, unknown>;
  created_at: string;
}
