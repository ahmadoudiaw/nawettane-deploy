'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getPublicMatch } from '@/lib/api';
import { Match } from '@/lib/types';
import { PageShell } from '@/components/page-shell';
import { DownloadAppModal } from '@/components/download-app-modal';
import { formatCurrency, formatDate } from '@/lib/format';

export default function CheckoutPage() {
  const params = useParams<{ matchId: string }>();
  const [match, setMatch] = useState<Match | null>(null);
  const [modalOpen, setModalOpen] = useState(true);

  useEffect(() => {
    getPublicMatch(params.matchId).then(setMatch).catch(() => null);
  }, [params.matchId]);

  return (
    <PageShell
      eyebrow="Achat de billets"
      title="Application requise"
      description="L'achat de billets NAWETTANE se fait depuis l'application mobile pour garantir la sécurité et la disponibilité hors-ligne de vos billets."
    >
      <DownloadAppModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onContinueWeb={() => setModalOpen(false)}
      />

      {/* Match preview card */}
      {match ? (
        <div className="panel stack" style={{ maxWidth: 540, margin: '0 auto' }}>
          <div className="card">
            <p className="muted">{match.organization.name}</p>
            <h2>{match.homeTeam.name} vs {match.awayTeam.name}</h2>
            <p className="muted">{match.competitionName}</p>
            <div className="meta">
              <span className="pill">{formatDate(match.matchDate)}</span>
              {match.ticketCategories.map((cat) => (
                <span
                  key={cat.id}
                  className="pill"
                  style={{ color: cat.badgeColor }}
                >
                  {cat.name} · {formatCurrency(cat.price)}
                </span>
              ))}
            </div>
          </div>

          <div className="card" style={{ textAlign: 'center', padding: '32px 24px' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📱</div>
            <h3>Achetez depuis l&apos;application</h3>
            <p className="muted" style={{ marginBottom: 24 }}>
              Vos billets seront stockés dans l&apos;app et disponibles même sans connexion le jour du match.
            </p>
            <button
              className="button button--accent button--large"
              onClick={() => setModalOpen(true)}
              type="button"
            >
              Télécharger l&apos;application
            </button>
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📱</div>
          <h3>Achetez depuis l&apos;application NAWETTANE</h3>
          <p className="muted" style={{ marginBottom: 24 }}>
            L&apos;achat de billets est réservé à l&apos;application mobile.
          </p>
          <button
            className="button button--accent button--large"
            onClick={() => setModalOpen(true)}
            type="button"
          >
            Télécharger l&apos;application
          </button>
          <div style={{ marginTop: 16 }}>
            <Link href="/matches" className="button button--ghost">
              ← Retour aux matchs
            </Link>
          </div>
        </div>
      )}
    </PageShell>
  );
}
