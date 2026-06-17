import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StoreConfigForm } from "@/components/store-config-form";
import { NEXT_PUBLIC_APP_BASE_URL } from "@/lib/env";
import type { Store, StoreConfig } from "@/lib/types";

export const metadata = { title: "Configurar tienda" };

export default async function StoreDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ connected?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();

  const { data: store } = await supabase
    .from("stores")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!store) notFound();

  const { data: config } = await supabase
    .from("store_configs")
    .select("*")
    .eq("store_id", id)
    .maybeSingle();

  const typedStore = store as Store;
  const typedConfig = (config as StoreConfig) ?? null;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/stores"
          className="text-sm text-gray-500 hover:underline"
        >
          ← Tiendas
        </Link>
        <h1 className="mt-2 text-2xl font-bold">
          {typedConfig?.brand_name || typedStore.shopify_domain}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {typedStore.shopify_domain}
          {typedStore.scopes ? ` · scopes: ${typedStore.scopes}` : ""}
        </p>
      </div>

      {sp.connected && (
        <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
          ¡Conexión exitosa! Ahora personaliza tu catálogo.
        </div>
      )}

      <StoreConfigForm
        storeId={typedStore.id}
        config={typedConfig}
        catalogBaseUrl={NEXT_PUBLIC_APP_BASE_URL}
      />
    </div>
  );
}
