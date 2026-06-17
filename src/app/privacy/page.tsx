import { LegalLayout } from "@/components/legal-layout";

export const metadata = { title: "Política de Privacidad" };

export default function PrivacyPage() {
  return (
    <LegalLayout title="Política de Privacidad" updated="15 de junio de 2026">
      <p>
        Esta Política de Privacidad describe cómo Catálogo WSP (&quot;nosotros&quot;)
        recopila, usa y protege la información cuando los comercios usan nuestro
        servicio y cuando los clientes finales navegan los catálogos publicados.
      </p>

      <h2>1. Información que recopilamos</h2>
      <ul>
        <li>Datos de la cuenta del comercio: correo, datos de facturación (vía Stripe).</li>
        <li>Datos de la tienda Shopify conectada: dominio, productos, inventario y pedidos.</li>
        <li>Datos de clientes finales: nombre, teléfono y dirección al realizar un pedido.</li>
        <li>Datos de uso: vistas, eventos del catálogo y métricas agregadas.</li>
      </ul>

      <h2>2. Cómo usamos la información</h2>
      <ul>
        <li>Para operar el catálogo, procesar pedidos (COD/WhatsApp) y crear órdenes en Shopify.</li>
        <li>Para gestionar la suscripción y la facturación.</li>
        <li>Para enviar notificaciones de pedidos (por ejemplo, Telegram) al comercio.</li>
        <li>Para mejorar y asegurar el servicio.</li>
      </ul>

      <h2>3. Almacenamiento y seguridad</h2>
      <p>
        Los tokens de acceso a Shopify y de Telegram se almacenan cifrados
        (AES-256-GCM). Aplicamos aislamiento por comercio mediante Row Level
        Security. No exponemos secretos en el navegador.
      </p>

      <h2>4. Terceros</h2>
      <p>
        Usamos Supabase (base de datos y autenticación), Stripe (pagos), Shopify
        (tienda) y opcionalmente Telegram (notificaciones). Cada uno procesa
        datos conforme a sus propias políticas.
      </p>

      <h2>5. Cumplimiento (Shopify / GDPR)</h2>
      <p>
        Atendemos las solicitudes obligatorias de Shopify:
        <code>customers/data_request</code>, <code>customers/redact</code> y
        <code>shop/redact</code>. Los comercios pueden solicitar la eliminación de
        sus datos escribiéndonos.
      </p>

      <h2>6. Contacto</h2>
      <p>Para ejercer tus derechos o consultas, escríbenos a tu correo de soporte.</p>
    </LegalLayout>
  );
}
