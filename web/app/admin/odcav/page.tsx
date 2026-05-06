'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AdminGuard } from '@/components/admin-guard';
import { AdminNav } from '@/components/admin-nav';
import { PageShell } from '@/components/page-shell';
import {
  ApiError,
  formatApiError,
  createOdcav,
  deleteOdcav,
  getDepartments,
  getOdcavs,
  updateOdcav,
} from '@/lib/api';
import { getSession } from '@/lib/auth';
import { useToast } from '@/components/ToastProvider';
import { formatEntityStatus } from '@/lib/format';
import { Department, Organization } from '@/lib/types';

export default function OdcavPage() {
  const [odcavs, setOdcavs] = useState<Organization[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({ name: '', departmentId: '', status: 'ACTIVE' });
  const [editForm, setEditForm] = useState({ name: '', departmentId: '', status: 'ACTIVE' });
  const loadedRef = useRef(false);

  // Index departments by id for fast lookup (department not included in organization list response)
  const deptById = new Map(departments.map((d) => [d.id, d]));

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
      const [orgs, depts] = await Promise.all([
        getOdcavs(session.token),
        getDepartments(session.token),
      ]);
      setOdcavs(orgs);
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
      await createOdcav(session.token, {
        name: createForm.name,
        departmentId: createForm.departmentId,
        status: createForm.status,
      });
      toast.success('ODCAV créé.');
      setShowCreate(false);
      setCreateForm((f) => ({ name: '', departmentId: f.departmentId, status: 'ACTIVE' }));
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
      await updateOdcav(session.token, id, {
        name: editForm.name || undefined,
        departmentId: editForm.departmentId || undefined,
        status: editForm.status || undefined,
      });
      toast.success('ODCAV mis à jour.');
      setEditingId(null);
      await load();
    } catch (err) {
      if (err instanceof ApiError && err.globallyHandled) return;
      toast.error('Modification impossible', formatApiError(err));
    }
  }

  async function handleDelete(org: Organization) {
    if (!window.confirm(`Désactiver l'ODCAV "${org.name}" ?`)) return;
    const session = getSession();
    if (!session) return;
    try {
      await deleteOdcav(session.token, org.id);
      toast.success(`"${org.name}" désactivé.`);
      await load();
    } catch (err) {
      if (err instanceof ApiError && err.globallyHandled) return;
      toast.error('Désactivation impossible', formatApiError(err));
    }
  }

  function startEdit(org: Organization) {
    setEditingId(org.id);
    setEditForm({
      name: org.name,
      departmentId: org.departmentId ?? '',
      status: org.status,
    });
  }

  const q = query.toLowerCase().trim();
  const filtered = q
    ? odcavs.filter((o) => {
        const dept = deptById.get(o.departmentId ?? '');
        return [o.name, o.status, dept?.name, dept?.region?.name]
          .join(' ')
          .toLowerCase()
          .includes(q);
      })
    : odcavs;

  return (
    <PageShell
      eyebrow="Territoires"
      title="ODCAV"
      description="Organisations Départementales de la Communauté Athlétique Volontaire."
    >
      <AdminGuard>
        <AdminNav />

        {error && <div className="error">{error}</div>}

        <section className="panel stack">
          <div className="toolbar">
            <div>
              <h3>Liste des ODCAV</h3>
              <p className="muted">{odcavs.length} ODCAV enregistré(s).</p>
            </div>
            <button
              className="button button--primary"
              type="button"
              onClick={() => { setShowCreate(!showCreate); setError(null); }}
            >
              {showCreate ? 'Annuler' : 'Nouvel ODCAV'}
            </button>
          </div>

          {showCreate && (
            <form className="stack" onSubmit={handleCreate}>
              <h4>Créer un ODCAV</h4>
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
                <div className="field">
                  <label>Statut</label>
                  <select
                    value={createForm.status}
                    onChange={(e) => setCreateForm((f) => ({ ...f, status: e.target.value }))}
                  >
                    <option value="ACTIVE">Actif</option>
                    <option value="INACTIVE">Inactif</option>
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
              placeholder="Rechercher un ODCAV..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {odcavs.length === 0 ? (
            <div className="empty">Aucun ODCAV enregistré.</div>
          ) : filtered.length === 0 ? (
            <div className="empty">Aucun résultat trouvé.</div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Département</th>
                    <th>Région</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((org) => {
                    const dept = deptById.get(org.departmentId ?? '');
                    return (
                      <React.Fragment key={org.id}>
                        <tr>
                          <td><strong>{org.name}</strong></td>
                          <td>{dept?.name ?? <span className="muted">—</span>}</td>
                          <td>{dept?.region?.name ?? <span className="muted">—</span>}</td>
                          <td>{formatEntityStatus(org.status)}</td>
                          <td>
                            <div className="button-row">
                              <button
                                className="button button--secondary"
                                type="button"
                                onClick={() => editingId === org.id ? setEditingId(null) : startEdit(org)}
                              >
                                {editingId === org.id ? 'Annuler' : 'Modifier'}
                              </button>
                              <button
                                className="button button--ghost"
                                type="button"
                                onClick={() => handleDelete(org)}
                              >
                                Désactiver
                              </button>
                            </div>
                          </td>
                        </tr>
                        {editingId === org.id && (
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
                                  <div className="field">
                                    <label>Statut</label>
                                    <select
                                      value={editForm.status}
                                      onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                                    >
                                      <option value="ACTIVE">Actif</option>
                                      <option value="INACTIVE">Inactif</option>
                                    </select>
                                  </div>
                                </div>
                                <div className="button-row">
                                  <button
                                    className="button button--primary"
                                    type="button"
                                    onClick={() => handleUpdate(org.id)}
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </AdminGuard>
    </PageShell>
  );
}
