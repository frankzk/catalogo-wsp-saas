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

      <h2>2. Suscripción y pagos</h2>
      <ul>
        <li>El plan se cobra de forma mensual a través de Stripe.</li>
        <li>Ofrecemos un periodo de prueba gratuito; al finalizar, se cobra automáticamente salvo cancelación.</li>
        <li>Puedes cancelar en cualquier momento desde el portal de cliente; el acceso continúa hasta el fin del periodo pagado.</li>
        <li>Si un pago falla, podemos suspender el acceso al panel y/o el checkout del catálogo.</li>
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
