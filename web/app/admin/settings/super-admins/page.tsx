'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AdminNav } from '@/components/admin-nav';
import { PageShell } from '@/components/page-shell';
import { SuperAdminGuard } from '@/components/super-admin-guard';
import {
  ApiError,
  formatApiError,
  createSuperAdmin,
  deactivateSuperAdmin,
  getSuperAdmins,
  updateSuperAdmin,
} from '@/lib/api';
import { getSession } from '@/lib/auth';
import { useToast } from '@/components/ToastProvider';
import { SuperAdmin } from '@/lib/types';

function StatusBadge({ status }: { status: SuperAdmin['status'] }) {
  const color = status === 'ACTIVE' ? '#17884C' : '#C93D37';
  return <span style={{ color, fontWeight: 700 }}>{status}</span>;
}

export default function SuperAdminsPage() {
  const [admins, setAdmins] = useState<SuperAdmin[]>([]);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const [editForm, setEditForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
  });

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
      setAdmins(await getSuperAdmins(session.token));
    } catch (err) {
      if (err instanceof ApiError && err.globallyHandled) return;
      setError(formatApiError(err));
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();

    if (createForm.password !== createForm.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas.');
      return;
    }

    const session = getSession();
    if (!session) return;

    try {
      await createSuperAdmin(session.token, {
        fullName: createForm.fullName,
        email: createForm.email || undefined,
        phone: createForm.phone,
        password: createForm.password,
      });
      toast.success('Super Admin créé avec succès.');
      setShowCreateForm(false);
      setCreateForm({ fullName: '', email: '', phone: '', password: '', confirmPassword: '' });
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
      await updateSuperAdmin(session.token, id, {
        fullName: editForm.fullName || undefined,
        email: editForm.email || undefined,
        phone: editForm.phone || undefined,
        password: editForm.password || undefined,
      });
      toast.success('Super Admin mis à jour.');
      setEditingId(null);
      await load();
    } catch (err) {
      if (err instanceof ApiError && err.globallyHandled) return;
      toast.error('Modification impossible', formatApiError(err));
    }
  }

  async function handleDeactivate(admin: SuperAdmin) {
    if (!window.confirm(`Désactiver ${admin.fullName} ?`)) return;

    const session = getSession();
    if (!session) return;

    try {
      await deactivateSuperAdmin(session.token, admin.id);
      toast.success(`${admin.fullName} désactivé.`);
      await load();
    } catch (err) {
      if (err instanceof ApiError && err.globallyHandled) return;
      toast.error('Désactivation impossible', formatApiError(err));
    }
  }

  function startEdit(admin: SuperAdmin) {
    setEditingId(admin.id);
    setEditForm({ fullName: admin.fullName, email: admin.email ?? '', phone: admin.phone, password: '' });
  }

  return (
    <PageShell
      eyebrow="Paramètres"
      title="Super Admins"
      description="Comptes disposant d'un accès total à la plateforme."
    >
      <SuperAdminGuard>
        <AdminNav />

        {error && <div className="error">{error}</div>}

        <section className="panel stack">
          <div className="toolbar">
            <div>
              <h3>Liste des Super Admins</h3>
              <p className="muted">Au moins un compte actif doit être conservé.</p>
            </div>
            <button
              className="button button--primary"
              type="button"
              onClick={() => { setShowCreateForm(!showCreateForm); setError(null); }}
            >
              {showCreateForm ? 'Annuler' : 'Nouveau Super Admin'}
            </button>
          </div>

          {showCreateForm && (
            <form className="stack" onSubmit={handleCreate}>
              <h4>Créer un Super Admin</h4>
              <div className="field">
                <label>Nom complet *</label>
                <input
                  type="text"
                  required
                  value={createForm.fullName}
                  onChange={(e) => setCreateForm((f) => ({ ...f, fullName: e.target.value }))}
                />
              </div>
              <div className="field">
                <label>Email</label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="field">
                <label>Téléphone *</label>
                <input
                  type="text"
                  required
                  value={createForm.phone}
                  onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div className="field">
                <label>Mot de passe * (min. 8 caractères)</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={createForm.password}
                  onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                />
              </div>
              <div className="field">
                <label>Confirmer le mot de passe *</label>
                <input
                  type="password"
                  required
                  value={createForm.confirmPassword}
                  onChange={(e) => setCreateForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                />
              </div>
              <div className="button-row">
                <button className="button button--primary" type="submit">Créer</button>
                <button className="button button--ghost" type="button" onClick={() => setShowCreateForm(false)}>Annuler</button>
              </div>
            </form>
          )}

          {admins.length === 0 ? (
            <div className="empty">Aucun Super Admin trouvé.</div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Email</th>
                    <th>Téléphone</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map((admin) => (
                    <React.Fragment key={admin.id}>
                      <tr>
                        <td><strong>{admin.fullName}</strong></td>
                        <td>{admin.email ?? <span className="muted">—</span>}</td>
                        <td>{admin.phone}</td>
                        <td><StatusBadge status={admin.status} /></td>
                        <td>
                          <div className="button-row">
                            <button
                              className="button button--secondary"
                              type="button"
                              onClick={() => editingId === admin.id ? setEditingId(null) : startEdit(admin)}
                            >
                              {editingId === admin.id ? 'Annuler' : 'Modifier'}
                            </button>
                            {admin.status === 'ACTIVE' && (
                              <button
                                className="button button--ghost"
                                type="button"
                                onClick={() => handleDeactivate(admin)}
                              >
                                Désactiver
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {editingId === admin.id && (
                        <tr>
                          <td colSpan={5}>
                            <div className="stack" style={{ padding: '12px 0' }}>
                              <div className="button-row">
                                <div className="field">
                                  <label>Nom complet</label>
                                  <input
                                    type="text"
                                    value={editForm.fullName}
                                    onChange={(e) => setEditForm((f) => ({ ...f, fullName: e.target.value }))}
                                  />
                                </div>
                                <div className="field">
                                  <label>Email</label>
                                  <input
                                    type="email"
                                    value={editForm.email}
                                    onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                                  />
                                </div>
                                <div className="field">
                                  <label>Téléphone</label>
                                  <input
                                    type="text"
                                    value={editForm.phone}
                                    onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                                  />
                                </div>
                                <div className="field">
                                  <label>Nouveau mot de passe (optionnel)</label>
                                  <input
                                    type="password"
                                    placeholder="Laisser vide pour ne pas modifier"
                                    value={editForm.password}
                                    onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))}
                                  />
                                </div>
                              </div>
                              <div className="button-row">
                                <button
                                  className="button button--primary"
                                  type="button"
                                  onClick={() => handleUpdate(admin.id)}
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
      </SuperAdminGuard>
    </PageShell>
  );
}
