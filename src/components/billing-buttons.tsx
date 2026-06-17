"use client";

import { useState } from "react";

async function startFlow(
  endpoint: string,
  onError: (msg: string) => void,
  onLoading: (v: boolean) => void,
) {
  onLoading(true);
  onError("");
  try {
    const res = await fetch(endpoint, { method: "POST" });
    const data = (await res.json()) as { url?: string; error?: string };
    if (!res.ok || !data.url) {
      throw new Error(data.error || "No se pudo iniciar el proceso");
    }
    window.location.href = data.url;
  } catch (err) {
    onError(err instanceof Error ? err.message : "Error inesperado");
    onLoading(false);
  }
}

export function SubscribeButton({
  label = "Activar suscripción",
}: {
  label?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  return (
    <div>
      <button
        onClick={() => startFlow("/api/stripe/checkout", setError, setLoading)}
        disabled={loading}
        className="rounded-lg bg-whatsapp px-5 py-2.5 text-sm font-semibold text-white hover:bg-whatsapp-dark disabled:opacity-60"
      >
        {loading ? "Redirigiendo…" : label}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}

export function ManageBillingButton({
  label = "Administrar suscripción",
}: {
  label?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  return (
    <div>
      <button
        onClick={() => startFlow("/api/stripe/portal", setError, setLoading)}
        disabled={loading}
        className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
      >
        {loading ? "Redirigiendo…" : label}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
