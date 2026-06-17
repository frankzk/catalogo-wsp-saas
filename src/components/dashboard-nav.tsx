"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard", label: "Resumen", exact: true },
  { href: "/dashboard/stores", label: "Tiendas" },
  { href: "/dashboard/orders", label: "Pedidos" },
  { href: "/dashboard/metrics", label: "Métricas" },
  { href: "/dashboard/billing", label: "Facturación" },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="no-scrollbar flex gap-1 overflow-x-auto">
      {NAV.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              active
                ? "bg-whatsapp-light text-whatsapp-teal"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
