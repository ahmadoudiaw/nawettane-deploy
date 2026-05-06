'use client';

import { useEffect, useState } from 'react';
import { AdminGuard } from '@/components/admin-guard';
import { AdminNav } from '@/components/admin-nav';
import { PageShell } from '@/components/page-shell';
import { ApiError, formatApiError, downloadReportExport, getAdminMatches, getFilteredDashboard } from '@/lib/api';
import { getSession } from '@/lib/auth';
import { DashboardMetrics, Match } from '@/lib/types';
import { formatCurrency } from '@/lib/format';

export default function AdminReportsPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    reportType: 'zone',
    seasonId: '',
    zoneId: '',
    matchId: '',
    pool: '',
    fromDate: '',
    toDate: '',
    week: '',
  });

  async function handleDownload(
    exportType: 'matches' | 'sales-by-match' | 'tickets' | 'payments' | 'revenue' | 'dashboard',
  ) {
    const session = getSession();
    if (!session) {
      setError('Session admin introuvable.');
      return;
    }

    setDownloading(exportType);
    setError(null);

    try {
      const payload = await downloadReportExport(session.token, exportType, filters);
      const url = window.URL.createObjectURL(payload.blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = payload.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      if (err instanceof ApiError && err.globallyHandled) return;
      setError(formatApiError(err));
    } finally {
      setDownloading(null);
    }
  }

  useEffect(() => {
    const session = getSession();
    if (!session) {
      return;
    }

    getAdminMatches(session.token)
      .then(setMatches)
      .catch((err) => {
        if (err instanceof ApiError && err.globallyHandled) return;
        setError(formatApiError(err));
      });
  }, []);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      return;
    }

    getFilteredDashboard(session.token, filters)
      .then(setMetrics)
      .catch((err) => {
        if (err instanceof ApiError && err.globallyHandled) return;
        setError(formatApiError(err));
      });
  }, [filters]);

  const seasons = [...new Map(matches.map((match) => [match.season.id, match.season])).values()];
  const zones = [...new Map(matches.map((match) => [match.organization.id, match.organization])).values()];

  return (
    <PageShell
      eyebrow="Rapports"
      title="Rapports structurés"
      description="Analysez les indicateurs par match, journée, poule, zone ou semaine avec des filtres de périmètre."
    >
      <AdminGuard>
        <AdminNav />
        {error ? <div className="error">{error}</div> : null}

        <section className="panel stack">
          <div className="toolbar">
            <h2 style={{ margin: 0 }}>Téléchargements Excel</h2>
          </div>
          <p style={{ margin: 0, color: 'var(--muted-foreground, #5b6472)' }}>
            Choisissez un rapport puis cliquez sur <strong>Télécharger</strong>.
          </p>
          <div className="button-row">
            <button
              className="button button--accent"
              type="button"
              onClick={() => handleDownload('matches')}
              disabled={downloading !== null}
            >
              {downloading === 'matches' ? 'Téléchargement...' : 'Télécharger les matchs'}
            </button>
            <button
              className="button button--secondary"
              type="button"
              onClick={() => handleDownload('sales-by-match')}
              disabled={downloading !== null}
            >
              {downloading === 'sales-by-match'
                ? 'Téléchargement...'
                : 'Télécharger les ventes par match'}
            </button>
            <button
              className="button button--secondary"
              type="button"
              onClick={() => handleDownload('tickets')}
              disabled={downloading !== null}
            >
              {downloading === 'tickets' ? 'Téléchargement...' : 'Télécharger les tickets vendus'}
            </button>
            <button
              className="button button--secondary"
              type="button"
              onClick={() => handleDownload('payments')}
              disabled={downloading !== null}
            >
              {downloading === 'payments' ? 'Téléchargement...' : 'Télécharger les paiements'}
            </button>
            <button
              className="button button--secondary"
              type="button"
              onClick={() => handleDownload('revenue')}
              disabled={downloading !== null}
            >
              {downloading === 'revenue' ? 'Téléchargement...' : 'Télécharger les recettes'}
            </button>
            <button
              className="button button--secondary"
              type="button"
              onClick={() => handleDownload('dashboard')}
              disabled={downloading !== null}
            >
              {downloading === 'dashboard' ? 'Téléchargement...' : 'Télécharger le dashboard global'}
            </button>
          </div>
        </section>

        <section className="panel stack">
          <div className="filters-grid">
            <div className="field">
              <label>Type de rapport</label>
              <select value={filters.reportType} onChange={(event) => setFilters({ ...filters, reportType: event.target.value })}>
                <option value="match">Par match</option>
                <option value="journee">Par journée</option>
                <option value="poule">Par poule</option>
                <option value="zone">Par zone</option>
                <option value="semaine">Par semaine</option>
              </select>
            </div>
            <div className="field">
              <label>Saison</label>
              <select value={filters.seasonId} onChange={(event) => setFilters({ ...filters, seasonId: event.target.value })}>
                <option value="">Toutes</option>
                {seasons.map((season) => (
                  <option key={season.id} value={season.id}>{season.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Zone</label>
              <select value={filters.zoneId} onChange={(event) => setFilters({ ...filters, zoneId: event.target.value })}>
                <option value="">Toutes</option>
                {zones.map((zone) => (
                  <option key={zone.id} value={zone.id}>{zone.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Match</label>
              <select value={filters.matchId} onChange={(event) => setFilters({ ...filters, matchId: event.target.value })}>
                <option value="">Tous</option>
                {matches.map((match) => (
                  <option key={match.id} value={match.id}>
                    {match.homeTeam.name} vs {match.awayTeam.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Poule</label>
              <input value={filters.pool} onChange={(event) => setFilters({ ...filters, pool: event.target.value })} />
            </div>
            <div className="field">
              <label>Du</label>
              <input type="date" value={filters.fromDate} onChange={(event) => setFilters({ ...filters, fromDate: event.target.value })} />
            </div>
            <div className="field">
              <label>Au</label>
              <input type="date" value={filters.toDate} onChange={(event) => setFilters({ ...filters, toDate: event.target.value })} />
            </div>
            <div className="field">
              <label>Semaine</label>
              <input type="week" value={filters.week} onChange={(event) => setFilters({ ...filters, week: event.target.value })} />
            </div>
          </div>
        </section>

        <div className="grid grid--cards">
          <div className="card stat">
            <span className="stat__label">Revenus</span>
            <span className="stat__value">{metrics ? formatCurrency(metrics.revenue) : '...'}</span>
          </div>
          <div className="card stat">
            <span className="stat__label">Matchs</span>
            <span className="stat__value">{metrics?.matchesCount ?? '...'}</span>
          </div>
          <div className="card stat">
            <span className="stat__label">Tickets vendus</span>
            <span className="stat__value">{metrics?.ticketsSold ?? '...'}</span>
          </div>
          <div className="card stat">
            <span className="stat__label">Tickets scannés</span>
            <span className="stat__value">{metrics?.ticketsScanned ?? '...'}</span>
          </div>
        </div>

        <section className="panel stack">
          <div className="toolbar">
            <h2 style={{ margin: 0 }}>Lignes du rapport</h2>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Groupe</th>
                  <th>Matchs</th>
                  <th>Tickets vendus</th>
                  <th>Revenus</th>
                  <th>Scannés</th>
                  <th>Non utilisés</th>
                </tr>
              </thead>
              <tbody>
                {(metrics?.rows ?? []).map((row) => (
                  <tr key={row.key}>
                    <td>{row.label}</td>
                    <td>{row.matchesCount}</td>
                    <td>{row.ticketsSold}</td>
                    <td>{formatCurrency(row.revenue)}</td>
                    <td>{row.ticketsScanned}</td>
                    <td>{row.ticketsUnused}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </AdminGuard>
    </PageShell>
  );
}
