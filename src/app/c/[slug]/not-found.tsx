import Link from "next/link";

export default function CatalogNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-whatsapp-bg px-4 text-center">
      <div className="rounded-2xl bg-white p-8 shadow">
        <p className="text-4xl">🛍️</p>
        <h1 className="mt-3 text-xl font-bold">Catálogo no encontrado</h1>
        <p className="mt-1 text-sm text-gray-500">
          El enlace que abriste no existe o fue desactivado.
        </p>
        <Link
          href="/"
          className="mt-5 inline-block rounded-lg bg-whatsapp px-5 py-2 text-sm font-semibold text-white hover:bg-whatsapp-dark"
        >
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}
