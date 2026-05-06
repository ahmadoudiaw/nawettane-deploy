'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AdminGuard } from '@/components/admin-guard';
import { AdminNav } from '@/components/admin-nav';
import { PageShell } from '@/components/page-shell';
import { ApiError, formatApiError, getAuditLogs } from '@/lib/api';
import { getSession } from '@/lib/auth';
import { formatAuditAction, formatAuditMetadata } from '@/lib/format';
import { AuditLog, AuditLogFilters } from '@/lib/types';

const LIMIT = 50;

const ENTITY_TYPES = [
  'Match', 'User', 'Ticket', 'Region', 'Department',
  'Commune', 'Organization', 'Venue', 'Team',
];

const ACTION_GROUPS = [
  {
    label: 'Matchs',
    actions: [
      'MATCH_CREATED', 'MATCH_UPDATED', 'MATCH_PUBLISHED',
      'MATCH_DEACTIVATED', 'MATCH_DELETED', 'MATCH_CREATE_BLOCKED',
    ],
  },
  { label: 'Utilisateurs', actions: ['USER_CREATED', 'USER_UPDATED', 'USER_DEACTIVATED'] },
  { label: 'Billets', actions: ['TICKET_CANCELLED'] },
  {
    label: 'Imports',
    actions: [
      'REGIONS_IMPORTED', 'DEPARTMENTS_IMPORTED', 'COMMUNES_IMPORTED',
      'ODCAV_IMPORTED', 'ZONES_IMPORTED', 'VENUES_IMPORTED', 'TEAMS_IMPORTED',
    ],
  },
];

const ENTITY_COLORS: Record<string, { bg: string; color: string }> = {
  Match:        { bg: '#e0e7ff', color: '#3730a3' },
  User:         { bg: '#ccfbf1', color: '#0f766e' },
  Ticket:       { bg: '#fef3c7', color: '#92400e' },
  Organization: { bg: '#f3e8ff', color: '#6b21a8' },
  Region:       { bg: '#f1f5f9', color: '#475569' },
  Department:   { bg: '#f1f5f9', color: '#475569' },
  Commune:      { bg: '#f1f5f9', color: '#475569' },
  Venue:        { bg: '#fce7f3', color: '#9d174d' },
  Team:         { bg: '#ffe4e6', color: '#9f1239' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function daysAgoISO(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function IconSearch() {
  return (
    <svg className="audit-search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M11 11l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ActionBadge({ action }: { action: string }) {
  const s = formatAuditAction(action);
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: s.bg,
        color: s.color,
        fontWeight: 700,
        fontSize: 11,
        padding: '4px 10px',
        borderRadius: 20,
        whiteSpace: 'nowrap' as const,
        letterSpacing: '0.02em',
        border: `1px solid ${s.color}28`,
      }}
    >
      {s.label}
    </span>
  );
}

function EntityBadge({ entityType }: { entityType: string }) {
  const c = ENTITY_COLORS[entityType] ?? { bg: '#f3f4f6', color: '#374151' };
  return (
    <span
      style={{
        background: c.bg,
        color: c.color,
        fontSize: 11,
        fontWeight: 600,
        padding: '3px 9px',
        borderRadius: 12,
        whiteSpace: 'nowrap' as const,
      }}
    >
      {entityType}
    </span>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeQuick, setActiveQuick] = useState<string | null>(null);

  // Filters
  const [q, setQ] = useState('');
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentFilters: AuditLogFilters = { q, action, entityType, fromDate, toDate };

  const loadLogs = useCallback(async (pageNum: number, f: AuditLogFilters) => {
    const session = getSession();
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getAuditLogs(session.token, { ...f, page: pageNum, limit: LIMIT });
      setLogs(result.data);
      setTotal(result.total);
      setPage(pageNum);
    } catch (err) {
      if (err instanceof ApiError && err.globallyHandled) return;
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogs(1, {});
  }, [loadLogs]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setActiveQuick(null);
    loadLogs(1, currentFilters);
  }

  function handleReset() {
    setQ('');
    setAction('');
    setEntityType('');
    setFromDate('');
    setToDate('');
    setActiveQuick(null);
    loadLogs(1, {});
  }

  function handleQChange(value: string) {
    setQ(value);
    setActiveQuick(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      loadLogs(1, { ...currentFilters, q: value });
    }, 400);
  }

  function applyQuickFilter(key: string, patch: Partial<AuditLogFilters>) {
    if (activeQuick === key) {
      handleReset();
      return;
    }
    if (patch.fromDate !== undefined) setFromDate(patch.fromDate);
    if (patch.toDate !== undefined) setToDate(patch.toDate);
    if (patch.action !== undefined) setAction(patch.action);
    if (patch.entityType !== undefined) setEntityType(patch.entityType ?? '');
    setActiveQuick(key);
    loadLogs(1, {
      q,
      action:     patch.action     !== undefined ? patch.action     : action,
      entityType: patch.entityType !== undefined ? patch.entityType : entityType,
      fromDate:   patch.fromDate   !== undefined ? patch.fromDate   : fromDate,
      toDate:     patch.toDate     !== undefined ? patch.toDate     : toDate,
    });
  }

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const QUICK_FILTERS: Array<{ key: string; label: string; patch: Partial<AuditLogFilters> }> = [
    { key: 'today',   label: "Aujourd'hui",      patch: { fromDate: todayISO(), toDate: todayISO() } },
    { key: '7days',   label: '7 derniers jours',  patch: { fromDate: daysAgoISO(7), toDate: todayISO() } },
    { key: 'created', label: 'Créations',          patch: { action: 'MATCH_CREATED' } },
    { key: 'updated', label: 'Modifications',      patch: { action: 'MATCH_UPDATED' } },
    { key: 'deleted', label: 'Suppressions',       patch: { action: 'MATCH_DELETED' } },
  ];

  return (
    <PageShell
      eyebrow="Administration"
      title="Journal d'audit"
      description="Traçabilité complète des actions critiques — création, modification, suppression, annulation, imports."
    >
      <AdminGuard>
        <AdminNav />

        {/* ── Filters ──────────────────────────────────────────────────────── */}
        <section className="panel audit-filters">
          <form onSubmit={handleSearch}>

            {/* Row 1 — search + buttons */}
            <div className="audit-filters__top">
              <div className="field audit-filters__search-field">
                <label htmlFor="audit-q">Recherche</label>
                <div className="audit-search-wrap">
                  <IconSearch />
                  <input
                    id="audit-q"
                    type="search"
                    placeholder="Nom d'utilisateur, entité, action…"
                    value={q}
                    onChange={(e) => handleQChange(e.target.value)}
                  />
                </div>
              </div>
              <div className="button-row audit-filters__btn-group">
                <button className="button button--primary" type="submit">Filtrer</button>
                <button className="button button--secondary" type="button" onClick={handleReset}>
                  Réinitialiser
                </button>
              </div>
            </div>

            {/* Row 2 — quick filters */}
            <div className="audit-quick-filters">
              <span className="audit-quick-filters__label">Accès rapide :</span>
              {QUICK_FILTERS.map((qf) => (
                <button
                  key={qf.key}
                  type="button"
                  className={`audit-quick-btn${activeQuick === qf.key ? ' audit-quick-btn--active' : ''}`}
                  onClick={() => applyQuickFilter(qf.key, qf.patch)}
                >
                  {qf.label}
                </button>
              ))}
            </div>

            {/* Row 3 — detail filters */}
            <div className="filters-grid audit-filters__grid">
              <div className="field">
                <label htmlFor="audit-action">Action</label>
                <select
                  id="audit-action"
                  value={action}
                  onChange={(e) => { setAction(e.target.value); setActiveQuick(null); }}
                >
                  <option value="">Toutes les actions</option>
                  {ACTION_GROUPS.map((group) => (
                    <optgroup key={group.label} label={group.label}>
                      {group.actions.map((a) => (
                        <option key={a} value={a}>{formatAuditAction(a).label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="audit-entity">Entité</label>
                <select
                  id="audit-entity"
                  value={entityType}
                  onChange={(e) => { setEntityType(e.target.value); setActiveQuick(null); }}
                >
                  <option value="">Toutes</option>
                  {ENTITY_TYPES.map((et) => (
                    <option key={et} value={et}>{et}</option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="audit-from">Depuis</label>
                <input
                  id="audit-from"
                  type="date"
                  value={fromDate}
                  onChange={(e) => { setFromDate(e.target.value); setActiveQuick(null); }}
                />
              </div>

              <div className="field">
                <label htmlFor="audit-to">Jusqu&apos;au</label>
                <input
                  id="audit-to"
                  type="date"
                  value={toDate}
                  onChange={(e) => { setToDate(e.target.value); setActiveQuick(null); }}
                />
              </div>
            </div>

          </form>
        </section>

        {/* ── Results ──────────────────────────────────────────────────────── */}
        <section className="panel stack">

          <div className="toolbar">
            <div>
              <h3 style={{ margin: 0 }}>Historique</h3>
              <p className="muted" style={{ margin: '4px 0 0' }}>
                {loading
                  ? 'Chargement…'
                  : `${total.toLocaleString('fr-FR')} événement${total !== 1 ? 's' : ''}`}
              </p>
            </div>
            {totalPages > 1 && (
              <div className="button-row">
                <button
                  className="button button--secondary"
                  disabled={page <= 1 || loading}
                  onClick={() => loadLogs(page - 1, currentFilters)}
                >
                  ← Précédent
                </button>
                <span className="muted" style={{ padding: '0 8px', alignSelf: 'center' }}>
                  {page} / {totalPages}
                </span>
                <button
                  className="button button--secondary"
                  disabled={page >= totalPages || loading}
                  onClick={() => loadLogs(page + 1, currentFilters)}
                >
                  Suivant →
                </button>
              </div>
            )}
          </div>

          {error && <div className="error">{error}</div>}

          {!loading && logs.length === 0 && !error ? (
            <div className="empty">Aucun événement correspondant aux critères.</div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 128 }}>Date / Heure</th>
                    <th style={{ width: 160 }}>Utilisateur</th>
                    <th style={{ width: 155 }}>Action</th>
                    <th style={{ width: 110 }}>Entité</th>
                    <th>Résumé</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const d = new Date(log.createdAt);
                    const datePart = d.toLocaleDateString('fr-FR', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    });
                    const timePart = d.toLocaleTimeString('fr-FR', {
                      hour: '2-digit', minute: '2-digit',
                    });
                    const summary = formatAuditMetadata(log.action, log.metadata);
                    return (
                      <tr key={log.id}>
                        <td>
                          <div className="audit-date__day">{datePart}</div>
                          <div className="audit-date__time">{timePart}</div>
                        </td>
                        <td>
                          {log.user ? (
                            <>
                              <div className="audit-user__name">{log.user.fullName}</div>
                              <div className="audit-user__role">{log.user.role}</div>
                            </>
                          ) : (
                            <span className="muted" style={{ fontSize: 12 }}>Système</span>
                          )}
                        </td>
                        <td><ActionBadge action={log.action} /></td>
                        <td><EntityBadge entityType={log.entityType} /></td>
                        <td>
                          <div className="audit-detail__text">{summary}</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="button-row" style={{ justifyContent: 'center', paddingTop: 8 }}>
              <button
                className="button button--secondary"
                disabled={page <= 1 || loading}
                onClick={() => loadLogs(page - 1, currentFilters)}
              >
                ← Précédent
              </button>
              <span className="muted" style={{ padding: '0 12px', alignSelf: 'center' }}>
                Page {page} / {totalPages} — {total.toLocaleString('fr-FR')} événements
              </span>
              <button
                className="button button--secondary"
                disabled={page >= totalPages || loading}
                onClick={() => loadLogs(page + 1, currentFilters)}
              >
                Suivant →
              </button>
            </div>
          )}

        </section>
      </AdminGuard>
    </PageShell>
  );
}
