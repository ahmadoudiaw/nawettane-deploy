'use client';

import { formatCurrency } from '@/lib/format';
import type { WizardData, RefData } from './types';
import type { VenueAvailabilityResult } from '@/lib/api';

interface StepReviewProps {
  data: WizardData;
  refData: RefData;
  submitting: boolean;
  venueAvailability?: VenueAvailabilityResult | null;
  venueAvailabilityLoading?: boolean;
}

function ReviewRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="wiz-review-row">
      <dt className="wiz-review-row__label">{label}</dt>
      <dd className="wiz-review-row__value">{value || <span className="muted">—</span>}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="wiz-review-section">
      <div className="wiz-review-section__title">{title}</div>
      <dl className="wiz-review-dl">{children}</dl>
    </div>
  );
}

export function StepReview({ data, refData, submitting, venueAvailability, venueAvailabilityLoading }: StepReviewProps) {
  const season = refData.seasons.find((s) => s.id === data.seasonId);
  const homeTeam = refData.teams.find((t) => t.id === data.homeTeamId);
  const awayTeam = refData.teams.find((t) => t.id === data.awayTeamId);
  const homeZone = refData.zones.find((z) => z.id === data.homeZoneId);
  const awayZone = refData.zones.find((z) => z.id === data.awayZoneId);
  const venue = refData.venues.find((v) => v.id === data.venueId);

  const matchDateFmt = data.matchDate
    ? new Date(`${data.matchDate}T${data.matchTime}:00`).toLocaleString('fr-FR', {
        weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : '';

  const totalTickets = data.categories.reduce((s, c) => s + (Number(c.quota) || 0), 0);
  const totalRevenue = data.categories.reduce(
    (s, c) => s + (Number(c.price) || 0) * (Number(c.quota) || 0),
    0,
  );

  return (
    <div className="stack">
      <div className="wiz-review-header">
        <div className="wiz-review-header__teams">
          <span className="wiz-review-header__team">{homeTeam?.name ?? '?'}</span>
          <span className="wiz-review-header__vs">VS</span>
          <span className="wiz-review-header__team">{awayTeam?.name ?? '?'}</span>
        </div>
        {matchDateFmt && (
          <div className="wiz-review-header__date">{matchDateFmt}</div>
        )}
      </div>

      <div className="wiz-review-grid">
        <Section title="Général">
          <ReviewRow label="Saison" value={season?.name} />
          <ReviewRow label="Compétition" value={data.competitionName} />
          <ReviewRow label="Phase" value={data.stage} />
        </Section>

        <Section title="Équipes">
          <ReviewRow label="Zone domicile" value={homeZone?.name} />
          <ReviewRow label="Équipe domicile" value={homeTeam?.name} />
          <ReviewRow label="Zone extérieure" value={awayZone?.name} />
          <ReviewRow label="Équipe extérieure" value={awayTeam?.name} />
        </Section>

        <Section title="Lieu">
          <ReviewRow label="Stade" value={venue?.name} />
          {venue?.address && <ReviewRow label="Adresse" value={venue.address} />}
          {venue?.capacity && (
            <ReviewRow label="Capacité" value={`${venue.capacity.toLocaleString('fr-FR')} places`} />
          )}
        </Section>

        <Section title="Billetterie">
          {data.categories.map((cat) => (
            <ReviewRow
              key={cat._id}
              label={cat.name}
              value={
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{ width: 10, height: 10, borderRadius: '50%', background: cat.badgeColor, flexShrink: 0 }}
                  />
                  {formatCurrency(Number(cat.price))} · {Number(cat.quota).toLocaleString('fr-FR')} billets
                </span>
              }
            />
          ))}
          <ReviewRow
            label="Total"
            value={
              <strong>
                {totalTickets.toLocaleString('fr-FR')} billets · {formatCurrency(totalRevenue)}
              </strong>
            }
          />
        </Section>
      </div>

      {data.venueId && data.matchDate && (
        <div
          className={`wiz-avail${
            venueAvailabilityLoading
              ? ' wiz-avail--loading'
              : venueAvailability?.available === false
              ? ' wiz-avail--conflict'
              : venueAvailability?.available
              ? ' wiz-avail--ok'
              : ' wiz-avail--loading'
          }`}
          role="alert"
          aria-live="assertive"
        >
          {venueAvailabilityLoading ? (
            <>
              <span className="wiz-avail__icon" aria-hidden>⏳</span>
              <span>Vérification de disponibilité…</span>
            </>
          ) : venueAvailability ? (
            <>
              <span className="wiz-avail__icon" aria-hidden>
                {venueAvailability.available ? '✓' : '⚠'}
              </span>
              <span>{venueAvailability.message}</span>
            </>
          ) : null}
        </div>
      )}

      <p className="wiz-review-notice">
        Le match sera créé en statut <strong>Brouillon</strong>. Vous pourrez le publier depuis la liste des matchs.
      </p>
    </div>
  );
}
