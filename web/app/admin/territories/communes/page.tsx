'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AdminGuard } from '@/components/admin-guard';
import { AdminNav } from '@/components/admin-nav';
import { PageShell } from '@/components/page-shell';
import {
  ApiError,
  formatApiError,
  createCommune,
  deleteCommune,
  getCommunes,
  getDepartments,
  updateCommune,
} from '@/lib/api';
import { getSession } from '@/lib/auth';
import { useToast } from '@/components/ToastProvider';
import { Commune, Department } from '@/lib/types';

export default function CommunesPage() {
  const [communes, setCommunes] = useState<Commune[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({ name: '', code: '', departmentId: '' });
  const [editForm, setEditForm] = useState({ name: '', code: '', departmentId: '' });
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    load();
  }, []);

  async function load() {
    const session = getSession();
    if (!session) return;
    setError(null);
    try {
      const [comms, depts] = await Promise.all([
        getCommunes(session.token),
        getDepartments(session.token),
      ]);
      setCommunes(comms);
      setDepartments(depts);
      if (!createForm.departmentId && depts[0]) {
        setCreateForm((f) => ({ ...f, departmentId: depts[0].id }));
      }
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
      await createCommune(session.token, {
        name: createForm.name,
        code: createForm.code || undefined,
        departmentId: createForm.departmentId,
      });
      toast.success('Commune créée.');
      setShowCreate(false);
      setCreateForm((f) => ({ name: '', code: '', departmentId: f.departmentId }));
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
      await updateCommune(session.token, id, {
        name: editForm.name || undefined,
        code: editForm.code || undefined,
        departmentId: editForm.departmentId || undefined,
      });
      toast.success('Commune mise à jour.');
      setEditingId(null);
      await load();
    } catch (err) {
      if (err instanceof ApiError && err.globallyHandled) return;
      toast.error('Modification impossible', formatApiError(err));
    }
  }

  async function handleDelete(commune: Commune) {
    if (!window.confirm(`Supprimer la commune "${commune.name}" ?`)) return;
    const session = getSession();
    if (!session) return;
    try {
      await deleteCommune(session.token, commune.id);
      toast.success(`"${commune.name}" supprimée.`);
      await load();
    } catch (err) {
      if (err instanceof ApiError && err.globallyHandled) return;
      toast.error('Suppression impossible', formatApiError(err));
    }
  }

  function startEdit(commune: Commune) {
    setEditingId(commune.id);
    setEditForm({ name: commune.name, code: commune.code ?? '', departmentId: commune.departmentId });
  }

  const q = query.toLowerCase().trim();
  const filtered = q
    ? communes.filter((c) =>
        [c.name, c.code, c.department?.name, c.department?.region?.name].join(' ').toLowerCase().includes(q),
      )
    : communes;

  return (
    <PageShell
      eyebrow="Territoires"
      title="Communes"
      description="Subdivision d'un département. Chaque commune peut contenir des organisations."
    >
      <AdminGuard>
        <AdminNav />

        {error && <div className="error">{error}</div>}

        <section className="panel stack">
          <div className="toolbar">
            <div>
              <h3>Liste des communes</h3>
              <p className="muted">{communes.length} commune(s) enregistrée(s).</p>
            </div>
            <button
              className="button button--primary"
              type="button"
              onClick={() => { setShowCreate(!showCreate); setError(null); }}
            >
              {showCreate ? 'Annuler' : 'Nouvelle commune'}
            </button>
          </div>

          {showCreate && (
            <form className="stack" onSubmit={handleCreate}>
              <h4>Créer une commune</h4>
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
                <div className="field">
                  <label>Département *</label>
                  <select
                    required
                    value={createForm.departmentId}
                    onChange={(e) => setCreateForm((f) => ({ ...f, departmentId: e.target.value }))}
                  >
                    <option value="">— Choisir —</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}{d.region ? ` (${d.region.name})` : ''}
                      </option>
                    ))}
                  </select>
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
              placeholder="Rechercher une commune..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {communes.length === 0 ? (
            <div className="empty">Aucune commune enregistrée.</div>
          ) : filtered.length === 0 ? (
            <div className="empty">Aucun résultat trouvé.</div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Code</th>
                    <th>Département</th>
                    <th>Région</th>
                    <th>Organisations</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((commune) => (
                    <React.Fragment key={commune.id}>
                      <tr>
                        <td><strong>{commune.name}</strong></td>
                        <td>{commune.code ?? <span className="muted">—</span>}</td>
                        <td>{commune.department?.name ?? <span className="muted">—</span>}</td>
                        <td>{commune.department?.region?.name ?? <span className="muted">—</span>}</td>
                        <td>{commune._count?.organizations ?? 0}</td>
                        <td>
                          <div className="button-row">
                            <button
                              className="button button--secondary"
                              type="button"
                              onClick={() => editingId === commune.id ? setEditingId(null) : startEdit(commune)}
                            >
                              {editingId === commune.id ? 'Annuler' : 'Modifier'}
                            </button>
                            <button
                              className="button button--ghost"
                              type="button"
                              onClick={() => handleDelete(commune)}
                            >
                              Supprimer
                            </button>
                          </div>
                        </td>
                      </tr>
                      {editingId === commune.id && (
                        <tr>
                          <td colSpan={6}>
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
                                <div className="field">
                                  <label>Département</label>
                                  <select
                                    value={editForm.departmentId}
                                    onChange={(e) => setEditForm((f) => ({ ...f, departmentId: e.target.value }))}
                                  >
                                    {departments.map((d) => (
                                      <option key={d.id} value={d.id}>
                                        {d.name}{d.region ? ` (${d.region.name})` : ''}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                              <div className="button-row">
                                <button
                                  className="button button--primary"
                                  type="button"
                                  onClick={() => handleUpdate(commune.id)}
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
