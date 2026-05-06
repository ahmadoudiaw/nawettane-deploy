'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { AdminGuard } from '@/components/admin-guard';
import { AdminNav } from '@/components/admin-nav';
import { MatchCard } from '@/components/match-card';
import { PageShell } from '@/components/page-shell';
import { SmartConfirmDialog, RequestedAction } from '@/components/smart-confirm-dialog';
import { ApiError, formatApiError, deactivateMatch, deleteMatch, getAdminMatches, getDeletePreview, publishMatch, updateMatch } from '@/lib/api';
import { getSession } from '@/lib/auth';
import { usePermissions } from '@/hooks/use-permissions';
import { DeletePreview, Match } from '@/lib/types';

function matchMatchesQuery(match: Match, q: string): boolean {
  return [
    match.homeTeam?.name,
    match.awayTeam?.name,
    match.venue?.name,
    match.organization?.name,
    match.matchDate,
    match.status,
    match.competitionName,
    match.stage,
  ]
    .join(' ')
    .toLowerCase()
    .includes(q);
}

type DialogState = {
  preview: DeletePreview;
  requestedAction: RequestedAction;
  match: Match;
};

export default function AdminMatchesPage() {
  const perms = usePermissions();
  const [matches, setMatches] = useState<Match[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(type: 'success' | 'error', message: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ type, message });
    toastTimer.current = setTimeout(() => setToast(null), 4500);
  }

  useEffect(() => {
    const session = getSession();
    if (!session) return;

    getAdminMatches(session.token)
      .then(setMatches)
      .catch((err) => {
        if (err instanceof ApiError && err.globallyHandled) return;
        setError(formatApiError(err));
      });
  }, []);

  async function refreshMatches(token: string) {
    const response = await getAdminMatches(token);
    setMatches(response);
  }

  async function handlePublish(match: Match) {
    const session = getSession();
    if (!session) return;
    setError(null);
    try {
      if (match.status === 'PUBLISHED') {
        await updateMatch(session.token, match.id, { status: 'DRAFT' });
      } else {
        await publishMatch(session.token, match.id);
      }
      await refreshMatches(session.token);
    } catch (err) {
      if (err instanceof ApiError && err.globallyHandled) return;
      setError(formatApiError(err));
    }
  }

  async function openPreview(match: Match, requestedAction: RequestedAction) {
    const session = getSession();
    if (!session) return;
    setPreviewLoading(`${match.id}:${requestedAction}`);
    try {
      const preview = await getDeletePreview(session.token, 'match', match.id);
      setDialog({ preview, requestedAction, match });
    } catch (err) {
      if (err instanceof ApiError && err.globallyHandled) return;
      const msg = formatApiError(err);
      setError(msg);
      showToast('error', msg);
    } finally {
      setPreviewLoading(null);
    }
  }

  const q = query.toLowerCase().trim();
  const filtered = q ? matches.filter((m) => matchMatchesQuery(m, q)) : matches;

  return (
    <PageShell
      eyebrow="Administration"
      title="Catalogue des matchs"
      description="Liste opérationnelle des rencontres disponibles dans votre périmètre."
    >
      <AdminGuard>
        <AdminNav />

        {toast && (
          <div style={{
            position: 'fixed', top: 20, right: 20, zIndex: 1100,
            padding: '12px 20px', borderRadius: 10, fontWeight: 600, fontSize: 14,
            background: toast.type === 'success' ? '#2e7d32' : '#b71c1c',
            color: '#fff', boxShadow: '0 4px 16px rgba(0,0,0,0.18)', maxWidth: 360,
          }}>
            {toast.message}
          </div>
        )}

        <section className="panel">
          <div className="field">
            <input
              type="search"
              placeholder="Rechercher un match (équipe, stade, zone, statut...)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </section>

        {error ? <div className="error">{error}</div> : null}

        {matches.length > 0 && filtered.length === 0 ? (
          <div className="panel">
            <div className="empty">Aucun résultat trouvé.</div>
          </div>
        ) : (
          <div className="grid grid--cards">
            {filtered.map((match) => {
              const loadingDeactivate = previewLoading === `${match.id}:deactivate`;
              const loadingDelete = previewLoading === `${match.id}:delete`;
              return (
                <div key={match.id} className="stack">
                  <MatchCard match={match} admin />
                  {(perms.canEditMatch || perms.canPublishMatch || perms.canDeleteMatch) && (
                    <div className="panel button-row">
                      {perms.canEditMatch && (
                        <Link className="button button--secondary" href={`/admin/matches/${match.id}`}>
                          Voir / Modifier
                        </Link>
                      )}
                      {perms.canPublishMatch && (
                        <button
                          className="button button--primary"
                          type="button"
                          onClick={() => handlePublish(match)}
                        >
                          {match.status === 'PUBLISHED' ? 'Dépublier' : 'Publier'}
                        </button>
                      )}
                      {perms.canEditMatch && (
                        <button
                          className="button button--ghost"
                          type="button"
                          disabled={match.status === 'CANCELLED' || loadingDeactivate}
                          onClick={() => openPreview(match, 'deactivate')}
                        >
                          {loadingDeactivate ? '…' : 'Désactiver'}
                        </button>
                      )}
                      {perms.canDeleteMatch && (
                        <button
                          className="button button--ghost"
                          type="button"
                          style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                          disabled={loadingDelete}
                          onClick={() => openPreview(match, 'delete')}
                        >
                          {loadingDelete ? '…' : 'Supprimer'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <SmartConfirmDialog
          preview={dialog?.preview ?? null}
          requestedAction={dialog?.requestedAction ?? 'delete'}
          isOpen={dialog !== null}
          onClose={() => setDialog(null)}
          onConfirm={async () => {
            const session = getSession();
            if (!session || !dialog) throw new Error('Session expirée.');
            if (dialog.requestedAction === 'delete') {
              await deleteMatch(session.token, dialog.match.id);
              setMatches((prev) => prev.filter((m) => m.id !== dialog.match.id));
              showToast('success', 'Match supprimé définitivement.');
            } else {
              const updated = await deactivateMatch(session.token, dialog.match.id);
              setMatches((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
              showToast('success', `Match ${dialog.match.homeTeam?.name} vs ${dialog.match.awayTeam?.name} désactivé.`);
            }
          }}
          onDeactivate={async () => {
            const session = getSession();
            if (!session || !dialog) throw new Error('Session expirée.');
            const updated = await deactivateMatch(session.token, dialog.match.id);
            setMatches((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
            showToast('success', `Match ${dialog.match.homeTeam?.name} vs ${dialog.match.awayTeam?.name} désactivé.`);
          }}
        />
      </AdminGuard>
    </PageShell>
  );
}
