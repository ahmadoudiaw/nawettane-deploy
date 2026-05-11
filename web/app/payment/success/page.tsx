'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { PageShell } from '@/components/page-shell';
import { API_BASE_URL } from '@/lib/config';

interface OrderStatus {
  id: string;
  reference: string;
  status: string;
  tickets: { id: string; ticketCode: string; status: string }[];
}

export default function PaymentSuccessPage() {
  const params = useSearchParams();
  const orderId = params.get('order_id');
  const [order, setOrder] = useState<OrderStatus | null>(null);
  const [polling, setPolling] = useState(true);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (!orderId) { setPolling(false); return; }

    let cancelled = false;
    const MAX_ATTEMPTS = 10;

    async function poll() {
      if (cancelled || attempts >= MAX_ATTEMPTS) { setPolling(false); return; }

      try {
        const res = await fetch(`${API_BASE_URL}/payments/${orderId}/status`);
        if (res.ok) {
          const data = (await res.json()) as OrderStatus;
          if (!cancelled) setOrder(data);
          if (data.status === 'PAID' || attempts >= MAX_ATTEMPTS - 1) {
            if (!cancelled) setPolling(false);
            return;
          }
        }
      } catch {
        // ignore réseau, on réessaie
      }

      if (!cancelled) {
        setAttempts((a) => a + 1);
        setTimeout(poll, 2000);
      }
    }

    void poll();
    return () => { cancelled = true; };
  }, [orderId]); // eslint-disable-line react-hooks/exhaustive-deps

  const isPaid = order?.status === 'PAID';
  const ticketCount = order?.tickets?.length ?? 0;

  return (
    <PageShell
      eyebrow="Paiement Wave"
      title={isPaid ? 'Paiement confirmé !' : polling ? 'Confirmation en cours…' : 'Paiement reçu'}
      description={
        isPaid
          ? `${ticketCount} billet${ticketCount > 1 ? 's' : ''} généré${ticketCount > 1 ? 's' : ''} avec succès.`
          : polling
          ? 'Wave confirme votre paiement, veuillez patienter…'
          : 'Votre paiement a été reçu. Les billets seront disponibles dans l\'application.'
      }
    >
      <div style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center', padding: '32px 24px' }}>
        <div style={{ fontSize: 64, marginBottom: 24 }}>
          {isPaid ? '✅' : polling ? '⏳' : '✅'}
        </div>

        {isPaid && ticketCount > 0 && (
          <div
            style={{
              background: '#e8f5e9',
              borderRadius: 12,
              padding: '16px 20px',
              marginBottom: 24,
              textAlign: 'left',
            }}
          >
            <p style={{ fontWeight: 700, marginBottom: 8, color: '#2e7d32' }}>
              Vos billets :
            </p>
            {order?.tickets.map((t) => (
              <div key={t.id} style={{ fontFamily: 'monospace', fontSize: 13, color: '#1b5e20' }}>
                {t.ticketCode}
              </div>
            ))}
          </div>
        )}

        {polling && (
          <p style={{ color: '#6b7280', marginBottom: 24, fontSize: 14 }}>
            Cette page se met à jour automatiquement. Vous pouvez également fermer et vérifier
            dans l&apos;application NAWETTANE.
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Link href="/matches" className="button button--primary">
            Voir tous les matchs
          </Link>
          <Link href="/" className="button button--ghost">
            Accueil
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
