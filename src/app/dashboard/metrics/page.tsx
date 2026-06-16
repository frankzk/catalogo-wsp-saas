import Link from "next/link";
import { getAnalytics } from "@/lib/analytics";
import { AnalyticsDashboard } from "@/components/analytics-dashboard";

export const metadata = { title: "Métricas" };

const PERIODS = [7, 30, 90];

export default async function MetricsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const params = await searchParams;
  const requested = Number(params.days);
  const days = PERIODS.includes(requested) ? requested : 30;

  const data = await getAnalytics(days);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Métricas</h1>
          <p className="mt-1 text-sm text-gray-500">
            Panel de analítica de tu negocio.
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-1">
          {PERIODS.map((p) => (
            <Link
              key={p}
              href={`/dashboard/metrics?days=${p}`}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                p === days
                  ? "bg-whatsapp text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {p} días
            </Link>
          ))}
        </div>
      </div>

      <AnalyticsDashboard data={data} />
    </div>
  );
}
