'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdminGuard } from '@/components/admin-guard';
import { AdminNav } from '@/components/admin-nav';
import { PageShell } from '@/components/page-shell';
import { Field } from '@/components/form/Field';
import { SelectField } from '@/components/form/SelectField';
import { useToast } from '@/components/ToastProvider';
import {
  ApiError,
  formatApiError,
  createZone,
  getRegions,
  getDepartments,
  getCommunes,
  getOdcavs,
} from '@/lib/api';
import { getSession } from '@/lib/auth';
import type { Commune, Department, Organization, Region } from '@/lib/types';

export default function NewZonePage() {
  const toast = useToast();
  const [regions, setRegions] = useState<Region[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [communes, setCommunes] = useState<Commune[]>([]);
  const [odcavs, setOdcavs] = useState<Organization[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [regionId, setRegionId] = useState('');
  const [odcavId, setOdcavId] = useState('');
  const [communeId, setCommuneId] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState('ACTIVE');

  useEffect(() => {
    const session = getSession();
    if (!session) return;
    Promise.all([
      getRegions(session.token),
      getDepartments(session.token),
      getCommunes(session.token),
      getOdcavs(session.token),
    ])
      .then(([regionList, deptList, communeList, odcavList]) => {
        setRegions(regionList);
        setDepartments(deptList);
        setCommunes(communeList);
        setOdcavs(odcavList);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.globallyHandled) return;
        setLoadError(formatApiError(err));
      });
  }, []);

  const selectedRegion = regions.find((r) => r.id === regionId);
  const selectedOdcav = odcavs.find((o) => o.id === odcavId);
  const selectedCommune = communes.find((c) => c.id === communeId);

  const deptIdsInRegion = useMemo(() => {
    if (!regionId) return new Set<string>();
    return new Set(departments.filter((d) => d.regionId === regionId).map((d) => d.id));
  }, [departments, regionId]);

  const filteredOdcavs = useMemo(
    () => odcavs.filter((o) => !regionId || (o.departmentId != null && deptIdsInRegion.has(o.departmentId))),
    [odcavs, regionId, deptIdsInRegion],
  );

  const filteredCommunes = useMemo(
    () => communes.filter((c) => !odcavId || (selectedOdcav?.departmentId != null && c.departmentId === selectedOdcav.departmentId)),
    [communes, odcavId, selectedOdcav],
  );

  function handleRegionChange(id: string) {
    setRegionId(id);
    setOdcavId('');
    setCommuneId('');
  }

  function handleOdcavChange(id: string) {
    setOdcavId(id);
    setCommuneId('');
  }

  const isComplete = !!regionId && !!odcavId && !!communeId && name.trim().length >= 2;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isComplete) return;
    const session = getSession();
    if (!session) return;
    setLoading(true);
    setSubmitError(null);
    try {
      const zone = await createZone(session.token, {
        name: name.trim(),
        communeId,
        parentId: odcavId,
        status,
      });
      toast.success(`Zone créée : ${zone.name}`);
      setName('');
      setCommuneId('');
      setOdcavId('');
      setRegionId('');
    } catch (err) {
      if (err instanceof ApiError && err.globallyHandled) return;
      setSubmitError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageShell
      eyebrow="Administration"
      title="Nouvelle zone"
      description="Créez une zone sportive rattachée à une commune."
    >
      <AdminGuard>
        <AdminNav />
        <section className="panel">
          {loadError && <div className="error">{loadError}</div>}
          <form className="form" onSubmit={handleSubmit}>
            <div className="form__grid">
              <SelectField
                label="Région"
                id="regionId"
                required
                value={regionId}
                onChange={(e) => handleRegionChange(e.target.value)}
                helper={regions.length === 0 && !loadError ? 'Chargement…' : undefined}
              >
                <option value="">— Choisir une région —</option>
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </SelectField>

              <SelectField
                label="ODCAV"
                id="odcavId"
                required
                value={odcavId}
                onChange={(e) => handleOdcavChange(e.target.value)}
                disabled={!regionId}
                helper={
                  !regionId
                    ? "Sélectionnez d'abord une région."
                    : filteredOdcavs.length === 0
                    ? 'Aucun ODCAV disponible dans cette région.'
                    : undefined
                }
              >
                <option value="">— Choisir un ODCAV —</option>
                {filteredOdcavs.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </SelectField>

              <SelectField
                label="Commune"
                id="communeId"
                required
                value={communeId}
                onChange={(e) => setCommuneId(e.target.value)}
                disabled={!odcavId}
                helper={
                  !odcavId
                    ? "Sélectionnez d'abord un ODCAV."
                    : filteredCommunes.length === 0
                    ? 'Aucune commune disponible dans ce département.'
                    : undefined
                }
              >
                <option value="">— Choisir une commune —</option>
                {filteredCommunes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </SelectField>

              <Field
                label="Nom de la zone"
                id="name"
                required
                disabled={!communeId}
                value={name}
                onChange={(e) => setName(e.target.value)}
                helper={!communeId ? "Sélectionnez d'abord une commune." : undefined}
                placeholder="Ex. Zone Nord"
              />

              <SelectField
                label="Statut"
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="ACTIVE">Actif</option>
                <option value="INACTIVE">Inactif</option>
              </SelectField>
            </div>

            {isComplete && selectedRegion && selectedOdcav && selectedCommune && (
              <div className="card">
                <div className="muted" style={{ fontSize: '0.75rem', marginBottom: 4 }}>Récapitulatif</div>
                <strong>
                  {selectedRegion.name} → {selectedOdcav.name} → {selectedCommune.name} → {name.trim()}
                </strong>
              </div>
            )}

            {submitError && <div className="error">{submitError}</div>}

            <div className="button-row">
              <button
                className="button button--primary"
                disabled={loading || !isComplete}
                type="submit"
              >
                {loading ? 'Création…' : 'Créer la zone'}
              </button>
            </div>
          </form>
        </section>
      </AdminGuard>
    </PageShell>
  );
}
