"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { formatMoney } from "@/lib/money";
import { PhoneGate } from "@/components/catalog/phone-gate";
import { ProductDetail } from "@/components/catalog/product-detail";
import type {
  CatalogData,
  CatalogProduct,
  CatalogVariant,
} from "@/lib/types";

interface CartItem {
  productId: number;
  productTitle: string;
  variantId: number;
  variantTitle: string;
  price: number;
  image: string | null;
  qty: number;
}

export function CatalogApp({ data }: { data: CatalogData }) {
  const { config, products, categories, slug } = data;
  const phoneKey = `catalogo_phone_${slug}`;

  const [phone, setPhone] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [category, setCategory] = useState<string>("all");
  const [detail, setDetail] = useState<CatalogProduct | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [drawer, setDrawer] = useState(false);

  const track = useCallback(
    (type: string, payload?: Record<string, unknown>) => {
      fetch(`/api/c/${slug}/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, payload }),
        keepalive: true,
      }).catch(() => {});
    },
    [slug],
  );

  // Load saved phone; track a view once we know the visitor is in.
  useEffect(() => {
    const saved =
      typeof window !== "undefined" ? localStorage.getItem(phoneKey) : null;
    if (saved) {
      setPhone(saved);
      track("view");
    }
    setReady(true);
  }, [phoneKey, track]);

  function onPhone(value: string) {
    localStorage.setItem(phoneKey, value);
    setPhone(value);
    track("view");
  }

  const addToCart = useCallback(
    (product: CatalogProduct, variant: CatalogVariant, qty: number) => {
      setCart((prev) => {
        const i = prev.findIndex((it) => it.variantId === variant.id);
        if (i >= 0) {
          const next = [...prev];
          next[i] = { ...next[i], qty: next[i].qty + qty };
          return next;
        }
        return [
          ...prev,
          {
            productId: product.id,
            productTitle: product.title,
            variantId: variant.id,
            variantTitle: variant.title,
            price: variant.price,
            image: product.images[0] ?? null,
            qty,
          },
        ];
      });
      track("add_to_cart", { product_id: product.id, variant_id: variant.id });
      setDetail(null);
      setDrawer(true);
    },
    [track],
  );

  const filtered = useMemo(
    () =>
      category === "all"
        ? products
        : products.filter((p) => p.category === category),
    [products, category],
  );

  const cartCount = cart.reduce((n, it) => n + it.qty, 0);
  const cartTotal = cart.reduce((s, it) => s + it.price * it.qty, 0);

  if (!ready) return null;
  if (!phone) return <PhoneGate config={config} onSubmit={onPhone} />;

  return (
    <div className="min-h-screen bg-whatsapp-bg pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-whatsapp-teal text-white shadow">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          {config.logoUrl ? (
            <Image
              src={config.logoUrl}
              alt=""
              width={40}
              height={40}
              className="h-10 w-10 rounded-full object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 font-bold">
              {(config.brandName ?? "C").charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1">
            <p className="font-semibold leading-tight">
              {config.brandName ?? "Catálogo"}
            </p>
            <p className="text-xs text-white/80">
              {config.subtitle ?? "en línea"}
            </p>
          </div>
          <button
            onClick={() => setDrawer(true)}
            className="relative rounded-full bg-white/15 px-3 py-2 text-sm font-medium"
          >
            🛒
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[11px] font-bold">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Discount banner */}
      {config.discountPercent > 0 && (
        <div className="bg-whatsapp px-4 py-2 text-center text-sm font-semibold text-white">
          🔥 {config.discountPercent}% de descuento aplicado
        </div>
      )}

      <main className="mx-auto max-w-3xl px-4">
        {/* Categories */}
        {categories.length > 1 && (
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-3">
            <Chip
              label="Todos"
              active={category === "all"}
              onClick={() => setCategory("all")}
            />
            {categories.map((c) => (
              <Chip
                key={c}
                label={c}
                active={category === c}
                onClick={() => setCategory(c)}
              />
            ))}
          </div>
        )}

        {products.length === 0 ? (
          <p className="py-20 text-center text-sm text-gray-500">
            Este catálogo todavía no tiene productos disponibles.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 py-2 sm:grid-cols-3">
            {filtered.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                currency={config.currency}
                onOpen={() => {
                  setDetail(p);
                  track("view_product", { product_id: p.id });
                }}
                onQuickAdd={() => {
                  const v =
                    p.variants.find((x) => x.available) ?? p.variants[0];
                  if (v) addToCart(p, v, 1);
                }}
              />
            ))}
          </div>
        )}
      </main>

      {/* Sticky "view cart" bar (mobile-friendly checkout CTA) */}
      {cartCount > 0 && !drawer && (
        <button
          onClick={() => setDrawer(true)}
          className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-3xl items-center justify-between bg-whatsapp px-5 py-3.5 font-semibold text-white shadow-lg"
        >
          <span>Ver carrito ({cartCount})</span>
          <span className="font-bold">
            {formatMoney(cartTotal, config.currency)}
          </span>
        </button>
      )}

      {detail && (
        <ProductDetail
          product={detail}
          currency={config.currency}
          onClose={() => setDetail(null)}
          onAdd={(variant, qty) => addToCart(detail, variant, qty)}
        />
      )}

      {drawer && (
        <CartDrawer
          data={data}
          phone={phone}
          cart={cart}
          setCart={setCart}
          onClose={() => setDrawer(false)}
          onOrdered={() => setCart([])}
          track={track}
        />
      )}
    </div>
  );
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium ${
        active ? "bg-whatsapp text-white" : "bg-white text-gray-600"
      }`}
    >
      {label}
    </button>
  );
}

function ProductCard({
  product,
  currency,
  onOpen,
  onQuickAdd,
}: {
  product: CatalogProduct;
  currency: string | null;
  onOpen: () => void;
  onQuickAdd: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm">
      <button onClick={onOpen} className="block w-full text-left">
        <div className="relative aspect-square w-full bg-gray-100">
          {product.images[0] ? (
            <Image
              src={product.images[0]}
              alt={product.title}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-300">
              Sin imagen
            </div>
          )}
          {product.bestseller && (
            <span className="absolute left-1.5 top-1.5 rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-white">
              Más vendido
            </span>
          )}
        </div>
        <div className="p-2">
          <p className="line-clamp-2 text-sm font-medium">{product.title}</p>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="font-bold text-whatsapp-teal">
              {formatMoney(product.priceFrom, currency)}
            </span>
            {product.compareAtFrom &&
              product.compareAtFrom > product.priceFrom && (
                <span className="text-xs text-gray-400 line-through">
                  {formatMoney(product.compareAtFrom, currency)}
                </span>
              )}
          </div>
        </div>
      </button>
      <button
        onClick={onQuickAdd}
        className="w-full border-t border-gray-100 py-2 text-sm font-semibold text-whatsapp-teal hover:bg-gray-50"
      >
        Agregar
      </button>
    </div>
  );
}

// ---- Cart drawer + checkout -------------------------------------------------

function CartDrawer({
  data,
  phone,
  cart,
  setCart,
  onClose,
  onOrdered,
  track,
}: {
  data: CatalogData;
  phone: string;
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  onClose: () => void;
  onOrdered: () => void;
  track: (type: string, payload?: Record<string, unknown>) => void;
}) {
  const { config, slug } = data;
  const [step, setStep] = useState<"cart" | "form" | "done">("cart");
  const [form, setForm] = useState({
    name: "",
    address1: "",
    city: "",
    province: "",
    zip: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [orderName, setOrderName] = useState("");

  const total = cart.reduce((s, it) => s + it.price * it.qty, 0);
  const isCod = config.checkoutMode === "cod";

  function setQty(variantId: number, delta: number) {
    setCart((prev) =>
      prev
        .map((it) =>
          it.variantId === variantId
            ? { ...it, qty: Math.max(0, it.qty + delta) }
            : it,
        )
        .filter((it) => it.qty > 0),
    );
  }

  function whatsappCheckout() {
    const digits = (config.whatsappNumber ?? "").replace(/\D/g, "");
    const lines = cart.map(
      (it) =>
        `• ${it.qty}x ${it.productTitle}${
          it.variantTitle && it.variantTitle !== "Default Title"
            ? ` (${it.variantTitle})`
            : ""
        } — ${formatMoney(it.price * it.qty, config.currency)}`,
    );
    const msg = `¡Hola ${config.brandName ?? ""}! Quiero hacer este pedido:\n\n${lines.join(
      "\n",
    )}\n\nTotal: ${formatMoney(total, config.currency)}\nMi WhatsApp: ${phone}`;
    track("order", { channel: "whatsapp", total });
    window.open(
      `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`,
      "_blank",
    );
  }

  async function codCheckout(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/c/${slug}/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          name: form.name,
          address: {
            address1: form.address1,
            city: form.city,
            province: form.province,
            zip: form.zip,
          },
          items: cart.map((it) => ({
            variantId: it.variantId,
            quantity: it.qty,
          })),
        }),
      });
      const json = (await res.json()) as { ok?: boolean; orderName?: string; error?: string };
      if (!res.ok || !json.ok) {
        throw new Error(
          json.error === "limit_reached"
            ? "Este catálogo alcanzó su límite de pedidos por ahora. Intenta más tarde."
            : "No se pudo crear el pedido. Revisa tus datos e intenta de nuevo.",
        );
      }
      setOrderName(json.orderName ?? "");
      onOrdered();
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/50"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-md flex-col bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <h2 className="font-bold">
            {step === "done" ? "¡Pedido recibido!" : "Tu pedido"}
          </h2>
          <button onClick={onClose} aria-label="Cerrar" className="text-gray-500">
            ✕
          </button>
        </div>

        {step === "done" ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">
              ✓
            </div>
            <p className="text-lg font-semibold">¡Gracias por tu compra!</p>
            <p className="text-sm text-gray-500">
              Tu pedido {orderName && <strong>{orderName}</strong>} fue registrado.
              Te contactaremos para coordinar la entrega y el pago contra entrega.
            </p>
            <button
              onClick={onClose}
              className="mt-2 rounded-lg bg-whatsapp px-5 py-2 text-sm font-semibold text-white"
            >
              Seguir viendo
            </button>
          </div>
        ) : cart.length === 0 ? (
          <p className="flex-1 p-8 text-center text-sm text-gray-500">
            Tu carrito está vacío.
          </p>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4">
              {step === "cart" ? (
                <ul className="space-y-3">
                  {cart.map((it) => (
                    <li key={it.variantId} className="flex gap-3">
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                        {it.image && (
                          <Image
                            src={it.image}
                            alt=""
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{it.productTitle}</p>
                        <p className="text-sm text-whatsapp-teal">
                          {formatMoney(it.price, config.currency)}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <button
                            onClick={() => setQty(it.variantId, -1)}
                            className="h-6 w-6 rounded border border-gray-300"
                          >
                            −
                          </button>
                          <span className="text-sm">{it.qty}</span>
                          <button
                            onClick={() => setQty(it.variantId, 1)}
                            className="h-6 w-6 rounded border border-gray-300"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <form id="cod-form" onSubmit={codCheckout} className="space-y-3">
                  <p className="text-sm text-gray-500">
                    Pago <strong>contra entrega</strong>. Completa tus datos de
                    envío.
                  </p>
                  <Input
                    label="Nombre completo"
                    value={form.name}
                    onChange={(v) => setForm({ ...form, name: v })}
                    required
                  />
                  <Input
                    label="Dirección"
                    value={form.address1}
                    onChange={(v) => setForm({ ...form, address1: v })}
                    required
                  />
                  <Input
                    label="Ciudad"
                    value={form.city}
                    onChange={(v) => setForm({ ...form, city: v })}
                    required
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Provincia/Estado"
                      value={form.province}
                      onChange={(v) => setForm({ ...form, province: v })}
                    />
                    <Input
                      label="Código postal"
                      value={form.zip}
                      onChange={(v) => setForm({ ...form, zip: v })}
                    />
                  </div>
                  {error && <p className="text-sm text-red-600">{error}</p>}
                </form>
              )}
            </div>

            {/* Footer actions */}
            <div className="border-t border-gray-100 p-4">
              <div className="mb-3 flex items-center justify-between font-semibold">
                <span>Total</span>
                <span>{formatMoney(total, config.currency)}</span>
              </div>

              {!config.checkoutEnabled && isCod ? (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-center text-sm text-amber-800">
                  Este catálogo no está recibiendo pedidos por el momento.
                </p>
              ) : isCod ? (
                step === "cart" ? (
                  <button
                    onClick={() => setStep("form")}
                    className="w-full rounded-lg bg-whatsapp px-4 py-3 text-sm font-semibold text-white hover:bg-whatsapp-dark"
                  >
                    Continuar (contra entrega)
                  </button>
                ) : (
                  <button
                    type="submit"
                    form="cod-form"
                    disabled={submitting}
                    className="w-full rounded-lg bg-whatsapp px-4 py-3 text-sm font-semibold text-white hover:bg-whatsapp-dark disabled:opacity-60"
                  >
                    {submitting ? "Enviando…" : "Confirmar pedido"}
                  </button>
                )
              ) : (
                <button
                  onClick={whatsappCheckout}
                  disabled={!config.whatsappNumber}
                  className="w-full rounded-lg bg-whatsapp px-4 py-3 text-sm font-semibold text-white hover:bg-whatsapp-dark disabled:opacity-50"
                >
                  Pedir por WhatsApp
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-whatsapp focus:ring-1 focus:ring-whatsapp"
      />
    </label>
  );
}
