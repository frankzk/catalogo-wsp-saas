import { NextResponse } from "next/server";
import { getStoreIdBySlug } from "@/lib/catalog";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const ALLOWED = new Set(["view", "view_product", "add_to_cart", "order"]);

/** Public, best-effort analytics tracking for a catalog. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const body = (await request.json().catch(() => null)) as {
    type?: string;
    payload?: Record<string, unknown>;
  } | null;

  if (!body || !ALLOWED.has(body.type ?? "")) {
    return NextResponse.json({ error: "bad_type" }, { status: 400 });
  }

  const storeId = await getStoreIdBySlug(slug);
  if (!storeId) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const admin = createAdminClient();
  await admin.from("events").insert({
    store_id: storeId,
    type: body.type,
    payload_json: body.payload ?? {},
  });

  return NextResponse.json({ ok: true });
}
