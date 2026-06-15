import { LegalLayout } from "@/components/legal-layout";

export const metadata = { title: "Términos del Servicio" };

export default function TermsPage() {
  return (
    <LegalLayout title="Términos del Servicio" updated="15 de junio de 2026">
      <p>
        Al usar Catálogo WSP aceptas estos Términos. Si no estás de acuerdo, no
        uses el servicio.
      </p>

      <h2>1. El servicio</h2>
      <p>
        Catálogo WSP es un software de suscripción (SaaS) que permite publicar un
        catálogo a partir de una tienda Shopify y recibir pedidos por WhatsApp o
        contra entrega (COD).
      </p>

      <h2>2. Planes y pagos</h2>
      <ul>
        <li>Plan Free: sin costo, con un límite de 10 pedidos generados por mes.</li>
        <li>Plan Pro: cuota mensual fija que incluye 10 pedidos, más un cargo por uso de $0.05 por cada pedido adicional generado a través del servicio, facturados mediante Stripe.</li>
        <li>Los cargos por uso se acumulan durante el periodo y se cobran en la factura correspondiente.</li>
        <li>Si ofrecemos un periodo de prueba, al finalizar se cobra automáticamente salvo cancelación.</li>
        <li>Puedes cancelar en cualquier momento desde el portal de cliente; el acceso Pro continúa hasta el fin del periodo pagado.</li>
        <li>Si un pago falla, tu cuenta puede volver al plan Free (con su límite mensual de pedidos).</li>
      </ul>

      <h2>3. Responsabilidades del comercio</h2>
      <ul>
        <li>Eres responsable de tus productos, precios, inventario y del cumplimiento de los pedidos.</li>
        <li>Debes cumplir las políticas de Shopify, WhatsApp y las leyes aplicables.</li>
        <li>Eres responsable de la veracidad de la información mostrada en tu catálogo.</li>
      </ul>

      <h2>4. Disponibilidad</h2>
      <p>
        Hacemos esfuerzos razonables por mantener el servicio disponible, pero no
        garantizamos una operación ininterrumpida.
      </p>

      <h2>5. Limitación de responsabilidad</h2>
      <p>
        El servicio se ofrece &quot;tal cual&quot;. En la medida permitida por la ley, no
        somos responsables por daños indirectos derivados del uso del servicio.
      </p>

      <h2>6. Cambios</h2>
      <p>Podemos actualizar estos Términos; los cambios se publicarán en esta página.</p>
    </LegalLayout>
  );
}
