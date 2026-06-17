import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildCatalogData, getCatalogContext } from "@/lib/catalog";
import { CatalogApp } from "@/components/catalog/catalog-app";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const ctx = await getCatalogContext(slug);
  return {
    title: ctx?.config.brand_name ?? "Catálogo",
    description: ctx?.config.headline ?? undefined,
  };
}

export default async function CatalogPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await buildCatalogData(slug);
  if (!data) notFound();
  return <CatalogApp data={data} />;
}
