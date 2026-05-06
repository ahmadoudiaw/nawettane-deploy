'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AdminGuard } from '@/components/admin-guard';
import { AdminNav } from '@/components/admin-nav';
import { PageShell } from '@/components/page-shell';
import { Field } from '@/components/form/Field';
import { SelectField } from '@/components/form/SelectField';
import { useToast } from '@/components/ToastProvider';
import { matchEditSchema, type MatchEditFormData } from '@/lib/schemas';
import { ApiError, formatApiError, getAdminMatch, updateMatch, checkVenueAvailability, type VenueAvailabilityResult } from '@/lib/api';
import { getSession } from '@/lib/auth';
import { Match } from '@/lib/types';
import { formatCurrency, formatDate, formatMatchStatus } from '@/lib/format';

export default function AdminMatchDetailPage() {
  const params = useParams<{ id: string }>();
  const toast = useToast();
  const [match, setMatch] = useState<Match | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [venueAvailability, setVenueAvailability] = useState<VenueAvailabilityResult | null>(null);
  const [venueAvailabilityLoading, setVenueAvailabilityLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MatchEditFormData>({
    resolver: zodResolver(matchEditSchema),
    defaultValues: { competitionName: '', category: 'SENIOR', stage: '', matchDate: '', status: 'DRAFT' },
  });

  const w = watch();
  const watchedMatchDate = watch('matchDate');

  useEffect(() => {
    const session = getSession();
    if (!session) return;

    getAdminMatch(params.id, session.token)
      .then((response) => {
        setMatch(response);
        reset({
          competitionName: response.competitionName,
          category: response.category ?? 'SENIOR',
          stage: response.stage ?? '',
          matchDate: response.matchDate.slice(0, 16),
          status: response.status,
        });
      })
      .catch((err) => {
        if (err instanceof ApiError && err.globallyHandled) return;
        setDataError(formatApiError(err));
      });
  }, [params.id, reset]);

  useEffect(() => {
    if (!match || !watchedMatchDate) {
      setVenueAvailability(null);
      return;
    }
    const session = getSession();
    if (!session) return;
    setVenueAvailabilityLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const isoDate = new Date(watchedMatchDate).toISOString();
        const result = await checkVenueAvailability(session.token, {
          venueId: match.venueId,
          matchDate: isoDate,
          excludeMatchId: match.id,
        });
        setVenueAvailability(result);
      } catch {
        setVenueAvailability(null);
      } finally {
        setVenueAvailabilityLoading(false);
      }
    }, 600);
    return () => clearTimeout(timeout);
  }, [match, watchedMatchDate]);

  async function onSubmit(data: MatchEditFormData) {
    // Safety guard — catches any state race bypassing the disabled button
    if (venueAvailability?.available === false) {
      toast.error('Stade indisponible', venueAvailability.message);
      return;
    }

    const session = getSession();
    if (!session) return;
    try {
      const updated = await updateMatch(session.token, params.id, {
        competitionName: data.competitionName,
        category: data.category,
        stage: data.stage || undefined,
        matchDate: new Date(data.matchDate).toISOString(),
        status: data.status,
      });
      setMatch(updated);
      toast.success('Match mis à jour.');
    } catch (err) {
      if (err instanceof ApiError && err.globallyHandled) return;
      toast.error('Mise à jour impossible', formatApiError(err));
    }
  }

  return (
    <PageShell
      eyebrow="Administration"
      title="Détail du match"
      description="Modifiez les informations du match et consultez les statistiques de billetterie."
    >
      <AdminGuard>
        <AdminNav />
        {dataError && <div className="error">{dataError}</div>}
        {!match ? (
          <div className="panel">Chargement du match…</div>
        ) : (
          <div className="split">
            <section className="panel stack">
              <h2>
                {match.homeTeam.name} vs {match.awayTeam.name}
              </h2>
              <div className="meta">
                <span className="pill">{formatMatchStatus(match.status)}</span>
                <span className="pill">{formatDate(match.matchDate)}</span>
                <span className="pill pill--warn">
                  Des {formatCurrency(match.ticketCategories[0]?.price ?? match.ticketPrice)}
                </span>
              </div>

              <form
                className="form card card--contrast"
                onSubmit={handleSubmit(onSubmit)}
                noValidate
              >
                <h3>Modifier le match</h3>
                <div className="form__grid">
                  <Field
                    label="Compétition"
                    id="competitionName"
                    required
                    error={errors.competitionName?.message}
                    success={!!w.competitionName && !errors.competitionName}
                    {...register('competitionName')}
                  />

                  <SelectField
                    label="Catégorie sportive"
                    id="category"
                    required
                    error={errors.category?.message}
                    {...register('category')}
                  >
                    <option value="SENIOR">Senior</option>
                    <option value="CADET">Cadet</option>
                  </SelectField>

                  <Field
                    label="Phase"
                    id="stage"
                    error={errors.stage?.message}
                    {...register('stage')}
                  />

                  <Field
                    label="Date et heure"
                    id="matchDate"
                    type="datetime-local"
                    required
                    error={errors.matchDate?.message}
                    success={!!w.matchDate && !errors.matchDate}
                    {...register('matchDate')}
                  />

                  {watchedMatchDate && (
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
                      role="status"
                      aria-live="polite"
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

                  <SelectField
                    label="Statut"
                    id="status"
                    error={errors.status?.message}
                    {...register('status')}
                  >
                    <option value="DRAFT">Brouillon</option>
                    <option value="PUBLISHED">Publié</option>
                    <option value="CLOSED">Clôturé</option>
                    <option value="CANCELLED">Annulé</option>
                  </SelectField>
                </div>

                <div className="button-row">
                  <button
                    className="button button--primary"
                    disabled={isSubmitting || venueAvailability?.available === false}
                    title={venueAvailability?.available === false ? venueAvailability.message : undefined}
                    type="submit"
                  >
                    {isSubmitting ? 'Enregistrement…' : 'Enregistrer'}
                  </button>
                </div>
              </form>
            </section>

            <aside className="panel stack">
              <div className="card">
                <h3>Contexte</h3>
                <p className="muted">Zone: {match.organization.name}</p>
                <p className="muted">Stade: {match.venue.name}</p>
                <p className="muted">Saison: {match.season.name}</p>
                <p className="muted">Catégorie: {match.category === 'CADET' ? 'Cadet' : 'Senior'}</p>
                <p className="muted">Quota: {match.ticketQuota}</p>
              </div>
              <div className="card stack">
                <h3>Catégories</h3>
                {match.ticketCategories.map((category) => (
                  <div key={category.id} className="category-row">
                    <div className="category-row__identity">
                      <span
                        className="category-dot"
                        style={{ backgroundColor: category.badgeColor }}
                      />
                      <div>
                        <strong>{category.name}</strong>
                        <div className="muted">
                          {category.soldCount}/{category.quota} vendus
                        </div>
                      </div>
                    </div>
                    <div className="category-row__price">{formatCurrency(category.price)}</div>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        )}
      </AdminGuard>
    </PageShell>
  );
}
