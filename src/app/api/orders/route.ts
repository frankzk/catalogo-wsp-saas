import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Paginated + filtered orders for the dashboard (infinite scroll).
 * RLS scopes results to the authenticated merchant's stores.
 * Query: ?limit=&offset=&store=<id>&q=<name|phone>
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? 20)));
  const offset = Math.max(0, Number(searchParams.get("offset") ?? 0));
  const store = searchParams.get("store") ?? "";
  // Strip characters that would break the PostgREST `or` filter syntax.
  const q = (searchParams.get("q") ?? "").replace(/[%,()*]/g, "").trim();

  let query = supabase
    .from("orders")
    .select("*")
    .neq("status", "merged")
    .neq("status", "cancelled")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (store) query = query.eq("store_id", store);
  if (q) query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%`);

  const { data, error } = await query;
  if (error) {
    console.error("orders query failed", error);
    return NextResponse.json({ error: "query_failed" }, { status: 500 });
  }

  return NextResponse.json({
    orders: data ?? [],
    hasMore: (data?.length ?? 0) === limit,
  });
}
