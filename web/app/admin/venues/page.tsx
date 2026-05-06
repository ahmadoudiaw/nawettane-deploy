'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AdminGuard } from '@/components/admin-guard';
import { AdminNav } from '@/components/admin-nav';
import { PageShell } from '@/components/page-shell';
import { SmartConfirmDialog } from '@/components/smart-confirm-dialog';
import { useToast } from '@/components/ToastProvider';
import { ApiError, formatApiError, deleteVenue, getDeletePreview, getVenues } from '@/lib/api';
import { formatEntityStatus } from '@/lib/format';
import { getSession } from '@/lib/auth';
import { DeletePreview, Venue } from '@/lib/types';

function communeName(venue: Venue): string {
  return venue.commune?.name ?? venue.organization?.commune?.name ?? '-';
}

function deptName(venue: Venue): string {
  return (
    venue.commune?.department?.name ??
    (venue.organization?.commune ? '-' : '-')
  );
}

function regionName(venue: Venue): string {
  return venue.commune?.department?.region?.name ?? '-';
}

function venueMatchesQuery(venue: Venue, q: string): boolean {
  return [
    venue.name,
    venue.address,
    venue.status,
    communeName(venue),
    deptName(venue),
    regionName(venue),
    venue.organization?.name,
  ]
    .join(' ')
    .toLowerCase()
    .includes(q);
}

type DialogState = {
  preview: DeletePreview;
  venue: Venue;
};

export default function AdminVenuesPage() {
  const toast = useToast();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState | null>(null);

  useEffect(() => {
    const session = getSession();
    if (!session) return;

    getVenues(session.token)
      .then(setVenues)
      .catch((err) => {
        if (err instanceof ApiError && err.globallyHandled) return;
        setError(formatApiError(err));
      });
  }, []);

  async function handleDeactivateClick(venue: Venue) {
    const session = getSession();
    if (!session) return;
    setPreviewLoading(venue.id);
    try {
      const preview = await getDeletePreview(session.token, 'venue', venue.id);
      setDialog({ preview, venue });
    } catch (err) {
      if (err instanceof ApiError && err.globallyHandled) return;
      setError(formatApiError(err));
    } finally {
      setPreviewLoading(null);
    }
  }

  const q = query.toLowerCase().trim();
  const filtered = q ? venues.filter((v) => venueMatchesQuery(v, q)) : venues;

  return (
    <PageShell
      eyebrow="Administration"
      title="Stades et terrains"
      description="Répertoire des lieux utilisés pour planifier les rencontres dans votre périmètre."
    >
      <AdminGuard>
        <AdminNav />

        <section className="panel stack">
          <div className="toolbar">
            <div>
              <h3>Liste des stades</h3>
              <p className="muted">Gardez les stades et terrains prêts pour la création des matchs.</p>
            </div>
            <Link className="button button--primary" href="/admin/venues/new">
              Nouveau stade
            </Link>
          </div>

          <div className="field">
            <input
              type="search"
              placeholder="Rechercher un stade..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {error ? <div className="error">{error}</div> : null}

          {venues.length === 0 ? (
            <div className="empty">Aucun stade disponible dans votre périmètre.</div>
          ) : filtered.length === 0 ? (
            <div className="empty">Aucun résultat trouvé.</div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Commune</th>
                    <th>Département</th>
                    <th>Région</th>
                    <th>Capacité</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((venue) => (
                    <tr key={venue.id}>
                      <td>
                        <strong>{venue.name}</strong>
                        {venue.address && <div className="muted">{venue.address}</div>}
                      </td>
                      <td>{communeName(venue)}</td>
                      <td>{deptName(venue)}</td>
                      <td>{regionName(venue)}</td>
                      <td>{venue.capacity ?? <span className="muted">—</span>}</td>
                      <td>{formatEntityStatus(venue.status)}</td>
                      <td>
                        <div className="button-row">
                          <Link
                            className="button button--secondary"
                            href={`/admin/venues/${venue.id}`}
                          >
                            Modifier
                          </Link>
                          <button
                            className="button button--ghost"
                            type="button"
                            disabled={venue.status === 'INACTIVE' || previewLoading === venue.id}
                            onClick={() => handleDeactivateClick(venue)}
                          >
                            {previewLoading === venue.id ? '…' : 'Désactiver'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <SmartConfirmDialog
          preview={dialog?.preview ?? null}
          requestedAction="deactivate"
          isOpen={dialog !== null}
          onClose={() => setDialog(null)}
          onConfirm={async () => {
            const session = getSession();
            if (!session || !dialog) throw new Error('Session expirée.');
            await deleteVenue(session.token, dialog.venue.id);
            setVenues((current) =>
              current.map((item) =>
                item.id === dialog.venue.id ? { ...item, status: 'INACTIVE' } : item,
              ),
            );
            toast.success(`Stade "${dialog.venue.name}" désactivé.`);
          }}
        />
      </AdminGuard>
    </PageShell>
  );
}
