'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AdminGuard } from '@/components/admin-guard';
import { AdminNav } from '@/components/admin-nav';
import { PageShell } from '@/components/page-shell';
import { ApiError, formatApiError, activateSeason, deleteSeason, getSeasons } from '@/lib/api';
import { getSession } from '@/lib/auth';
import { Season } from '@/lib/types';

export default function AdminSeasonsPage() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      return;
    }

    getSeasons(session.token)
      .then(setSeasons)
      .catch((err) => {
        if (err instanceof ApiError && err.globallyHandled) return;
        setError(formatApiError(err));
      });
  }, []);

  async function handleActivate(season: Season) {
    const session = getSession();
    if (!session || !window.confirm(`Activer la saison "${season.name}" et désactiver les autres ?`)) {
      return;
    }

    try {
      const updated = await activateSeason(session.token, season.id);
      setSeasons((current) =>
        current.map((item) =>
          item.id === updated.id ? updated : { ...item, active: false },
        ),
      );
    } catch (err) {
      if (err instanceof ApiError && err.globallyHandled) return;
      setError(formatApiError(err));
    }
  }

  async function handleDelete(season: Season) {
    const session = getSession();
    if (!session || !window.confirm(`Supprimer la saison "${season.name}" ?`)) {
      return;
    }

    try {
      await deleteSeason(session.token, season.id);
      setSeasons((current) => current.filter((item) => item.id !== season.id));
    } catch (err) {
      if (err instanceof ApiError && err.globallyHandled) return;
      setError(formatApiError(err));
    }
  }

  return (
    <PageShell
      eyebrow="Administration"
      title="Saisons"
      description="Gestion des saisons Nawettane. Une seule saison peut être active à la fois."
    >
      <AdminGuard>
        <AdminNav />
        <section className="panel stack">
          <div className="toolbar">
            <div>
              <h3>Liste des saisons</h3>
              <p className="muted">La saison active détermine le contexte par défaut de création des matchs.</p>
            </div>
            <Link className="button button--primary" href="/admin/seasons/new">
              Nouvelle saison
            </Link>
          </div>

          {error ? <div className="error">{error}</div> : null}

          {seasons.length === 0 ? (
            <div className="empty">Aucune saison disponible.</div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Année</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {seasons.map((season) => (
                    <tr key={season.id}>
                      <td>{season.name}</td>
                      <td>{season.year}</td>
                      <td>{season.active ? 'En cours' : 'Terminée'}</td>
                      <td>
                        <div className="button-row">
                          <Link
                            className="button button--secondary"
                            href={`/admin/seasons/${season.id}`}
                          >
                            Modifier
                          </Link>
                          {!season.active ? (
                            <button
                              className="button button--secondary"
                              type="button"
                              onClick={() => handleActivate(season)}
                            >
                              Activer
                            </button>
                          ) : null}
                          <button
                            className="button button--ghost"
                            type="button"
                            onClick={() => handleDelete(season)}
                          >
                            Supprimer
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
      </AdminGuard>
    </PageShell>
  );
}
