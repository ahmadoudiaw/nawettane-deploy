import Link from 'next/link';
import { PageShell } from '@/components/page-shell';
import { getPublicMatch } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/format';

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const match = await getPublicMatch(id);

  return (
    <PageShell
      eyebrow={match.organization.name}
      title={`${match.homeTeam.name} vs ${match.awayTeam.name}`}
      description={`${match.competitionName} · ${match.stage ?? 'Rencontre officielle'}`}
    >
      <div className="split split--public">
        <section className="panel stack">
          <div className="meta">
            <span className="pill">{formatDate(match.matchDate)}</span>
            <span className="pill">{match.season.name}</span>
          </div>

          <div className="card card--contrast">
            <h3>Informations du match</h3>
            <p className="muted">Lieu: {match.venue.name}</p>
            <p className="muted">Adresse: {match.venue.address ?? 'Non précisée'}</p>
            <p className="muted">Capacité: {match.venue.capacity ?? 'N/A'}</p>
            <p className="muted">Quota ticket: {match.ticketQuota}</p>
            <p className="muted">Zone: {match.organization.name}</p>
          </div>

          <div className="card card--contrast stack">
            <div>
              <h3>Catégories disponibles</h3>
              <p className="muted">
                Sélectionnez votre catégorie au checkout selon le budget et la disponibilité.
              </p>
            </div>
            <div className="category-list">
              {match.ticketCategories.map((category) => {
                const remaining = category.quota - category.soldCount;

                return (
                  <div key={category.id} className="category-row">
                    <div className="category-row__identity">
                      <span
                        className="category-dot"
                        style={{ backgroundColor: category.badgeColor }}
                      />
                      <div>
                        <strong>{category.name}</strong>
                        <div className="muted">
                          {remaining} places restantes sur {category.quota}
                        </div>
                      </div>
                    </div>
                    <div className="category-row__price">
                      {formatCurrency(category.price)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <aside className="panel stack action-panel">
          <div>
            <h3>Achat rapide</h3>
            <p className="muted">
              Paiement sécurisé via Wave ou Orange Money.
            </p>
          </div>
          <Link className="button button--accent" href={`/checkout/${match.id}`}>
            Choisir une catégorie
          </Link>
        </aside>
      </div>
    </PageShell>
  );
}
