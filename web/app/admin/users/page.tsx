'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AdminGuard } from '@/components/admin-guard';
import { AdminNav } from '@/components/admin-nav';
import { PageShell } from '@/components/page-shell';
import { SmartConfirmDialog } from '@/components/smart-confirm-dialog';
import { Unauthorized } from '@/components/unauthorized';
import { useToast } from '@/components/ToastProvider';
import { ApiError, formatApiError, deleteUser, getDeletePreview, getUsers } from '@/lib/api';
import { formatEntityStatus, formatRole } from '@/lib/format';
import { getSession } from '@/lib/auth';
import { usePermissions } from '@/hooks/use-permissions';
import { AdminUser, DeletePreview } from '@/lib/types';

type DialogState = {
  preview: DeletePreview;
  user: AdminUser;
};

export default function AdminUsersPage() {
  const toast = useToast();
  const perms = usePermissions();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState | null>(null);

  useEffect(() => {
    if (!perms.canViewUsers) return;
    const session = getSession();
    if (!session) return;

    getUsers(session.token)
      .then(setUsers)
      .catch((err) => {
        if (err instanceof ApiError && err.globallyHandled) return;
        setError(formatApiError(err));
      });
  }, [perms.canViewUsers]);

  async function handleDeactivateClick(user: AdminUser) {
    const session = getSession();
    if (!session) return;
    setPreviewLoading(user.id);
    try {
      const preview = await getDeletePreview(session.token, 'user', user.id);
      setDialog({ preview, user });
    } catch (err) {
      if (err instanceof ApiError && err.globallyHandled) return;
      setError(formatApiError(err));
    } finally {
      setPreviewLoading(null);
    }
  }

  return (
    <PageShell
      eyebrow="Administration"
      title="Utilisateurs"
      description="Gérez les comptes administratifs, leurs rôles et leurs périmètres d'organisation."
    >
      <AdminGuard>
        <AdminNav />

        {!perms.canViewUsers ? (
          <Unauthorized />
        ) : (
          <>
            <section className="panel stack">
              <div className="toolbar">
                <div>
                  <h3>Comptes administratifs</h3>
                  <p className="muted">Liste des utilisateurs visibles dans votre périmètre.</p>
                </div>
                {perms.canCreateUser && (
                  <Link className="button button--primary" href="/admin/users/new">
                    Créer un utilisateur
                  </Link>
                )}
              </div>

              {error ? <div className="error">{error}</div> : null}

              {users.length === 0 ? (
                <div className="empty">Aucun utilisateur disponible.</div>
              ) : (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Nom</th>
                        <th>Contact</th>
                        <th>Rôle</th>
                        <th>Périmètre</th>
                        <th>Statut</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id}>
                          <td>{user.fullName}</td>
                          <td>
                            <div>{user.email ?? '-'}</div>
                            <div className="muted">{user.phone}</div>
                          </td>
                          <td>{formatRole(user.role)}</td>
                          <td>
                            {user.organizationAssignments
                              .map((assignment) => assignment.organization.name)
                              .join(', ') || '-'}
                          </td>
                          <td>{formatEntityStatus(user.status)}</td>
                          <td>
                            <div className="button-row">
                              <Link className="button button--secondary" href={`/admin/users/${user.id}`}>
                                Modifier
                              </Link>
                              <button
                                className="button button--ghost"
                                type="button"
                                disabled={user.status === 'INACTIVE' || previewLoading === user.id}
                                onClick={() => handleDeactivateClick(user)}
                              >
                                {previewLoading === user.id ? '…' : 'Désactiver'}
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
                await deleteUser(session.token, dialog.user.id);
                setUsers((current) =>
                  current.map((item) =>
                    item.id === dialog.user.id ? { ...item, status: 'INACTIVE' } : item,
                  ),
                );
                toast.success(`Utilisateur "${dialog.user.fullName}" désactivé.`);
              }}
            />
          </>
        )}
      </AdminGuard>
    </PageShell>
  );
}
