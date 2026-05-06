'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { AdminGuard } from '@/components/admin-guard';
import { AdminNav } from '@/components/admin-nav';
import { PageShell } from '@/components/page-shell';
import { ApiError, formatApiError, getCommunes, getOdcavs, getZone, updateZone } from '@/lib/api';
import { getSession } from '@/lib/auth';
import { Commune, Organization } from '@/lib/types';

export default function EditZonePage() {
  const params = useParams<{ id: string }>();
  const [communes, setCommunes] = useState<Commune[]>([]);
  const [odcavs, setOdcavs] = useState<Organization[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    communeId: '',
    parentId: '',
    status: 'ACTIVE',
  });

  useEffect(() => {
    const session = getSession();
    if (!session) return;

    Promise.all([
      getZone(session.token, params.id),
      getCommunes(session.token),
      getOdcavs(session.token),
    ])
      .then(([zone, communeList, odcavList]) => {
        setCommunes(communeList);
        setOdcavs(odcavList);
        setForm({
          name: zone.name,
          communeId: zone.communeId ?? '',
          parentId: zone.parentId ?? '',
          status: zone.status,
        });
      })
      .catch((err) => {
        setError(formatApiError(err));
      });
  }, [params.id]);

  const selectedCommune = communes.find((c) => c.id === form.communeId);

  const filteredOdcavs = useMemo(() => {
    if (!selectedCommune) return odcavs;
    return odcavs.filter((o) => !o.departmentId || o.departmentId === selectedCommune.departmentId);
  }, [odcavs, selectedCommune]);

  function handleCommuneChange(communeId: string) {
    setForm((f) => ({ ...f, communeId, parentId: '' }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = getSession();
    if (!session) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await updateZone(session.token, params.id, {
        name: form.name,
        communeId: form.communeId || undefined,
        parentId: form.parentId || undefined,
        status: form.status,
      });
      setSuccess('Zone mise à jour.');
    } catch (err) {
      if (err instanceof ApiError && err.globallyHandled) return;
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageShell
      eyebrow="Administration"
      title="Modifier une zone"
      description="Mettez à jour la commune, l'ODCAV parent et le statut de la zone."
    >
      <AdminGuard>
        <AdminNav />
        <section className="panel stack">
          <form className="form" onSubmit={handleSubmit}>
            <div className="form__grid">
              <div className="field">
                <label>Commune</label>
                <select
                  value={form.communeId}
                  onChange={(e) => handleCommuneChange(e.target.value)}
                >
                  <option value="">— Non rattachée —</option>
                  {communes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.department ? ` (${c.department.name}${c.department.region ? ` — ${c.department.region.name}` : ''})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Nom *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div className="field">
                <label>ODCAV parent</label>
                <select
                  value={form.parentId}
                  onChange={(e) => setForm({ ...form, parentId: e.target.value })}
                >
                  <option value="">— Aucun —</option>
                  {filteredOdcavs.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Statut</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="ACTIVE">Actif</option>
                  <option value="INACTIVE">Inactif</option>
                  <option value="ARCHIVED">Archivé</option>
                </select>
              </div>
            </div>

            {selectedCommune && (
              <div className="card">
                <strong>{selectedCommune.name}</strong>
                <div className="muted">
                  {selectedCommune.department?.name ?? '—'}
                  {selectedCommune.department?.region ? ` — ${selectedCommune.department.region.name}` : ''}
                </div>
              </div>
            )}

            {error ? <div className="error">{error}</div> : null}
            {success ? <div className="panel"><strong>{success}</strong></div> : null}

            <div className="button-row">
              <button className="button button--primary" disabled={loading} type="submit">
                {loading ? 'Mise à jour...' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </section>
      </AdminGuard>
    </PageShell>
  );
}
