import { Suspense } from 'react';
import { PageShell } from '@/components/page-shell';
import { PaymentErrorContent } from './error-content';

export default function PaymentErrorPage() {
  return (
    <PageShell
      eyebrow="Paiement Wave"
      title="Paiement non complété"
      description="Votre paiement Wave n'a pas abouti. Aucun montant n'a été débité."
    >
      <Suspense fallback={<div style={{ textAlign: 'center', padding: '60px 20px' }}>Chargement…</div>}>
        <PaymentErrorContent />
      </Suspense>
    </PageShell>
  );
}
