'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AdminGuard } from '@/components/admin-guard';
import { AdminNav } from '@/components/admin-nav';
import { PageShell } from '@/components/page-shell';
import { ApiError, formatApiError, createRegion, deleteRegion, getRegions, updateRegion } from '@/lib/api';
import { getSession } from '@/lib/auth';
import { useToast } from '@/components/ToastProvider';
import { Region } from '@/lib/types';

export default function RegionsPage() {
  const [regions, setRegions] = useState<Region[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({ name: '', code: '' });
  const [editForm, setEditForm] = useState({ name: '', code: '' });
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    load();
  }, []);

  async function load() {
    const session = getSession();
    if (!session) return;
    try {
      setRegions(await getRegions(session.token));
    } catch (err) {
      if (err instanceof ApiError && err.globallyHandled) return;
      setError(formatApiError(err));
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const session = getSession();
    if (!session) return;
    try {
      await createRegion(session.token, {
        name: createForm.name,
        code: createForm.code || undefined,
      });
      toast.success('Région créée.');
      setShowCreate(false);
      setCreateForm({ name: '', code: '' });
      await load();
    } catch (err) {
      if (err instanceof ApiError && err.globallyHandled) return;
      toast.error('Création impossible', formatApiError(err));
    }
  }

  async function handleUpdate(id: string) {
    const session = getSession();
    if (!session) return;
    try {
      await updateRegion(session.token, id, {
        name: editForm.name || undefined,
        code: editForm.code || undefined,
      });
      toast.success('Région mise à jour.');
      setEditingId(null);
      await load();
    } catch (err) {
      if (err instanceof ApiError && err.globallyHandled) return;
      toast.error('Modification impossible', formatApiError(err));
    }
  }

  async function handleDelete(region: Region) {
    if (!window.confirm(`Supprimer la région "${region.name}" ?`)) return;
    const session = getSession();
    if (!session) return;
    try {
      await deleteRegion(session.token, region.id);
      toast.success(`"${region.name}" supprimée.`);
      await load();
    } catch (err) {
      if (err instanceof ApiError && err.globallyHandled) return;
      toast.error('Suppression impossible', formatApiError(err));
    }
  }

  function startEdit(region: Region) {
    setEditingId(region.id);
    setEditForm({ name: region.name, code: region.code ?? '' });
  }

  const q = query.toLowerCase().trim();
  const filtered = q
    ? regions.filter((r) => [r.name, r.code].join(' ').toLowerCase().includes(q))
    : regions;

  return (
    <PageShell
      eyebrow="Territoires"
      title="Régions"
      description="Niveau territorial le plus élevé. Chaque région contient des départements."
    >
      <AdminGuard>
        <AdminNav />

        {error && <div className="error">{error}</div>}

        <section className="panel stack">
          <div className="toolbar">
            <div>
              <h3>Liste des régions</h3>
              <p className="muted">{regions.length} région(s) enregistrée(s).</p>
            </div>
            <button
              className="button button--primary"
              type="button"
              onClick={() => { setShowCreate(!showCreate); setError(null); }}
            >
              {showCreate ? 'Annuler' : 'Nouvelle région'}
            </button>
          </div>

          {showCreate && (
            <form className="stack" onSubmit={handleCreate}>
              <h4>Créer une région</h4>
              <div className="button-row">
                <div className="field">
                  <label>Nom *</label>
                  <input
                    required
                    value={createForm.name}
                    onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="field">
                  <label>Code (optionnel)</label>
                  <input
                    value={createForm.code}
                    onChange={(e) => setCreateForm((f) => ({ ...f, code: e.target.value }))}
                  />
                </div>
              </div>
              <div className="button-row">
                <button className="button button--primary" type="submit">Créer</button>
                <button className="button button--ghost" type="button" onClick={() => setShowCreate(false)}>Annuler</button>
              </div>
            </form>
          )}

          <div className="field">
            <input
              type="search"
              placeholder="Rechercher une région..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {regions.length === 0 ? (
            <div className="empty">Aucune région enregistrée.</div>
          ) : filtered.length === 0 ? (
            <div className="empty">Aucun résultat trouvé.</div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Code</th>
                    <th>Départements</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((region) => (
                    <React.Fragment key={region.id}>
                      <tr>
                        <td><strong>{region.name}</strong></td>
                        <td>{region.code ?? <span className="muted">—</span>}</td>
                        <td>{region._count?.departments ?? 0}</td>
                        <td>
                          <div className="button-row">
                            <button
                              className="button button--secondary"
                              type="button"
                              onClick={() => editingId === region.id ? setEditingId(null) : startEdit(region)}
                            >
                              {editingId === region.id ? 'Annuler' : 'Modifier'}
                            </button>
                            <button
                              className="button button--ghost"
                              type="button"
                              onClick={() => handleDelete(region)}
                            >
                              Supprimer
                            </button>
                          </div>
                        </td>
                      </tr>
                      {editingId === region.id && (
                        <tr>
                          <td colSpan={4}>
                            <div className="stack" style={{ padding: '12px 0' }}>
                              <div className="button-row">
                                <div className="field">
                                  <label>Nom</label>
                                  <input
                                    value={editForm.name}
                                    onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                                  />
                                </div>
                                <div className="field">
                                  <label>Code</label>
                                  <input
                                    value={editForm.code}
                                    onChange={(e) => setEditForm((f) => ({ ...f, code: e.target.value }))}
                                  />
                                </div>
                              </div>
                              <div className="button-row">
                                <button
                                  className="button button--primary"
                                  type="button"
                                  onClick={() => handleUpdate(region.id)}
                                >
                                  Enregistrer
                                </button>
                                <button
                                  className="button button--ghost"
                                  type="button"
                                  onClick={() => setEditingId(null)}
                                >
                                  Annuler
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
