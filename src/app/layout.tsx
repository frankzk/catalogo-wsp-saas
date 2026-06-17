import type { Metadata } from "next";
import { NEXT_PUBLIC_APP_BASE_URL } from "@/lib/env";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(NEXT_PUBLIC_APP_BASE_URL),
  title: {
    default: "Catálogo WhatsApp / COD",
    template: "%s · Catálogo WhatsApp / COD",
  },
  description:
    "Crea un catálogo estilo WhatsApp Business para tu tienda Shopify y vende por WhatsApp o contra entrega (COD).",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
