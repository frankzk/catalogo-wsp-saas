"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/money";
import type { Order } from "@/lib/types";

export interface StoreOption {
  id: string;
  brand: string;
}

const LIMIT = 20;

function fmtDate(value: string): string {
  return new Date(value).toLocaleDateString("es", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function OrdersList({ stores }: { stores: StoreOption[] }) {
  const [store, setStore] = useState("");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 350);
    return () => clearTimeout(t);
  }, [q]);

  const brandById = new Map(stores.map((s) => [s.id, s.brand]));

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre o teléfono…"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-whatsapp focus:ring-1 focus:ring-whatsapp"
        />
        {stores.length > 1 && (
          <select
            value={store}
            onChange={(e) => setStore(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-whatsapp"
          >
            <option value="">Todas las tiendas</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.brand}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Feed remounts on filter change → clean reset of pagination */}
      <OrdersFeed
        key={`${store}|${debouncedQ}`}
        store={store}
        q={debouncedQ}
        brandById={brandById}
      />
    </div>
  );
}

function OrdersFeed({
  store,
  q,
  brandById,
}: {
  store: string;
  q: string;
  brandById: Map<string, string>;
}) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const offsetRef = useRef(0);
  const hasMoreRef = useRef(true);
  const loadingRef = useRef(false);
  const sentinel = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMoreRef.current) return;
    loadingRef.current = true;
    setLoading(true);

    const params = new URLSearchParams({
      limit: String(LIMIT),
      offset: String(offsetRef.current),
    });
    if (store) params.set("store", store);
    if (q) params.set("q", q);

    try {
      const res = await fetch(`/api/orders?${params.toString()}`);
      if (!res.ok) throw new Error("request failed");
      const json = (await res.json()) as { orders: Order[]; hasMore: boolean };
      const batch = json.orders ?? [];
      offsetRef.current += batch.length;
      setOrders((prev) => [...prev, ...batch]);
      hasMoreRef.current = !!json.hasMore;
      setHasMore(hasMoreRef.current);
    } catch {
      setError(true);
      hasMoreRef.current = false;
      setHasMore(false);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [store, q]);

  // Auto-load on scroll (and the initial page on mount, since the sentinel
  // starts in view).
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "300px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore]);

  return (
    <div>
      {orders.length === 0 && !loading && !hasMore ? (
        <p className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500">
          No hay pedidos que coincidan.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
          {orders.map((o) => {
            const itemCount = Array.isArray(o.items_json)
              ? o.items_json.reduce((n, it) => n + (it.quantity ?? 1), 0)
              : 0;
            return (
              <li key={o.id}>
                <Link
                  href={`/dashboard/orders/${o.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{o.name || "Cliente"}</p>
                    <p className="truncate text-xs text-gray-400">
                      {brandById.get(o.store_id) ?? ""} · {o.phone} ·{" "}
                      {itemCount} art.
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-semibold">
                      {o.total != null ? formatMoney(o.total, o.currency) : "—"}
                    </p>
                    <p className="text-xs text-gray-400">{fmtDate(o.created_at)}</p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {/* Sentinel + fallback button */}
      {hasMore && (
        <div ref={sentinel} className="mt-4 flex justify-center">
          <button
            onClick={() => loadMore()}
            disabled={loading}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-60"
          >
            {loading ? "Cargando…" : "Cargar más"}
          </button>
        </div>
      )}

      {error && (
        <p className="mt-3 text-center text-sm text-red-600">
          No se pudieron cargar los pedidos.
        </p>
      )}
    </div>
  );
}
