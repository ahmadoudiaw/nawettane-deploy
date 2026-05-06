'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AdminGuard } from '@/components/admin-guard';
import { AdminNav } from '@/components/admin-nav';
import { PageShell } from '@/components/page-shell';
import { SmartConfirmDialog } from '@/components/smart-confirm-dialog';
import { useToast } from '@/components/ToastProvider';
import { ApiError, formatApiError, deleteTeam, getTeams } from '@/lib/api';
import { formatEntityStatus } from '@/lib/format';
import { getSession } from '@/lib/auth';
import { DeletePreview, Team } from '@/lib/types';

function teamMatchesQuery(team: Team, q: string): boolean {
  return [
    team.name,
    team.category,
    team.status,
    team.organization?.name,
    team.organization?.commune?.name,
    team.organization?.commune?.department?.name,
    team.organization?.commune?.department?.region?.name,
    team.organization?.commune?.department?.organizations?.[0]?.name,
  ]
    .join(' ')
    .toLowerCase()
    .includes(q);
}

function buildDeletePreview(team: Team): DeletePreview {
  return {
    entityName: team.name,
    actionType: 'DELETE',
    allowDelete: true,
    allowDeactivate: false,
    dependencies: [],
    warningMessage: 'Cette action est définitive.',
  };
}

type DialogState = {
  preview: DeletePreview;
  team: Team;
};

export default function AdminTeamsPage() {
  const toast = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [dialog, setDialog] = useState<DialogState | null>(null);

  const sessionRole = getSession()?.user.role;
  const canDelete = sessionRole === 'SUPER_ADMIN' || sessionRole === 'ZONE_ADMIN';

  useEffect(() => {
    const s = getSession();
    if (!s) return;

    getTeams(s.token)
      .then(setTeams)
      .catch((err) => {
        if (err instanceof ApiError && err.globallyHandled) return;
        setError(formatApiError(err));
      });
  }, []);

  function handleDeleteClick(team: Team) {
    setDialog({ preview: buildDeletePreview(team), team });
  }

  const q = query.toLowerCase().trim();
  const filtered = q ? teams.filter((t) => teamMatchesQuery(t, q)) : teams;

  return (
    <PageShell
      eyebrow="Administration"
      title="Équipes"
      description="Catalogue des équipes disponibles pour la création des matchs dans votre périmètre."
    >
      <AdminGuard>
        <AdminNav />

        <section className="panel stack">
          <div className="toolbar">
            <div>
              <h3>Liste des équipes</h3>
              <p className="muted">Consultez les équipes déjà rattachées à chaque zone.</p>
            </div>
            <Link className="button button--primary" href="/admin/teams/new">
              Nouvelle équipe
            </Link>
          </div>

          <div className="field">
            <input
              type="search"
              placeholder="Rechercher une équipe..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {error ? <div className="error">{error}</div> : null}

          {teams.length === 0 ? (
            <div className="empty">Aucune équipe disponible dans votre périmètre.</div>
          ) : filtered.length === 0 ? (
            <div className="empty">Aucun résultat trouvé.</div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Région</th>
                    <th>ODCAV</th>
                    <th>Commune</th>
                    <th>Zone</th>
                    <th>Catégorie</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((team) => {
                    const dept = team.organization?.commune?.department;
                    return (
                      <tr key={team.id}>
                        <td><strong>{team.name}</strong></td>
                        <td>{dept?.region?.name ?? <span className="muted">—</span>}</td>
                        <td>{dept?.organizations?.[0]?.name ?? <span className="muted">—</span>}</td>
                        <td>{team.organization?.commune?.name ?? <span className="muted">—</span>}</td>
                        <td>{team.organization?.name ?? <span className="muted">—</span>}</td>
                        <td>{team.category ?? <span className="muted">—</span>}</td>
                        <td>{formatEntityStatus(team.status)}</td>
                        <td>
                          <div className="button-row">
                            <Link className="button button--secondary" href={`/admin/teams/${team.id}`}>
                              Modifier
                            </Link>
                            {canDelete && (
                              <button
                                className="button button--danger"
                                type="button"
                                onClick={() => handleDeleteClick(team)}
                              >
                                Supprimer
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <SmartConfirmDialog
          preview={dialog?.preview ?? null}
          requestedAction="delete"
          isOpen={dialog !== null}
          onClose={() => setDialog(null)}
          onConfirm={async () => {
            const s = getSession();
            if (!s || !dialog) throw new Error('Session expirée.');
            const teamId = dialog.team.id;
            const teamName = dialog.team.name;
            try {
              await deleteTeam(s.token, teamId);
              setTeams((current) => current.filter((t) => t.id !== teamId));
              toast.success(`Équipe "${teamName}" supprimée.`);
            } catch (err) {
              if (err instanceof ApiError && err.globallyHandled) return;
              toast.error('Erreur', formatApiError(err));
            }
          }}
        />
      </AdminGuard>
    </PageShell>
  );
}
