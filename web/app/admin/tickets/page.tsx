'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminGuard } from '@/components/admin-guard';
import { AdminNav } from '@/components/admin-nav';
import { PageShell } from '@/components/page-shell';
import { SmartConfirmDialog } from '@/components/smart-confirm-dialog';
import { useToast } from '@/components/ToastProvider';
import { ApiError, formatApiError, cancelAdminTicket, getAdminMatches, getAdminTickets, getDeletePreview } from '@/lib/api';
import { getSession } from '@/lib/auth';
import { usePermissions } from '@/hooks/use-permissions';
import { formatCurrency, formatDate, formatTicketStatus } from '@/lib/format';
import { AdminTicket, DeletePreview, Match, TicketFilters, TicketStatus } from '@/lib/types';

const LIMIT = 50;

const TICKET_STATUS_COLOR: Record<TicketStatus, { bg: string; color: string }> = {
  GENERATED: { bg: '#e8f5e9', color: '#2e7d32' },
  USED:      { bg: '#fdecea', color: '#c62828' },
  CANCELLED: { bg: '#f3f4f6', color: '#6b7280' },
};

function TicketBadge({ status }: { status: string }) {
  const style = TICKET_STATUS_COLOR[status as TicketStatus] ?? { bg: '#f5f5f5', color: '#555' };
  return (
    <span style={{
      background: style.bg,
      color: style.color,
      fontWeight: 700,
      fontSize: 12,
      padding: '3px 10px',
      borderRadius: 20,
      whiteSpace: 'nowrap' as const,
    }}>
      {formatTicketStatus(status)}
    </span>
  );
}

type CancelDialog = {
  preview: DeletePreview;
  ticket: AdminTicket;
};

export default function AdminTicketsPage() {
  const toast = useToast();
  const perms = usePermissions();
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [q, setQ] = useState('');
  const [matchId, setMatchId] = useState('');
  const [status, setStatus] = useState<TicketStatus | ''>('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Cancel dialog
  const [cancelDialog, setCancelDialog] = useState<CancelDialog | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);

  const filters: TicketFilters = { q, matchId, status, fromDate, toDate };

  const loadTickets = useCallback(
    async (pageNum: number, f: TicketFilters) => {
      const session = getSession();
      if (!session) return;
      setLoading(true);
      setError(null);
      try {
        const result = await getAdminTickets(session.token, { ...f, page: pageNum, limit: LIMIT });
        setTickets(result.data);
        setTotal(result.total);
        setPage(pageNum);
      } catch (err) {
        if (err instanceof ApiError && err.globallyHandled) return;
        setError(formatApiError(err));
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    const session = getSession();
    if (!session) return;
    getAdminMatches(session.token).then(setMatches).catch(() => {});
    loadTickets(1, {});
  }, [loadTickets]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    loadTickets(1, filters);
  }

  function handleReset() {
    setQ(''); setMatchId(''); setStatus(''); setFromDate(''); setToDate('');
    loadTickets(1, {});
  }

  async function openCancelDialog(ticket: AdminTicket) {
    const session = getSession();
    if (!session) return;
    setPreviewLoading(ticket.id);
    try {
      const preview = await getDeletePreview(session.token, 'ticket', ticket.id);
      setCancelDialog({ preview, ticket });
      setCancelReason('');
    } catch (err) {
      if (err instanceof ApiError && err.globallyHandled) return;
      setError(formatApiError(err));
    } finally {
      setPreviewLoading(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <PageShell
      eyebrow="Administration"
      title="Tickets"
      description="Recherchez et gérez les billets achetés. Annulez un ticket en cas d'achat par erreur."
    >
      <AdminGuard>
        <AdminNav />

        {/* Filter panel */}
        <section className="panel stack">
          <form onSubmit={handleSearch}>
            <div className="filters-grid">
              <div className="field">
                <label>Recherche</label>
                <input
                  type="search"
                  placeholder="Code ticket, nom ou téléphone…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
              <div className="field">
                <label>Match</label>
                <select value={matchId} onChange={(e) => setMatchId(e.target.value)}>
                  <option value="">Tous les matchs</option>
                  {matches.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.homeTeam.name} vs {m.awayTeam.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Statut</label>
                <select value={status} onChange={(e) => setStatus(e.target.value as TicketStatus | '')}>
                  <option value="">Tous les statuts</option>
                  <option value="GENERATED">Non utilisé</option>
                  <option value="USED">Déjà utilisé</option>
                  <option value="CANCELLED">Annulé</option>
                </select>
              </div>
              <div className="field">
                <label>Du</label>
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div className="field">
                <label>Au</label>
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
            </div>
            <div className="button-row" style={{ marginTop: 16 }}>
              <button className="button button--primary" type="submit">Rechercher</button>
              <button className="button button--ghost" type="button" onClick={handleReset}>Réinitialiser</button>
            </div>
          </form>
        </section>

        {/* Results */}
        <section className="panel stack">
          <div className="toolbar">
            <div>
              <h3>Résultats</h3>
              <p className="muted">
                {loading ? 'Chargement…' : `${total} billet${total !== 1 ? 's' : ''} trouvé${total !== 1 ? 's' : ''}`}
              </p>
            </div>
            {totalPages > 1 && (
              <div className="button-row">
                <button
                  className="button button--secondary"
                  disabled={page <= 1 || loading}
                  onClick={() => loadTickets(page - 1, filters)}
                >
                  ← Précédent
                </button>
                <span className="muted" style={{ padding: '0 8px', alignSelf: 'center' }}>
                  {page} / {totalPages}
                </span>
                <button
                  className="button button--secondary"
                  disabled={page >= totalPages || loading}
                  onClick={() => loadTickets(page + 1, filters)}
                >
                  Suivant →
                </button>
              </div>
            )}
          </div>

          {error ? <div className="error">{error}</div> : null}

          {!loading && tickets.length === 0 && !error ? (
            <div className="empty">Aucun billet correspondant aux critères.</div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Code ticket</th>
                    <th>Supporter</th>
                    <th>Match</th>
                    <th>Catégorie</th>
                    <th>Prix</th>
                    <th>Statut</th>
                    <th>Date achat</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket) => (
                    <tr key={ticket.id}>
                      <td>
                        <code style={{ fontWeight: 700, fontSize: 13 }}>{ticket.ticketCode}</code>
                      </td>
                      <td>
                        <div>{ticket.order.buyerName}</div>
                        <div className="muted">{ticket.order.buyerPhone}</div>
                      </td>
                      <td>
                        <div>
                          {ticket.match.homeTeam.name} vs {ticket.match.awayTeam.name}
                        </div>
                        <div className="muted">{formatDate(ticket.match.matchDate)}</div>
                      </td>
                      <td>{ticket.ticketCategory.name}</td>
                      <td>{formatCurrency(ticket.ticketCategory.price)}</td>
                      <td>
                        <TicketBadge status={ticket.status} />
                        {ticket.cancelReason && (
                          <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                            {ticket.cancelReason}
                          </div>
                        )}
                      </td>
                      <td>{formatDate(ticket.createdAt)}</td>
                      <td>
                        {ticket.status === 'GENERATED' && perms.canCancelTicket ? (
                          <button
                            className="button button--ghost"
                            type="button"
                            disabled={previewLoading === ticket.id}
                            onClick={() => openCancelDialog(ticket)}
                          >
                            {previewLoading === ticket.id ? '…' : 'Annuler'}
                          </button>
                        ) : (
                          <span className="muted" style={{ fontSize: 12 }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Smart cancel dialog */}
        <SmartConfirmDialog
          preview={cancelDialog?.preview ?? null}
          requestedAction="cancel"
          isOpen={cancelDialog !== null}
          onClose={() => { setCancelDialog(null); setCancelReason(''); }}
          confirmDisabled={cancelReason.trim().length < 5}
          onConfirm={async () => {
            const session = getSession();
            if (!session || !cancelDialog) throw new Error('Session expirée.');
            await cancelAdminTicket(session.token, cancelDialog.ticket.id, cancelReason.trim());
            setTickets((prev) =>
              prev.map((t) =>
                t.id === cancelDialog.ticket.id
                  ? { ...t, status: 'CANCELLED' as TicketStatus, cancelReason: cancelReason.trim() }
                  : t,
              ),
            );
            toast.success(`Billet ${cancelDialog.ticket.ticketCode} annulé avec succès.`);
          }}
        >
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>
            Motif d&apos;annulation <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <textarea
            rows={3}
            placeholder="Ex : Achat en double, erreur de match, remboursement demandé…"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 8,
              border: '1.5px solid var(--line, #ddd0b6)',
              fontSize: 14,
              fontFamily: 'inherit',
              resize: 'vertical',
              boxSizing: 'border-box',
              background: 'var(--panel, #fffaf1)',
            }}
          />
          {cancelReason.trim().length > 0 && cancelReason.trim().length < 5 && (
            <p style={{ color: 'var(--danger)', fontSize: 12, margin: '4px 0 0' }}>
              Minimum 5 caractères requis.
            </p>
          )}
        </SmartConfirmDialog>
      </AdminGuard>
    </PageShell>
  );
}
