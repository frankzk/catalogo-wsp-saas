import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
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
