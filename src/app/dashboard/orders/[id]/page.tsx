import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/money";
import type { Order, OrderItem } from "@/lib/types";

export const metadata = { title: "Pedido" };

function fmtDate(value: string): string {
  return new Date(value).toLocaleString("es", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  const order = data as Order | null;

  if (!order) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Link href="/dashboard/orders" className="text-sm text-gray-500 hover:underline">
          ← Pedidos
        </Link>
        <p className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500">
          Pedido no encontrado.
        </p>
      </div>
    );
  }

  const [{ data: store }, { data: config }] = await Promise.all([
    supabase
      .from("stores")
      .select("shopify_domain")
      .eq("id", order.store_id)
      .maybeSingle(),
    supabase
      .from("store_configs")
      .select("brand_name")
      .eq("store_id", order.store_id)
      .maybeSingle(),
  ]);

  const items: OrderItem[] = Array.isArray(order.items_json)
    ? order.items_json
    : [];
  const shopifyLink =
    store?.shopify_domain && order.shopify_order_id
      ? `https://${store.shopify_domain}/admin/orders/${order.shopify_order_id}`
      : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/dashboard/orders"
          className="text-sm text-gray-500 hover:underline"
        >
          ← Pedidos
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <h1 className="text-2xl font-bold">
            Pedido {order.shopify_order_id ? `#${order.shopify_order_id}` : ""}
          </h1>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
            Contra entrega
          </span>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          {config?.brand_name ? `${config.brand_name} · ` : ""}
          {fmtDate(order.created_at)}
        </p>
      </div>

      {/* Customer */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Cliente
        </h2>
        <p className="font-medium">{order.name || "—"}</p>
        <p className="text-sm text-gray-500">{order.phone}</p>
      </div>

      {/* Items */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Producto</th>
              <th className="px-4 py-3 text-center font-medium">Cant.</th>
              <th className="px-4 py-3 text-right font-medium">Precio</th>
              <th className="px-4 py-3 text-right font-medium">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i} className="border-t border-gray-100">
                <td className="px-4 py-3">{it.title ?? `Variante ${it.variant_id}`}</td>
                <td className="px-4 py-3 text-center">{it.quantity}</td>
                <td className="px-4 py-3 text-right">
                  {formatMoney(it.price, order.currency)}
                </td>
                <td className="px-4 py-3 text-right">
                  {formatMoney(it.price * it.quantity, order.currency)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-200 font-semibold">
              <td className="px-4 py-3" colSpan={3}>
                Total
              </td>
              <td className="px-4 py-3 text-right">
                {order.total != null
                  ? formatMoney(order.total, order.currency)
                  : "—"}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {shopifyLink && (
        <a
          href={shopifyLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Ver en Shopify ↗
        </a>
      )}
    </div>
  );
}
