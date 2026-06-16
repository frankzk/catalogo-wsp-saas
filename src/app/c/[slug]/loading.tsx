export default function CatalogLoading() {
  return (
    <div className="min-h-screen bg-whatsapp-bg">
      <header className="bg-whatsapp-teal px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-full bg-white/30" />
          <div className="h-4 w-32 animate-pulse rounded bg-white/30" />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-xl bg-white shadow-sm">
              <div className="aspect-square w-full animate-pulse bg-gray-200" />
              <div className="space-y-2 p-2">
                <div className="h-3 w-3/4 animate-pulse rounded bg-gray-200" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-gray-200" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
