import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ConnectShopifyForm } from "@/components/connect-shopify-form";
import type { Store, StoreConfig } from "@/lib/types";

export const metadata = { title: "Tiendas" };

const ERRORS: Record<string, string> = {
  invalid_shop: "El dominio no es válido. Usa el formato tu-tienda.myshopify.com.",
  bad_hmac: "No pudimos verificar la respuesta de Shopify. Inténtalo de nuevo.",
  bad_state: "La sesión de instalación expiró. Inténtalo de nuevo.",
  token_exchange: "No pudimos obtener el token de acceso de Shopify.",
  shop_taken: "Esa tienda ya está conectada a otra cuenta.",
  no_merchant: "No encontramos tu cuenta. Vuelve a iniciar sesión.",
};

export default async function StoresPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; connected?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const { data: stores } = await supabase
    .from("stores")
    .select("*")
    .order("created_at", { ascending: true });

  const storeList = (stores ?? []) as Store[];
  const ids = storeList.map((s) => s.id);

  const configByStore = new Map<string, StoreConfig>();
  if (ids.length) {
    const { data: configs } = await supabase
      .from("store_configs")
      .select("*")
      .in("store_id", ids);
    (configs ?? []).forEach((c) => configByStore.set(c.store_id, c as StoreConfig));
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Tiendas</h1>
        <p className="mt-1 text-sm text-gray-500">
          Conecta tu tienda Shopify y configura su catálogo.
        </p>
      </div>

      {params.error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {ERRORS[params.error] ?? "Ocurrió un error al conectar Shopify."}
        </div>
      )}
      {params.connected && (
        <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
          ¡Tienda conectada! Configura tu catálogo abajo.
        </div>
      )}

      {storeList.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {storeList.map((store) => {
            const config = configByStore.get(store.id);
            return (
              <Link
                key={store.id}
                href={`/dashboard/stores/${store.id}`}
                className="rounded-xl border border-gray-200 bg-white p-5 transition hover:border-whatsapp hover:shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">
                    {config?.brand_name || store.shopify_domain}
                  </span>
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                    Conectada
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-500">{store.shopify_domain}</p>
                <p className="mt-2 text-xs text-gray-400">
                  {config?.slug ? `/c/${config.slug}` : "Sin configurar"}
                  {store.currency ? ` · ${store.currency}` : ""}
                </p>
              </Link>
            );
          })}
        </div>
      )}

      {/* Connect (another) store */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold">
          {storeList.length ? "Conectar otra tienda" : "Conecta tu tienda Shopify"}
        </h2>
        <p className="mt-1 mb-4 text-sm text-gray-500">
          Te llevaremos a Shopify para autorizar el acceso. El token se guarda
          cifrado.
        </p>
        <ConnectShopifyForm />
      </div>
    </div>
  );
}
