'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminGuard } from '@/components/admin-guard';
import { AdminNav } from '@/components/admin-nav';
import { PageShell } from '@/components/page-shell';
import { useToast } from '@/components/ToastProvider';
import { StepGeneral } from '@/components/wizard-match/step-general';
import { StepTeams } from '@/components/wizard-match/step-teams';
import { StepVenue } from '@/components/wizard-match/step-venue';
import { StepTickets } from '@/components/wizard-match/step-tickets';
import { StepReview } from '@/components/wizard-match/step-review';
import {
  defaultData, validateStep, WIZARD_STORAGE_KEY,
  type WizardData, type RefData,
} from '@/components/wizard-match/types';
import {
  ApiError, formatApiError, createMatch, checkVenueAvailability,
  getSeasons, getRegions, getDepartments, getCommunes,
  getOdcavs, getZones, getTeams, getVenues,
  type VenueAvailabilityResult,
} from '@/lib/api';
import { getSession } from '@/lib/auth';

// ── Stepper ────────────────────────────────────────────────────────────────────

const STEPS = ['Général', 'Équipes', 'Lieu', 'Billetterie', 'Récapitulatif'];

function Stepper({ current, done }: { current: number; done: number }) {
  return (
    <div className="wiz-stepper" role="list">
      {STEPS.map((label, i) => {
        const state = i < done ? 'done' : i === current ? 'active' : 'idle';
        return (
          <div
            key={label}
            className={`wiz-step wiz-step--${state}`}
            role="listitem"
            aria-current={i === current ? 'step' : undefined}
          >
            <div className="wiz-step__circle">
              {state === 'done' ? (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <span>{i + 1}</span>
              )}
            </div>
            <span className="wiz-step__label">{label}</span>
            {i < STEPS.length - 1 && <div className="wiz-step__line" />}
          </div>
        );
      })}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function NewMatchWizardPage() {
  const router = useRouter();
  const toast = useToast();

  const [step, setStep] = useState(0);
  const [highestReached, setHighestReached] = useState(0);
  const [data, setData] = useState<WizardData>(defaultData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [refData, setRefData] = useState<RefData | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [venueAvailability, setVenueAvailability] = useState<VenueAvailabilityResult | null>(null);
  const [venueAvailabilityLoading, setVenueAvailabilityLoading] = useState(false);

  // ── Load draft from localStorage ──────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(WIZARD_STORAGE_KEY);
      if (raw) setData(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  // ── Persist draft ─────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(data));
    } catch { /* ignore */ }
  }, [data]);

  // ── Load reference data ───────────────────────────────────────────────────
  useEffect(() => {
    const session = getSession();
    if (!session) return;
    const t = session.token;
    Promise.all([
      getSeasons(t), getRegions(t), getDepartments(t), getCommunes(t),
      getOdcavs(t), getZones(t), getTeams(t), getVenues(t),
    ])
      .then(([seasons, regions, departments, communes, odcavs, zones, teams, venues]) => {
        setRefData({ seasons, regions, departments, communes, odcavs, zones, teams, venues });
      })
      .catch((err) => {
        setDataError(formatApiError(err));
      });
  }, []);

  // ── Venue availability check ──────────────────────────────────────────────
  useEffect(() => {
    if (!data.venueId || !data.matchDate || !data.matchTime) {
      setVenueAvailability(null);
      return;
    }
    const session = getSession();
    if (!session) return;
    setVenueAvailabilityLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const isoDate = new Date(`${data.matchDate}T${data.matchTime}:00`).toISOString();
        const result = await checkVenueAvailability(session.token, { venueId: data.venueId, matchDate: isoDate });
        setVenueAvailability(result);
      } catch {
        setVenueAvailability(null);
      } finally {
        setVenueAvailabilityLoading(false);
      }
    }, 600);
    return () => clearTimeout(timeout);
  }, [data.venueId, data.matchDate, data.matchTime]);

  // ── Derived cascade data for review step ─────────────────────────────────

  function patch(p: Partial<WizardData>) {
    setData((prev) => ({ ...prev, ...p }));
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  function goNext() {
    const errs = validateStep(step, data);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    const next = step + 1;
    setStep(next);
    setHighestReached((h) => Math.max(h, next));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function goPrev() {
    setErrors({});
    setStep((s) => Math.max(0, s - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    // Safety guard — catches any state race bypassing the disabled button
    if (venueAvailability?.available === false) {
      toast.error('Stade indisponible', venueAvailability.message);
      return;
    }

    const session = getSession();
    if (!session) return;
    setSubmitting(true);
    try {
      const payload = {
        seasonId: data.seasonId,
        organizationId: data.homeZoneId,
        venueId: data.venueId,
        homeTeamId: data.homeTeamId,
        awayTeamId: data.awayTeamId,
        competitionName: data.competitionName,
        category: data.category,
        stage: data.stage,
        matchDate: new Date(`${data.matchDate}T${data.matchTime}:00`).toISOString(),
        ticketCategories: data.categories.map((c) => ({
          name: c.name,
          price: c.price,
          quota: c.quota !== '' ? Number(c.quota) : null,
          badgeColor: c.badgeColor,
        })),
      };
      const created = await createMatch(session.token, payload);
      localStorage.removeItem(WIZARD_STORAGE_KEY);
      toast.success(`Match créé · brouillon ${created.id.slice(0, 8)}…`);
      router.push('/admin/matches');
    } catch (err) {
      if (err instanceof ApiError && err.globallyHandled) return;
      toast.error('Création impossible', formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render step content ───────────────────────────────────────────────────

  const stepProps = {
    data,
    onChange: patch,
    errors,
    refData: refData ?? {
      seasons: [], regions: [], departments: [], communes: [],
      odcavs: [], zones: [], teams: [], venues: [],
    },
    venueAvailability,
    venueAvailabilityLoading,
  };

  function renderStep() {
    switch (step) {
      case 0: return <StepGeneral {...stepProps} />;
      case 1: return <StepTeams {...stepProps} />;
      case 2: return <StepVenue {...stepProps} />;
      case 3: return <StepTickets {...stepProps} />;
      case 4: return <StepReview data={data} refData={stepProps.refData} submitting={submitting} venueAvailability={venueAvailability} venueAvailabilityLoading={venueAvailabilityLoading} />;
      default: return null;
    }
  }

  const isLastStep = step === STEPS.length - 1;

  return (
    <PageShell
      eyebrow="Administration"
      title="Créer un match"
      description="Remplissez le formulaire étape par étape. Votre progression est sauvegardée automatiquement."
    >
      <AdminGuard>
        <AdminNav />

        {dataError && <div className="error">{dataError}</div>}

        <div className="wiz-shell">
          <Stepper current={step} done={highestReached} />

          <div className="wiz-card">
            <div className="wiz-card__header">
              <h2 className="wiz-card__title">{STEPS[step]}</h2>
              <span className="wiz-card__counter">{step + 1} / {STEPS.length}</span>
            </div>
            <div className="wiz-card__body">
              {!refData && !dataError ? (
                <div className="wiz-loading">
                  <div className="dash-skel" style={{ height: 40, borderRadius: 10, marginBottom: 12 }} />
                  <div className="dash-skel" style={{ height: 40, borderRadius: 10, marginBottom: 12 }} />
                  <div className="dash-skel" style={{ height: 40, borderRadius: 10 }} />
                </div>
              ) : (
                renderStep()
              )}
            </div>
          </div>

          <div className="wiz-nav">
            <button
              type="button"
              className="button button--secondary"
              onClick={goPrev}
              disabled={step === 0}
            >
              ← Précédent
            </button>

            <button
              type="button"
              className="button button--ghost wiz-nav__discard"
              onClick={() => {
                if (confirm('Abandonner ce brouillon ?')) {
                  localStorage.removeItem(WIZARD_STORAGE_KEY);
                  router.push('/admin/matches');
                }
              }}
            >
              Annuler
            </button>

            {isLastStep ? (
              <button
                type="button"
                className="button button--primary"
                onClick={handleSubmit}
                disabled={submitting || venueAvailability?.available === false}
                title={venueAvailability?.available === false ? venueAvailability.message : undefined}
              >
                {submitting ? 'Création…' : 'Créer le match →'}
              </button>
            ) : (
              <button
                type="button"
                className="button button--primary"
                onClick={goNext}
              >
                Suivant →
              </button>
            )}
          </div>
        </div>
      </AdminGuard>
    </PageShell>
  );
}
