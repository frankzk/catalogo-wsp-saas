import "server-only";
import { createClient } from "@/lib/supabase/server";
import { buildRetentionMatrix, type RetentionData } from "@/lib/retention";

/** Executive analytics for the current merchant (RLS-scoped). */

export interface DailyPoint {
  date: string;
  label: string;
  views: number;
  addToCart: number;
  orders: number;
  revenue: number;
}

export interface FunnelStep {
  step: string;
  value: number;
}

export interface TopProduct {
  title: string;
  qty: number;
  revenue: number;
}

export interface StoreSlice {
  name: string;
  orders: number;
  revenue: number;
}

export interface WeekdayPoint {
  day: string;
  orders: number;
}

export interface Kpi {
  value: number;
  delta: number | null; // percent change vs previous period (null = no baseline)
}

export interface AnalyticsData {
  rangeDays: number;
  currency: string | null;
  hasData: boolean;
  kpis: {
    revenue: Kpi;
    orders: Kpi;
    aov: Kpi;
    conversion: Kpi;
  };
  totals: { views: number; productViews: number; addToCart: number; whatsappOrders: number };
  daily: DailyPoint[];
  funnel: FunnelStep[];
  topProducts: TopProduct[];
  byStore: StoreSlice[];
  weekday: WeekdayPoint[];
  repeat: { customers: number; repeat: number; repeatRate: number };
}

const WEEKDAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function pctDelta(cur: number, prev: number): number | null {
  if (prev <= 0) return cur > 0 ? null : 0;
  return ((cur - prev) / prev) * 100;
}

type EventRow = { type: string; created_at: string; payload_json: { channel?: string } | null };
type OrderRow = {
  total: number | null;
  currency: string | null;
  phone: string | null;
  created_at: string;
  items_json: { title?: string; quantity?: number; price?: number }[] | null;
  store_id: string;
};

export async function getAnalytics(days = 30): Promise<AnalyticsData> {
  const supabase = await createClient();

  const now = new Date();
  const start = new Date(now.getTime() - days * 86400000);
  const prevStart = new Date(now.getTime() - 2 * days * 86400000);
  const startISO = start.toISOString();
  const prevISO = prevStart.toISOString();

  const [{ data: eventsData }, { data: ordersData }, { data: storeRows }] =
    await Promise.all([
      supabase
        .from("events")
        .select("type, created_at, payload_json")
        .gte("created_at", prevISO),
      supabase
        .from("orders")
        .select("total, currency, phone, created_at, items_json, store_id")
        .neq("status", "merged")
        .neq("status", "cancelled")
        .gte("created_at", prevISO),
      supabase.from("stores").select("id, shopify_domain"),
    ]);

  const events = (eventsData ?? []) as EventRow[];
  const orders = (ordersData ?? []) as OrderRow[];

  // Store names
  const storeName = new Map<string, string>();
  const ids = (storeRows ?? []).map((s) => s.id);
  if (ids.length) {
    const { data: configs } = await supabase
      .from("store_configs")
      .select("store_id, brand_name")
      .in("store_id", ids);
    const brand = new Map((configs ?? []).map((c) => [c.store_id, c.brand_name]));
    (storeRows ?? []).forEach((s) =>
      storeName.set(s.id, brand.get(s.id) || s.shopify_domain || s.id),
    );
  }

  const isCurrent = (iso: string) => iso >= startISO;

  // Current vs previous aggregates
  const cur = { views: 0, productViews: 0, addToCart: 0, conversions: 0, codOrders: 0, revenue: 0, whatsapp: 0 };
  const prev = { conversions: 0, codOrders: 0, revenue: 0 };

  for (const e of events) {
    const current = isCurrent(e.created_at);
    if (e.type === "order") {
      if (current) {
        cur.conversions++;
        if (e.payload_json?.channel === "whatsapp") cur.whatsapp++;
      } else prev.conversions++;
      continue;
    }
    if (!current) continue;
    if (e.type === "view") cur.views++;
    else if (e.type === "view_product") cur.productViews++;
    else if (e.type === "add_to_cart") cur.addToCart++;
  }

  for (const o of orders) {
    const amount = Number(o.total ?? 0);
    if (isCurrent(o.created_at)) {
      cur.codOrders++;
      cur.revenue += amount;
    } else {
      prev.codOrders++;
      prev.revenue += amount;
    }
  }

  const curAov = cur.codOrders ? cur.revenue / cur.codOrders : 0;
  const prevAov = prev.codOrders ? prev.revenue / prev.codOrders : 0;
  const curConv = cur.views ? (cur.conversions / cur.views) * 100 : 0;
  const prevConvBase = events.filter(
    (e) => e.type === "view" && !isCurrent(e.created_at),
  ).length;
  const prevConv = prevConvBase ? (prev.conversions / prevConvBase) * 100 : 0;

  // Dominant currency among current orders
  const currencyCount = new Map<string, number>();
  for (const o of orders) {
    if (isCurrent(o.created_at) && o.currency) {
      currencyCount.set(o.currency, (currencyCount.get(o.currency) ?? 0) + 1);
    }
  }
  const currency =
    [...currencyCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // Daily series
  const dayMap = new Map<string, DailyPoint>();
  const dayKeys: string[] = [];
  const cursor = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()),
  );
  const endDay = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  while (cursor <= endDay) {
    const key = cursor.toISOString().slice(0, 10);
    dayKeys.push(key);
    dayMap.set(key, {
      date: key,
      label: new Date(key + "T00:00:00Z").toLocaleDateString("es", {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      }),
      views: 0,
      addToCart: 0,
      orders: 0,
      revenue: 0,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  for (const e of events) {
    if (!isCurrent(e.created_at)) continue;
    const key = e.created_at.slice(0, 10);
    const p = dayMap.get(key);
    if (!p) continue;
    if (e.type === "view") p.views++;
    else if (e.type === "add_to_cart") p.addToCart++;
    else if (e.type === "order") p.orders++;
  }
  for (const o of orders) {
    if (!isCurrent(o.created_at)) continue;
    const p = dayMap.get(o.created_at.slice(0, 10));
    if (p) p.revenue += Number(o.total ?? 0);
  }
  const daily = dayKeys.map((k) => dayMap.get(k)!);

  // Top products (current COD orders)
  const productMap = new Map<string, TopProduct>();
  for (const o of orders) {
    if (!isCurrent(o.created_at)) continue;
    for (const it of o.items_json ?? []) {
      const title = it.title ?? "Producto";
      const entry = productMap.get(title) ?? { title, qty: 0, revenue: 0 };
      entry.qty += it.quantity ?? 0;
      entry.revenue += (it.price ?? 0) * (it.quantity ?? 0);
      productMap.set(title, entry);
    }
  }
  const topProducts = [...productMap.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6);

  // By store (current)
  const storeMap = new Map<string, StoreSlice>();
  for (const o of orders) {
    if (!isCurrent(o.created_at)) continue;
    const name = storeName.get(o.store_id) ?? "Tienda";
    const entry = storeMap.get(o.store_id) ?? { name, orders: 0, revenue: 0 };
    entry.orders++;
    entry.revenue += Number(o.total ?? 0);
    storeMap.set(o.store_id, entry);
  }
  const byStore = [...storeMap.values()].sort((a, b) => b.revenue - a.revenue);

  // Weekday (conversions)
  const weekdayCounts = new Array(7).fill(0);
  for (const e of events) {
    if (e.type === "order" && isCurrent(e.created_at)) {
      weekdayCounts[new Date(e.created_at).getUTCDay()]++;
    }
  }
  const weekday = WEEKDAYS.map((day, i) => ({ day, orders: weekdayCounts[i] }));

  // Repeat customers (current COD orders by phone)
  const phoneCounts = new Map<string, number>();
  for (const o of orders) {
    if (isCurrent(o.created_at) && o.phone) {
      phoneCounts.set(o.phone, (phoneCounts.get(o.phone) ?? 0) + 1);
    }
  }
  const customers = phoneCounts.size;
  const repeat = [...phoneCounts.values()].filter((n) => n > 1).length;

  const funnel: FunnelStep[] = [
    { step: "Vistas", value: cur.views },
    { step: "Vieron producto", value: cur.productViews },
    { step: "Agregaron", value: cur.addToCart },
    { step: "Pedidos", value: cur.conversions },
  ];

  return {
    rangeDays: days,
    currency,
    hasData: cur.views + cur.conversions + cur.codOrders > 0,
    kpis: {
      revenue: { value: cur.revenue, delta: pctDelta(cur.revenue, prev.revenue) },
      orders: { value: cur.conversions, delta: pctDelta(cur.conversions, prev.conversions) },
      aov: { value: curAov, delta: pctDelta(curAov, prevAov) },
      conversion: { value: curConv, delta: pctDelta(curConv, prevConv) },
    },
    totals: {
      views: cur.views,
      productViews: cur.productViews,
      addToCart: cur.addToCart,
      whatsappOrders: cur.whatsapp,
    },
    daily,
    funnel,
    topProducts,
    byStore,
    weekday,
    repeat: {
      customers,
      repeat,
      repeatRate: customers ? (repeat / customers) * 100 : 0,
    },
  };
}

/** Monthly retention cohorts over the last ~12 months (RLS-scoped). */
export async function getRetentionCohorts(): Promise<RetentionData> {
  const supabase = await createClient();
  const since = new Date();
  since.setUTCMonth(since.getUTCMonth() - 11);
  since.setUTCDate(1);
  since.setUTCHours(0, 0, 0, 0);

  const { data } = await supabase
    .from("orders")
    .select("phone, created_at")
    .neq("status", "merged")
    .neq("status", "cancelled")
    .gte("created_at", since.toISOString());

  return buildRetentionMatrix(
    (data ?? []) as { phone: string | null; created_at: string }[],
  );
}
