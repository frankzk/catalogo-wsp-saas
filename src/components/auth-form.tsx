"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const redirectedFrom = params.get("redirectedFrom") || "/dashboard";
  const callbackUrl = (next: string) =>
    `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    const supabase = createClient();
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: callbackUrl(redirectedFrom) },
        });
        if (error) throw error;
        if (data.session) {
          router.push(redirectedFrom);
          router.refresh();
        } else {
          setInfo(
            "Te enviamos un correo para confirmar tu cuenta. Revisa tu bandeja de entrada.",
          );
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push(redirectedFrom);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo salió mal");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl(redirectedFrom) },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {info && (
        <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
          {info}
        </div>
      )}

      <button
        type="button"
        onClick={handleGoogle}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
      >
        <GoogleIcon />
        Continuar con Google
      </button>

      <div className="flex items-center gap-3 text-xs text-gray-400">
        <span className="h-px flex-1 bg-gray-200" />o<span className="h-px flex-1 bg-gray-200" />
      </div>

      <form onSubmit={handleEmail} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Correo
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-whatsapp focus:ring-1 focus:ring-whatsapp"
            placeholder="tu@correo.com"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Contraseña
          </label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-whatsapp focus:ring-1 focus:ring-whatsapp"
            placeholder="••••••••"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-whatsapp px-4 py-2.5 text-sm font-semibold text-white hover:bg-whatsapp-dark disabled:opacity-60"
        >
          {loading
            ? "Procesando…"
            : mode === "signup"
              ? "Crear cuenta"
              : "Iniciar sesión"}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500">
        {mode === "signup" ? (
          <>
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="font-medium text-whatsapp-teal hover:underline">
              Inicia sesión
            </Link>
          </>
        ) : (
          <>
            ¿No tienes cuenta?{" "}
            <Link href="/signup" className="font-medium text-whatsapp-teal hover:underline">
              Regístrate gratis
            </Link>
          </>
        )}
      </p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}
