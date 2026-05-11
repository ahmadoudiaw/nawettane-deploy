'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export function PaymentErrorContent() {
  const params = useSearchParams();
  const orderId = params.get('order_id');

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center', padding: '32px 24px' }}>
      <div style={{ fontSize: 64, marginBottom: 24 }}>❌</div>

      <div
        style={{
          background: '#fdecea',
          borderRadius: 12,
          padding: '16px 20px',
          marginBottom: 24,
          color: '#b71c1c',
          fontSize: 14,
        }}
      >
        Le paiement a été annulé ou une erreur s&apos;est produite. Vos billets n&apos;ont pas
        été générés. Vous pouvez réessayer depuis l&apos;application NAWETTANE.
        {orderId && (
          <div style={{ marginTop: 8, fontFamily: 'monospace', fontSize: 12, opacity: 0.7 }}>
            Réf : {orderId}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Link href="/matches" className="button button--primary">
          Retourner aux matchs
        </Link>
        <Link href="/" className="button button--ghost">
          Accueil
        </Link>
      </div>
    </div>
  );
}
