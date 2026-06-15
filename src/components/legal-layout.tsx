import Link from "next/link";

export function LegalLayout({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100">
        <div className="mx-auto max-w-3xl px-6 py-4">
          <Link href="/" className="text-lg font-bold">
            Catálogo<span className="text-whatsapp">WSP</span>
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="mt-2 text-sm text-gray-500">Última actualización: {updated}</p>
        <div className="prose-legal mt-8 space-y-6 text-sm leading-relaxed text-gray-700 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-gray-900 [&_ul]:list-disc [&_ul]:pl-6">
          {children}
        </div>
        <p className="mt-12 rounded-lg bg-amber-50 px-4 py-3 text-xs text-amber-800">
          Esta es una plantilla de referencia. Revísala con un asesor legal antes
          de operar y de listar tu app en el Shopify App Store.
        </p>
      </main>
    </div>
  );
}
