'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AdminGuard } from '@/components/admin-guard';
import { AdminNav } from '@/components/admin-nav';
import { PageShell } from '@/components/page-shell';
import {
  ApiError,
  formatApiError,
  createDepartment,
  deleteDepartment,
  getDepartments,
  getRegions,
  updateDepartment,
} from '@/lib/api';
import { getSession } from '@/lib/auth';
import { useToast } from '@/components/ToastProvider';
import { Department, Region } from '@/lib/types';

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({ name: '', code: '', regionId: '' });
  const [editForm, setEditForm] = useState({ name: '', code: '', regionId: '' });
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
      const [depts, regs] = await Promise.all([
        getDepartments(session.token),
        getRegions(session.token),
      ]);
      setDepartments(depts);
      setRegions(regs);
      if (!createForm.regionId && regs[0]) {
        setCreateForm((f) => ({ ...f, regionId: regs[0].id }));
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
      await createDepartment(session.token, {
        name: createForm.name,
        code: createForm.code || undefined,
        regionId: createForm.regionId,
      });
      toast.success('Département créé.');
      setShowCreate(false);
      setCreateForm((f) => ({ name: '', code: '', regionId: f.regionId }));
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
      await updateDepartment(session.token, id, {
        name: editForm.name || undefined,
        code: editForm.code || undefined,
        regionId: editForm.regionId || undefined,
      });
      toast.success('Département mis à jour.');
      setEditingId(null);
      await load();
    } catch (err) {
      if (err instanceof ApiError && err.globallyHandled) return;
      toast.error('Modification impossible', formatApiError(err));
    }
  }

  async function handleDelete(dept: Department) {
    if (!window.confirm(`Supprimer le département "${dept.name}" ?`)) return;
    const session = getSession();
    if (!session) return;
    try {
      await deleteDepartment(session.token, dept.id);
      toast.success(`"${dept.name}" supprimé.`);
      await load();
    } catch (err) {
      if (err instanceof ApiError && err.globallyHandled) return;
      toast.error('Suppression impossible', formatApiError(err));
    }
  }

  function startEdit(dept: Department) {
    setEditingId(dept.id);
    setEditForm({ name: dept.name, code: dept.code ?? '', regionId: dept.regionId });
  }

  const q = query.toLowerCase().trim();
  const filtered = q
    ? departments.filter((d) =>
        [d.name, d.code, d.region?.name].join(' ').toLowerCase().includes(q),
      )
    : departments;

  return (
    <PageShell
      eyebrow="Territoires"
      title="Départements"
      description="Subdivision d'une région. Chaque département contient des communes."
    >
      <AdminGuard>
        <AdminNav />

        {error && <div className="error">{error}</div>}

        <section className="panel stack">
          <div className="toolbar">
            <div>
              <h3>Liste des départements</h3>
              <p className="muted">{departments.length} département(s) enregistré(s).</p>
            </div>
            <button
              className="button button--primary"
              type="button"
              onClick={() => { setShowCreate(!showCreate); setError(null); }}
            >
              {showCreate ? 'Annuler' : 'Nouveau département'}
            </button>
          </div>

          {showCreate && (
            <form className="stack" onSubmit={handleCreate}>
              <h4>Créer un département</h4>
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
                  <label>Région *</label>
                  <select
                    required
                    value={createForm.regionId}
                    onChange={(e) => setCreateForm((f) => ({ ...f, regionId: e.target.value }))}
                  >
                    <option value="">— Choisir —</option>
                    {regions.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
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
              placeholder="Rechercher un département..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {departments.length === 0 ? (
            <div className="empty">Aucun département enregistré.</div>
          ) : filtered.length === 0 ? (
            <div className="empty">Aucun résultat trouvé.</div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Code</th>
                    <th>Région</th>
                    <th>Communes</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((dept) => (
                    <React.Fragment key={dept.id}>
                      <tr>
                        <td><strong>{dept.name}</strong></td>
                        <td>{dept.code ?? <span className="muted">—</span>}</td>
                        <td>{dept.region?.name ?? <span className="muted">—</span>}</td>
                        <td>{dept._count?.communes ?? 0}</td>
                        <td>
                          <div className="button-row">
                            <button
                              className="button button--secondary"
                              type="button"
                              onClick={() => editingId === dept.id ? setEditingId(null) : startEdit(dept)}
                            >
                              {editingId === dept.id ? 'Annuler' : 'Modifier'}
                            </button>
                            <button
                              className="button button--ghost"
                              type="button"
                              onClick={() => handleDelete(dept)}
                            >
                              Supprimer
                            </button>
                          </div>
                        </td>
                      </tr>
                      {editingId === dept.id && (
                        <tr>
                          <td colSpan={5}>
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
                                  <label>Région</label>
                                  <select
                                    value={editForm.regionId}
                                    onChange={(e) => setEditForm((f) => ({ ...f, regionId: e.target.value }))}
                                  >
                                    {regions.map((r) => (
                                      <option key={r.id} value={r.id}>{r.name}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                              <div className="button-row">
                                <button
                                  className="button button--primary"
                                  type="button"
                                  onClick={() => handleUpdate(dept.id)}
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
