"use client";

import { useActionState } from "react";
import {
  saveStoreConfig,
  disconnectStore,
  type SaveState,
} from "@/app/dashboard/stores/actions";
import type { StoreConfig } from "@/lib/types";

const initialState: SaveState = { ok: false, message: "" };

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-gray-400">{hint}</span>}
    </label>
  );
}

const inputCls =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-whatsapp focus:ring-1 focus:ring-whatsapp";

export function StoreConfigForm({
  storeId,
  config,
  catalogBaseUrl,
}: {
  storeId: string;
  config: StoreConfig | null;
  catalogBaseUrl: string;
}) {
  const [state, formAction, pending] = useActionState(
    saveStoreConfig,
    initialState,
  );

  const badges = (config?.trust_badges_json ?? [])
    .map((b) => b.text)
    .join("\n");

  return (
    <div className="space-y-8">
      <form action={formAction} className="space-y-8">
        <input type="hidden" name="store_id" value={storeId} />

      {/* Branding */}
      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Marca y catálogo</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Enlace del catálogo (slug)"
            hint={`${catalogBaseUrl}/c/${config?.slug ?? "tu-tienda"}`}
          >
            <input
              name="slug"
              defaultValue={config?.slug ?? ""}
              required
              className={inputCls}
              placeholder="mi-tienda"
            />
          </Field>
          <Field label="Nombre de la marca">
            <input
              name="brand_name"
              defaultValue={config?.brand_name ?? ""}
              className={inputCls}
            />
          </Field>
          <Field label="URL del logo" hint="Imagen cuadrada recomendada">
            <input
              name="logo_url"
              defaultValue={config?.logo_url ?? ""}
              className={inputCls}
              placeholder="https://…"
            />
          </Field>
          <Field label="% de descuento" hint="Se aplica sobre el precio de Shopify">
            <input
              name="discount_percent"
              type="number"
              min={0}
              max={95}
              defaultValue={config?.discount_percent ?? 0}
              className={inputCls}
            />
          </Field>
          <Field label="Titular (headline)">
            <input
              name="headline"
              defaultValue={config?.headline ?? ""}
              className={inputCls}
            />
          </Field>
          <Field label="Subtítulo">
            <input
              name="subtitle"
              defaultValue={config?.subtitle ?? ""}
              className={inputCls}
            />
          </Field>
        </div>
      </section>

      {/* Checkout */}
      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Checkout y contacto</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Modo de checkout">
            <select
              name="checkout_mode"
              defaultValue={config?.checkout_mode ?? "whatsapp"}
              className={inputCls}
            >
              <option value="whatsapp">WhatsApp (wa.me)</option>
              <option value="cod">Contra entrega (COD)</option>
            </select>
          </Field>
          <Field label="Número de WhatsApp" hint="Con código de país, ej. 521555…">
            <input
              name="whatsapp_number"
              defaultValue={config?.whatsapp_number ?? ""}
              className={inputCls}
            />
          </Field>
          <Field label="País" hint="Código ISO, ej. MX, CO, PE">
            <input
              name="country"
              defaultValue={config?.country ?? ""}
              className={inputCls}
            />
          </Field>
          <Field label="Moneda" hint="Ej. MXN, COP, USD">
            <input
              name="currency"
              defaultValue={config?.currency ?? ""}
              className={inputCls}
            />
          </Field>
        </div>
      </section>

      {/* Telegram + trust */}
      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Notificaciones y confianza</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Token del bot de Telegram"
            hint={
              config?.telegram_bot_token_enc
                ? "Ya configurado. Deja vacío para conservarlo."
                : "Se guarda cifrado."
            }
          >
            <input
              name="telegram_bot_token"
              type="password"
              autoComplete="off"
              placeholder={
                config?.telegram_bot_token_enc ? "•••••••• (configurado)" : ""
              }
              className={inputCls}
            />
          </Field>
          <Field label="Chat ID de Telegram">
            <input
              name="telegram_chat_id"
              defaultValue={config?.telegram_chat_id ?? ""}
              className={inputCls}
            />
          </Field>
        </div>
        <div className="mt-4">
          <Field
            label="Sellos de confianza"
            hint="Uno por línea, ej. «Pago contra entrega»"
          >
            <textarea
              name="trust_badges"
              rows={3}
              defaultValue={badges}
              className={inputCls}
            />
          </Field>
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            name="disable_checkout_when_unpaid"
            defaultChecked={config?.disable_checkout_when_unpaid ?? true}
            className="h-4 w-4 rounded border-gray-300"
          />
          Desactivar el checkout si se alcanza el tope del plan o el pago falla
        </label>
      </section>

      <div className="flex items-center justify-between">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-whatsapp px-6 py-2.5 text-sm font-semibold text-white hover:bg-whatsapp-dark disabled:opacity-60"
        >
          {pending ? "Guardando…" : "Guardar cambios"}
        </button>
        {state.message && (
          <span
            className={`text-sm ${state.ok ? "text-green-600" : "text-red-600"}`}
          >
            {state.message}
          </span>
        )}
      </div>

      </form>

      {/* Disconnect — separate form to avoid nested submit */}
      <DisconnectButton storeId={storeId} />
    </div>
  );
}

function DisconnectButton({ storeId }: { storeId: string }) {
  return (
    <div className="border-t border-gray-100 pt-6">
      <form action={disconnectStore}>
        <input type="hidden" name="store_id" value={storeId} />
        <button
          type="submit"
          className="text-sm font-medium text-red-600 hover:underline"
        >
          Desconectar esta tienda
        </button>
      </form>
    </div>
  );
}
