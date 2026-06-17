"use client";

import { useState } from "react";

export function ConnectShopifyForm() {
  const [shop, setShop] = useState("");
  const [loading, setLoading] = useState(false);

  function connect(e: React.FormEvent) {
    e.preventDefault();
    const value = shop.trim();
    if (!value) return;
    setLoading(true);
    window.location.href = `/api/shopify/install?shop=${encodeURIComponent(value)}`;
  }

  return (
    <form onSubmit={connect} className="flex flex-col gap-3 sm:flex-row">
      <input
        type="text"
        value={shop}
        onChange={(e) => setShop(e.target.value)}
        placeholder="tu-tienda.myshopify.com"
        className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-whatsapp focus:ring-1 focus:ring-whatsapp"
      />
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-whatsapp px-5 py-2 text-sm font-semibold text-white hover:bg-whatsapp-dark disabled:opacity-60"
      >
        {loading ? "Conectando…" : "Conectar Shopify"}
      </button>
    </form>
  );
}
