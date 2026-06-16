import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Métricas" };

function startOfMonthISO(): string {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

const CARDS: { key: string; label: string }[] = [
  { key: "view", label: "Vistas" },
  { key: "view_product", label: "Productos vistos" },
  { key: "add_to_cart", label: "Agregados al carrito" },
  { key: "order", label: "Pedidos" },
];

export default async function MetricsPage() {
  const supabase = await createClient();
  const start = startOfMonthISO();

  const { data: stores } = await supabase
    .from("stores")
    .select("id, shopify_domain");
  const storeIds = (stores ?? []).map((s) => s.id);

  const names = new Map<string, string>();
  if (storeIds.length) {
    const { data: configs } = await supabase
      .from("store_configs")
      .select("store_id, brand_name");
    (configs ?? []).forEach((c) =>
      names.set(c.store_id, c.brand_name ?? ""),
    );
  }
  (stores ?? []).forEach((s) => {
    if (!names.get(s.id)) names.set(s.id, s.shopify_domain ?? s.id);
  });

  const { data: events } = await supabase
    .from("events")
    .select("store_id, type")
    .gte("created_at", start);
  const { data: orders } = await supabase
    .from("orders")
    .select("store_id")
    .gte("created_at", start);

  const agg: Record<string, number> = {
    view: 0,
    view_product: 0,
    add_to_cart: 0,
    order: 0,
  };
  const perStore = new Map<
    string,
    { view: number; add_to_cart: number; order: number }
  >();
  for (const id of storeIds) {
    perStore.set(id, { view: 0, add_to_cart: 0, order: 0 });
  }

  (events ?? []).forEach((e) => {
    const t = e.type as string;
    if (t in agg) agg[t] += 1;
    const row = perStore.get(e.store_id);
    if (row && (t === "view" || t === "add_to_cart")) {
      row[t] += 1;
    }
  });
  (orders ?? []).forEach((o) => {
    const row = perStore.get(o.store_id);
    if (row) row.order += 1;
  });
  const ordersCount = (orders ?? []).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Métricas</h1>
        <p className="mt-1 text-sm text-gray-500">Actividad del mes en curso.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CARDS.map((c) => (
          <div
            key={c.key}
            className="rounded-xl border border-gray-200 bg-white p-5"
          >
            <p className="text-sm text-gray-500">{c.label}</p>
            <p className="mt-1 text-3xl font-extrabold">
              {c.key === "order" ? ordersCount : agg[c.key]}
            </p>
          </div>
        ))}
      </div>

      {storeIds.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Tienda</th>
                <th className="px-4 py-3 text-right font-medium">Vistas</th>
                <th className="px-4 py-3 text-right font-medium">Carrito</th>
                <th className="px-4 py-3 text-right font-medium">Pedidos</th>
              </tr>
            </thead>
            <tbody>
              {storeIds.map((id) => {
                const row = perStore.get(id)!;
                return (
                  <tr key={id} className="border-t border-gray-100">
                    <td className="px-4 py-3">{names.get(id)}</td>
                    <td className="px-4 py-3 text-right">{row.view}</td>
                    <td className="px-4 py-3 text-right">{row.add_to_cart}</td>
                    <td className="px-4 py-3 text-right">{row.order}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500">
          Conecta una tienda y publica tu catálogo para ver métricas.
        </p>
      )}
    </div>
  );
}
