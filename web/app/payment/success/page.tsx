import { Suspense } from 'react';
import { PageShell } from '@/components/page-shell';
import { PaymentSuccessContent } from './success-content';

export default function PaymentSuccessPage() {
  return (
    <PageShell
      eyebrow="Paiement Wave"
      title="Paiement Wave"
      description="Confirmation de votre paiement en cours…"
    >
      <Suspense fallback={<div style={{ textAlign: 'center', padding: '60px 20px' }}>Chargement…</div>}>
        <PaymentSuccessContent />
      </Suspense>
    </PageShell>
  );
}
