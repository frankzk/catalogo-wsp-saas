import type { RetentionData } from "@/lib/retention";

function cellStyle(v: number | null): React.CSSProperties {
  if (v === null) return { backgroundColor: "transparent" };
  const alpha = 0.12 + (v / 100) * 0.8;
  return {
    backgroundColor: `rgba(15, 118, 110, ${alpha})`,
    color: v > 55 ? "#ffffff" : "#0f766e",
  };
}

export function RetentionCohort({ data }: { data: RetentionData }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <h3 className="font-semibold">Cohortes de retención</h3>
      <p className="mb-3 text-xs text-gray-400">
        % de clientes (por teléfono) que vuelven a comprar en los meses
        posteriores a su primer pedido.
      </p>

      {!data.hasData ? (
        <p className="py-8 text-center text-sm text-gray-400">
          Aún no hay suficientes pedidos para construir cohortes.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-1 text-center text-xs">
            <thead>
              <tr>
                <th className="px-2 py-1 text-left font-medium text-gray-500">
                  Cohorte
                </th>
                <th className="px-2 py-1 font-medium text-gray-500">Clientes</th>
                {data.offsets.map((k) => (
                  <th key={k} className="px-2 py-1 font-medium text-gray-500">
                    Mes {k}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.cohorts.map((c) => (
                <tr key={c.cohort}>
                  <td className="whitespace-nowrap px-2 py-1 text-left font-medium capitalize">
                    {c.cohort}
                  </td>
                  <td className="px-2 py-1 text-gray-500">{c.size}</td>
                  {c.values.map((v, k) => (
                    <td
                      key={k}
                      className="rounded px-2 py-1.5 font-semibold"
                      style={cellStyle(v)}
                    >
                      {v === null ? "" : `${v.toFixed(0)}%`}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
