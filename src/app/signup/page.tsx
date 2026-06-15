import { Suspense } from "react";
import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

export const metadata = { title: "Crear cuenta" };

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 block text-center text-xl font-bold">
          Catálogo<span className="text-whatsapp">WSP</span>
        </Link>
        <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
          <h1 className="mb-2 text-center text-2xl font-bold">Crea tu cuenta</h1>
          <p className="mb-6 text-center text-sm text-gray-500">
            14 días de prueba gratis. Cancela cuando quieras.
          </p>
          <Suspense fallback={null}>
            <AuthForm mode="signup" />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
