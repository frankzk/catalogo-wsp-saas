"use client";

import { useState } from "react";
import Image from "next/image";
import { formatMoney } from "@/lib/money";
import type { CatalogProduct, CatalogVariant } from "@/lib/types";

export function ProductDetail({
  product,
  currency,
  onClose,
  onAdd,
}: {
  product: CatalogProduct;
  currency: string | null;
  onClose: () => void;
  onAdd: (variant: CatalogVariant, qty: number) => void;
}) {
  const [img, setImg] = useState(0);
  const [variantId, setVariantId] = useState(
    (product.variants.find((v) => v.available) ?? product.variants[0])?.id,
  );
  const [qty, setQty] = useState(1);

  const variant =
    product.variants.find((v) => v.id === variantId) ?? product.variants[0];
  const images = product.images.length ? product.images : [];
  const hasImages = images.length > 0;

  if (!variant) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Carousel */}
        <div className="relative aspect-square w-full bg-gray-100">
          {hasImages ? (
            <Image
              src={images[img]}
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
          <button
            onClick={onClose}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow"
            aria-label="Cerrar"
          >
            ✕
          </button>
          {images.length > 1 && (
            <>
              <button
                onClick={() => setImg((i) => (i - 1 + images.length) % images.length)}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-3 py-1 shadow"
                aria-label="Anterior"
              >
                ‹
              </button>
              <button
                onClick={() => setImg((i) => (i + 1) % images.length)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-3 py-1 shadow"
                aria-label="Siguiente"
              >
                ›
              </button>
              <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
                {images.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 w-1.5 rounded-full ${
                      i === img ? "bg-whatsapp" : "bg-white/70"
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        <div className="space-y-4 p-5">
          <div>
            <h2 className="text-lg font-bold">{product.title}</h2>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-xl font-extrabold text-whatsapp-teal">
                {formatMoney(variant.price, currency)}
              </span>
              {variant.compareAtPrice && variant.compareAtPrice > variant.price && (
                <span className="text-sm text-gray-400 line-through">
                  {formatMoney(variant.compareAtPrice, currency)}
                </span>
              )}
            </div>
          </div>

          {/* Variant selector */}
          {product.variants.length > 1 && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Opción
              </label>
              <select
                value={variantId}
                onChange={(e) => setVariantId(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                {product.variants.map((v) => (
                  <option key={v.id} value={v.id} disabled={!v.available}>
                    {v.title} {v.available ? "" : "(agotado)"}
                  </option>
                ))}
              </select>
            </div>
          )}

          {product.description && (
            <p className="text-sm leading-relaxed text-gray-600">
              {product.description.slice(0, 400)}
            </p>
          )}

          {/* Reseña (social proof) */}
          <div className="rounded-lg bg-gray-50 p-3">
            <div className="flex items-center gap-1 text-sm text-amber-500">
              ★★★★★
              <span className="ml-1 text-xs font-medium text-gray-500">
                Compra verificada
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-600">
              “Excelente producto, llegó rápido y tal cual la foto. ¡Recomendado!”
            </p>
          </div>

          {/* Qty + add */}
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-lg border border-gray-300">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="px-3 py-2 text-lg"
                aria-label="Menos"
              >
                −
              </button>
              <span className="w-8 text-center text-sm">{qty}</span>
              <button
                onClick={() => setQty((q) => q + 1)}
                className="px-3 py-2 text-lg"
                aria-label="Más"
              >
                +
              </button>
            </div>
            <button
              disabled={!variant.available}
              onClick={() => onAdd(variant, qty)}
              className="flex-1 rounded-lg bg-whatsapp px-4 py-2.5 text-sm font-semibold text-white hover:bg-whatsapp-dark disabled:opacity-50"
            >
              {variant.available ? "Agregar al carrito" : "Agotado"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
