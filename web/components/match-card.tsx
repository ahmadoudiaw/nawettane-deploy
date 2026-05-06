import Link from 'next/link';
import { Match } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/format';

export function MatchCard({ match, admin = false }: { match: Match; admin?: boolean }) {
  const detailHref = admin ? `/admin/matches/${match.id}` : `/matches/${match.id}`;

  return (
    <article className="card match-card">
      <div className="match-card__topline">
        <div className="pill">{match.organization.name}</div>
        <div className="match-card__stage">{match.stage ?? 'Match officiel'}</div>
      </div>
      <h3 className="match-card__title">
        {match.homeTeam.name} vs {match.awayTeam.name}
      </h3>
      <p className="muted">{match.competitionName}</p>
      <div className="meta">
        <span className="pill">{formatDate(match.matchDate)}</span>
        <span className="pill">{match.ticketCategories.length} categories</span>
      </div>
      <div className="category-strip">
        {match.ticketCategories.slice(0, 3).map((category) => (
          <span
            key={category.id}
            className="category-chip"
            style={{ ['--chip-color' as string]: category.badgeColor }}
          >
            {category.name} · {formatCurrency(category.price)}
          </span>
        ))}
      </div>
      <div className="button-row match-card__actions">
        <Link className="button button--primary" href={detailHref}>
          Voir le match
        </Link>
        {!admin ? (
          <Link className="button button--secondary" href={`/checkout/${match.id}`}>
            Acheter
          </Link>
        ) : null}
      </div>
    </article>
  );
}
