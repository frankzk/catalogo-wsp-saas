"use client";

import { useState } from "react";
import Image from "next/image";
import {
  COUNTRIES,
  countryByCode,
  isValidNationalNumber,
  toE164,
  type Country,
} from "@/lib/countries";
import type { CatalogConfig } from "@/lib/types";

export function PhoneGate({
  config,
  onSubmit,
}: {
  config: CatalogConfig;
  onSubmit: (phone: string) => void;
}) {
  const [country, setCountry] = useState<Country>(
    countryByCode(config.country) ?? COUNTRIES[0],
  );
  const [num, setNum] = useState("");
  const [err, setErr] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidNationalNumber(country, num)) {
      setErr(`Ingresa un número válido de ${country.len} dígitos.`);
      return;
    }
    onSubmit(toE164(country.dial, num));
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-whatsapp-bg px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg">
        {config.logoUrl ? (
          <Image
            src={config.logoUrl}
            alt={config.brandName ?? "Logo"}
            width={72}
            height={72}
            className="mx-auto h-18 w-18 rounded-full object-cover"
            unoptimized
          />
        ) : (
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-whatsapp text-2xl font-bold text-white">
            {(config.brandName ?? "C").charAt(0).toUpperCase()}
          </div>
        )}

        <h1 className="mt-4 text-center text-xl font-bold">
          {config.brandName ?? "Catálogo"}
        </h1>
        <p className="mt-1 text-center text-sm text-gray-500">
          {config.headline ?? "Ingresa tu WhatsApp para ver el catálogo"}
        </p>

        <form onSubmit={submit} className="mt-6 space-y-3">
          <div className="flex gap-2">
            <select
              value={country.code}
              onChange={(e) =>
                setCountry(
                  COUNTRIES.find((c) => c.code === e.target.value) ?? country,
                )
              }
              className="rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm outline-none focus:border-whatsapp"
              aria-label="País"
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} +{c.dial}
                </option>
              ))}
            </select>
            <input
              type="tel"
              inputMode="numeric"
              value={num}
              onChange={(e) => {
                setNum(e.target.value.replace(/\D/g, "").slice(0, country.len));
                setErr("");
              }}
              placeholder="Tu número de WhatsApp"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-whatsapp focus:ring-1 focus:ring-whatsapp"
            />
          </div>
          {err && <p className="text-sm text-red-600">{err}</p>}
          <button
            type="submit"
            className="w-full rounded-lg bg-whatsapp px-4 py-2.5 text-sm font-semibold text-white hover:bg-whatsapp-dark"
          >
            Ver catálogo
          </button>
        </form>

        {config.trustBadges.length > 0 && (
          <ul className="mt-6 space-y-1.5 text-xs text-gray-500">
            {config.trustBadges.map((b, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="text-whatsapp">✓</span>
                {b.text}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
