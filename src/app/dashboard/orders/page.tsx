import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/money";
import type { Order } from "@/lib/types";

export const metadata = { title: "Pedidos" };

function fmtDate(value: string): string {
  return new Date(value).toLocaleDateString("es", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function OrdersPage() {
  const supabase = await createClient();

  const { data: orders } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  const list = (orders ?? []) as Order[];

  const storeIds = Array.from(new Set(list.map((o) => o.store_id)));
  const stores = new Map<string, { brand: string; domain: string | null }>();
  if (storeIds.length) {
    const [{ data: storeRows }, { data: configRows }] = await Promise.all([
      supabase.from("stores").select("id, shopify_domain").in("id", storeIds),
      supabase
        .from("store_configs")
        .select("store_id, brand_name")
        .in("store_id", storeIds),
    ]);
    const brand = new Map(
      (configRows ?? []).map((c) => [c.store_id, c.brand_name as string | null]),
    );
    (storeRows ?? []).forEach((s) =>
      stores.set(s.id, {
        brand: brand.get(s.id) || s.shopify_domain || s.id,
        domain: s.shopify_domain,
      }),
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pedidos</h1>
        <p className="mt-1 text-sm text-gray-500">
          Pedidos COD recibidos a través de tus catálogos (últimos 100).
        </p>
      </div>

      {list.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500">
          Aún no tienes pedidos. Cuando un cliente compre contra entrega, aparecerá
          aquí.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Tienda</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Productos</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {list.map((o) => {
                const store = stores.get(o.store_id);
                const link =
                  store?.domain && o.shopify_order_id
                    ? `https://${store.domain}/admin/orders/${o.shopify_order_id}`
                    : null;
                const itemCount = Array.isArray(o.items_json)
                  ? o.items_json.reduce((n, it) => n + (it.quantity ?? 1), 0)
                  : 0;
                return (
                  <tr key={o.id} className="border-t border-gray-100">
                    <td className="whitespace-nowrap px-4 py-3 text-gray-500">
                      {fmtDate(o.created_at)}
                    </td>
                    <td className="px-4 py-3">{store?.brand ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{o.name || "—"}</div>
                      <div className="text-xs text-gray-400">{o.phone}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{itemCount} art.</td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {o.total != null ? formatMoney(o.total, o.currency) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {link && (
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-whatsapp-teal hover:underline"
                        >
                          Ver en Shopify ↗
                        </a>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
