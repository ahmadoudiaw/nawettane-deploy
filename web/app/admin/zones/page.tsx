'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { AdminGuard } from '@/components/admin-guard';
import { AdminNav } from '@/components/admin-nav';
import { PageShell } from '@/components/page-shell';
import { SmartConfirmDialog } from '@/components/smart-confirm-dialog';
import { ApiError, formatApiError, deleteZone, getDeletePreview, getZones, permanentDeleteZone } from '@/lib/api';
import { formatEntityStatus } from '@/lib/format';
import { getSession } from '@/lib/auth';
import { DeletePreview, Organization } from '@/lib/types';

function communeName(zone: Organization): string {
  return zone.commune?.name ?? '-';
}

function deptName(zone: Organization): string {
  return zone.commune?.department?.name ?? '-';
}

function regionName(zone: Organization): string {
  return zone.commune?.department?.region?.name ?? '-';
}

function zoneMatchesQuery(zone: Organization, q: string): boolean {
  return [
    zone.name,
    zone.parent?.name,
    communeName(zone),
    deptName(zone),
    regionName(zone),
    zone.status,
  ]
    .join(' ')
    .toLowerCase()
    .includes(q);
}

function buildDeletePreview(zone: Organization): DeletePreview {
  return {
    entityName: zone.name,
    actionType: 'DELETE',
    allowDelete: true,
    allowDeactivate: false,
    dependencies: [],
    warningMessage: 'Cette action est définitive.',
  };
}

type DeactivateDialogState = {
  preview: DeletePreview;
  zone: Organization;
};

type DeleteDialogState = {
  preview: DeletePreview;
  zone: Organization;
};

export default function AdminZonesPage() {
  const [zones, setZones] = useState<Organization[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);
  const [deactivateDialog, setDeactivateDialog] = useState<DeactivateDialogState | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sessionRole = getSession()?.user.role;
  const canDelete = sessionRole === 'SUPER_ADMIN' || sessionRole === 'ODCAV_ADMIN';

  function showToast(type: 'success' | 'error', message: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ type, message });
    toastTimer.current = setTimeout(() => setToast(null), 4500);
  }

  useEffect(() => {
    const session = getSession();
    if (!session) return;

    getZones(session.token)
      .then(setZones)
      .catch((err) => {
        if (err instanceof ApiError && err.globallyHandled) return;
        setError(formatApiError(err));
      });
  }, []);

  async function handleDeactivateClick(zone: Organization) {
    const session = getSession();
    if (!session) return;
    setPreviewLoading(zone.id);
    try {
      const preview = await getDeletePreview(session.token, 'zone', zone.id);
      setDeactivateDialog({ preview, zone });
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPreviewLoading(null);
    }
  }

  function handleDeleteClick(zone: Organization) {
    setDeleteDialog({ preview: buildDeletePreview(zone), zone });
  }

  const q = query.toLowerCase().trim();
  const filtered = q ? zones.filter((z) => zoneMatchesQuery(z, q)) : zones;

  return (
    <PageShell
      eyebrow="Administration"
      title="Zones"
      description="Gestion des zones sportives rattachées aux communes et ODCAV."
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

        <section className="panel stack">
          <div className="toolbar">
            <div>
              <h3>Liste des zones</h3>
              <p className="muted">Zones disponibles dans votre périmètre organisationnel.</p>
            </div>
            <Link className="button button--primary" href="/admin/zones/new">
              Nouvelle zone
            </Link>
          </div>

          <div className="field">
            <input
              type="search"
              placeholder="Rechercher une zone..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {error ? <div className="error">{error}</div> : null}

          {zones.length === 0 ? (
            <div className="empty">Aucune zone disponible dans votre périmètre.</div>
          ) : filtered.length === 0 ? (
            <div className="empty">Aucun résultat trouvé.</div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>ODCAV</th>
                    <th>Commune</th>
                    <th>Département</th>
                    <th>Région</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((zone) => (
                    <tr key={zone.id}>
                      <td><strong>{zone.name}</strong></td>
                      <td>{zone.parent?.name ?? <span className="muted">—</span>}</td>
                      <td>{communeName(zone)}</td>
                      <td>{deptName(zone)}</td>
                      <td>{regionName(zone)}</td>
                      <td>{formatEntityStatus(zone.status)}</td>
                      <td>
                        <div className="button-row">
                          <Link
                            className="button button--secondary"
                            href={`/admin/zones/${zone.id}`}
                          >
                            Modifier
                          </Link>
                          <button
                            className="button button--ghost"
                            type="button"
                            disabled={zone.status === 'INACTIVE' || previewLoading === zone.id}
                            onClick={() => handleDeactivateClick(zone)}
                          >
                            {previewLoading === zone.id ? '…' : 'Désactiver'}
                          </button>
                          {canDelete && (
                            <button
                              className="button button--danger"
                              type="button"
                              onClick={() => handleDeleteClick(zone)}
                            >
                              Supprimer
                            </button>
                          )}
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
          preview={deactivateDialog?.preview ?? null}
          requestedAction="deactivate"
          isOpen={deactivateDialog !== null}
          onClose={() => setDeactivateDialog(null)}
          onConfirm={async () => {
            const session = getSession();
            if (!session || !deactivateDialog) throw new Error('Session expirée.');
            await deleteZone(session.token, deactivateDialog.zone.id);
            setZones((current) =>
              current.map((item) =>
                item.id === deactivateDialog.zone.id ? { ...item, status: 'INACTIVE' } : item,
              ),
            );
            showToast('success', `Zone "${deactivateDialog.zone.name}" désactivée.`);
          }}
        />

        <SmartConfirmDialog
          preview={deleteDialog?.preview ?? null}
          requestedAction="delete"
          isOpen={deleteDialog !== null}
          onClose={() => setDeleteDialog(null)}
          onConfirm={async () => {
            const session = getSession();
            if (!session || !deleteDialog) throw new Error('Session expirée.');
            const zoneId = deleteDialog.zone.id;
            const zoneName = deleteDialog.zone.name;
            try {
              await permanentDeleteZone(session.token, zoneId);
              setZones((current) => current.filter((z) => z.id !== zoneId));
              showToast('success', `Zone "${zoneName}" supprimée.`);
            } catch (err) {
              if (err instanceof ApiError && err.globallyHandled) return;
              showToast('error', formatApiError(err));
            }
          }}
        />
      </AdminGuard>
    </PageShell>
  );
}
