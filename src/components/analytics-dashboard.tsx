"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney } from "@/lib/money";
import type { AnalyticsData, Kpi } from "@/lib/analytics";

const PALETTE = ["#0f766e", "#25D366", "#0ea5e9", "#f59e0b", "#8b5cf6", "#ef4444"];

function pct(n: number): string {
  return `${n.toFixed(n < 10 ? 1 : 0)}%`;
}

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) {
    return (
      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-500">
        nuevo
      </span>
    );
  }
  const up = delta >= 0;
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
        up ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
      }`}
    >
      {up ? "▲" : "▼"} {Math.abs(delta).toFixed(0)}%
    </span>
  );
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const series = data.map((v, i) => ({ i, v }));
  const id = `spark-${color.replace("#", "")}`;
  return (
    <ResponsiveContainer width="100%" height={40}>
      <AreaChart data={series} margin={{ top: 4, bottom: 0, left: 0, right: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#${id})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function KpiCard({
  label,
  display,
  kpi,
  spark,
  color,
}: {
  label: string;
  display: string;
  kpi: Kpi;
  spark: number[];
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{label}</p>
        <DeltaBadge delta={kpi.delta} />
      </div>
      <p className="mt-1 text-2xl font-extrabold tracking-tight">{display}</p>
      <div className="mt-2">
        <Sparkline data={spark} color={color} />
      </div>
    </div>
  );
}

interface TooltipProps {
  active?: boolean;
  payload?: { name?: string; value?: number; dataKey?: string | number }[];
  label?: string;
}

function ChartCard({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-gray-200 bg-white p-5 ${className}`}>
      <h3 className="font-semibold">{title}</h3>
      {subtitle && <p className="mb-2 text-xs text-gray-400">{subtitle}</p>}
      <div className="mt-3">{children}</div>
    </div>
  );
}

export function AnalyticsDashboard({ data }: { data: AnalyticsData }) {
  const { kpis, daily, funnel, topProducts, byStore, weekday, totals, repeat, currency } =
    data;

  if (!data.hasData) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center">
        <p className="text-4xl">📊</p>
        <h3 className="mt-3 text-lg font-semibold">Aún no hay datos</h3>
        <p className="mt-1 text-sm text-gray-500">
          Cuando los clientes visiten tu catálogo y hagan pedidos, verás aquí tus
          métricas y gráficas.
        </p>
      </div>
    );
  }

  const moneyTooltip = ({ active, payload, label }: TooltipProps) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg">
        <p className="mb-1 font-semibold">{label}</p>
        {payload.map((p) => (
          <p key={p.dataKey} className="text-gray-600">
            {p.name}:{" "}
            <span className="font-medium text-gray-900">
              {p.dataKey === "revenue"
                ? formatMoney(p.value ?? 0, currency)
                : (p.value ?? 0).toLocaleString("es")}
            </span>
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Ingresos (COD)"
          display={formatMoney(kpis.revenue.value, currency)}
          kpi={kpis.revenue}
          spark={daily.map((d) => d.revenue)}
          color="#0f766e"
        />
        <KpiCard
          label="Pedidos"
          display={kpis.orders.value.toLocaleString("es")}
          kpi={kpis.orders}
          spark={daily.map((d) => d.orders)}
          color="#25D366"
        />
        <KpiCard
          label="Ticket promedio"
          display={formatMoney(kpis.aov.value, currency)}
          kpi={kpis.aov}
          spark={daily.map((d) => d.revenue)}
          color="#0ea5e9"
        />
        <KpiCard
          label="Conversión"
          display={pct(kpis.conversion.value)}
          kpi={kpis.conversion}
          spark={daily.map((d) => d.views)}
          color="#8b5cf6"
        />
      </div>

      {/* Revenue & orders trend */}
      <ChartCard
        title="Ingresos y pedidos"
        subtitle={`Últimos ${data.rangeDays} días`}
      >
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={daily} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
            <defs>
              <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0f766e" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#0f766e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              fontSize={11}
              minTickGap={24}
            />
            <YAxis yAxisId="left" hide />
            <YAxis yAxisId="right" orientation="right" hide />
            <Tooltip content={moneyTooltip} />
            <Bar
              yAxisId="right"
              dataKey="orders"
              name="Pedidos"
              fill="#25D366"
              radius={[4, 4, 0, 0]}
              barSize={10}
            />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="revenue"
              name="Ingresos"
              stroke="#0f766e"
              strokeWidth={2}
              fill="url(#revFill)"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Funnel */}
        <ChartCard title="Embudo de conversión" subtitle="Vistas → pedidos">
          <div className="space-y-3">
            {funnel.map((s, i) => {
              const max = funnel[0]?.value || 1;
              const width = max ? Math.max(3, (s.value / max) * 100) : 0;
              const conv =
                i > 0 && funnel[i - 1].value > 0
                  ? (s.value / funnel[i - 1].value) * 100
                  : null;
              return (
                <div key={s.step}>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{s.step}</span>
                    <span className="font-semibold">
                      {s.value.toLocaleString("es")}
                      {conv !== null && (
                        <span className="ml-2 text-xs font-normal text-gray-400">
                          {conv.toFixed(0)}%
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="mt-1 h-3 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-3 rounded-full transition-all"
                      style={{
                        width: `${width}%`,
                        backgroundColor: PALETTE[i % PALETTE.length],
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </ChartCard>

        {/* By store */}
        <ChartCard title="Ventas por tienda" subtitle="Ingresos del periodo">
          {byStore.length === 0 ? (
            <p className="py-12 text-center text-sm text-gray-400">Sin pedidos aún.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={byStore}
                  dataKey="revenue"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {byStore.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [
                    formatMoney(Number(value), currency),
                    String(name),
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Top products */}
        <ChartCard title="Productos más vendidos" subtitle="Por ingresos">
          {topProducts.length === 0 ? (
            <p className="py-12 text-center text-sm text-gray-400">Sin ventas aún.</p>
          ) : (
            <ResponsiveContainer
              width="100%"
              height={Math.max(160, topProducts.length * 42)}
            >
              <BarChart
                data={topProducts}
                layout="vertical"
                margin={{ left: 8, right: 16 }}
              >
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="title"
                  width={130}
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                />
                <Tooltip
                  formatter={(value) => [formatMoney(Number(value), currency), "Ingresos"]}
                  cursor={{ fill: "#f8fafc" }}
                />
                <Bar dataKey="revenue" fill="#0f766e" radius={[0, 6, 6, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Weekday */}
        <ChartCard title="Pedidos por día de la semana" subtitle="¿Cuándo te compran?">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={weekday} margin={{ top: 8, right: 8, left: 8 }}>
              <CartesianGrid vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis hide />
              <Tooltip cursor={{ fill: "#f8fafc" }} />
              <Bar dataKey="orders" fill="#25D366" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Vistas" value={totals.views.toLocaleString("es")} />
        <Stat label="Vieron producto" value={totals.productViews.toLocaleString("es")} />
        <Stat label="Agregaron" value={totals.addToCart.toLocaleString("es")} />
        <Stat label="Pedidos WhatsApp" value={totals.whatsappOrders.toLocaleString("es")} />
        <Stat label="Clientes" value={repeat.customers.toLocaleString("es")} />
        <Stat label="Recompra" value={pct(repeat.repeatRate)} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}
