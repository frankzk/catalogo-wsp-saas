import { createClient } from "@/lib/supabase/server";
import { OrdersList, type StoreOption } from "@/components/orders-list";

export const metadata = { title: "Pedidos" };

export default async function OrdersPage() {
  const supabase = await createClient();

  const { data: storeRows } = await supabase
    .from("stores")
    .select("id, shopify_domain");
  const ids = (storeRows ?? []).map((s) => s.id);

  const brand = new Map<string, string | null>();
  if (ids.length) {
    const { data: configs } = await supabase
      .from("store_configs")
      .select("store_id, brand_name")
      .in("store_id", ids);
    (configs ?? []).forEach((c) => brand.set(c.store_id, c.brand_name));
  }

  const stores: StoreOption[] = (storeRows ?? []).map((s) => ({
    id: s.id,
    brand: brand.get(s.id) || s.shopify_domain || s.id,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pedidos</h1>
        <p className="mt-1 text-sm text-gray-500">
          Pedidos COD recibidos a través de tus catálogos.
        </p>
      </div>
      <OrdersList stores={stores} />
    </div>
  );
}
