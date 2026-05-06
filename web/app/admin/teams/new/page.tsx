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
  createTeam,
  getRegions,
  getDepartments,
  getCommunes,
  getOdcavs,
  getZones,
} from '@/lib/api';
import { getSession } from '@/lib/auth';
import type { Commune, Department, Organization, Region } from '@/lib/types';

type AgeCategory = 'SENIOR' | 'CADET';

export default function NewTeamPage() {
  const toast = useToast();

  const [regions, setRegions] = useState<Region[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [communes, setCommunes] = useState<Commune[]>([]);
  const [odcavs, setOdcavs] = useState<Organization[]>([]);
  const [zones, setZones] = useState<Organization[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [regionId, setRegionId] = useState('');
  const [odcavId, setOdcavId] = useState('');
  const [communeId, setCommuneId] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<AgeCategory>('SENIOR');
  const [status, setStatus] = useState('ACTIVE');

  useEffect(() => {
    const session = getSession();
    if (!session) return;
    Promise.all([
      getRegions(session.token),
      getDepartments(session.token),
      getCommunes(session.token),
      getOdcavs(session.token),
      getZones(session.token),
    ])
      .then(([regionList, deptList, communeList, odcavList, zoneList]) => {
        setRegions(regionList);
        setDepartments(deptList);
        setCommunes(communeList);
        setOdcavs(odcavList);
        setZones(zoneList);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.globallyHandled) return;
        setLoadError(formatApiError(err));
      });
  }, []);

  const selectedRegion = regions.find((r) => r.id === regionId);
  const selectedOdcav = odcavs.find((o) => o.id === odcavId);
  const selectedCommune = communes.find((c) => c.id === communeId);
  const selectedZone = zones.find((z) => z.id === zoneId);

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

  const filteredZones = useMemo(
    () => zones.filter((z) => !communeId || z.communeId === communeId),
    [zones, communeId],
  );

  function handleRegionChange(id: string) {
    setRegionId(id);
    setOdcavId('');
    setCommuneId('');
    setZoneId('');
  }

  function handleOdcavChange(id: string) {
    setOdcavId(id);
    setCommuneId('');
    setZoneId('');
  }

  function handleCommuneChange(id: string) {
    setCommuneId(id);
    setZoneId('');
  }

  const isComplete = !!regionId && !!odcavId && !!communeId && !!zoneId && name.trim().length >= 2;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isComplete) return;
    const session = getSession();
    if (!session) return;
    setLoading(true);
    try {
      const team = await createTeam(session.token, {
        organizationId: zoneId,
        name: name.trim(),
        category,
        status,
      });
      toast.success(`Équipe créée : ${team.name}`);
      setName('');
      setZoneId('');
      setCommuneId('');
      setOdcavId('');
      setRegionId('');
    } catch (err) {
      if (err instanceof ApiError && err.globallyHandled) return;
      toast.error('Erreur', formatApiError(err));
    } finally {
      setLoading(false);
    }
  }

  const categoryLabel = category === 'CADET' ? 'Cadet' : 'Senior';
  const statusLabel = status === 'ACTIVE' ? 'Actif' : status === 'INACTIVE' ? 'Inactif' : 'Archivé';

  return (
    <PageShell
      eyebrow="Administration"
      title="Nouvelle équipe"
      description="Ajoutez une équipe rattachée à une zone pour préparer la création de matchs."
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
                onChange={(e) => handleCommuneChange(e.target.value)}
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

              <SelectField
                label="Zone"
                id="zoneId"
                required
                value={zoneId}
                onChange={(e) => setZoneId(e.target.value)}
                disabled={!communeId}
                helper={
                  !communeId
                    ? "Sélectionnez d'abord une commune."
                    : filteredZones.length === 0
                    ? 'Aucune zone disponible dans cette commune.'
                    : undefined
                }
              >
                <option value="">— Choisir une zone —</option>
                {filteredZones.map((z) => (
                  <option key={z.id} value={z.id}>{z.name}</option>
                ))}
              </SelectField>

              <Field
                label="Nom de l'équipe"
                id="name"
                required
                disabled={!zoneId}
                value={name}
                onChange={(e) => setName(e.target.value)}
                helper={!zoneId ? "Sélectionnez d'abord une zone." : undefined}
                placeholder="Ex. ASC Parcelles"
              />

              <SelectField
                label="Catégorie sportive"
                id="category"
                required
                value={category}
                onChange={(e) => setCategory(e.target.value as AgeCategory)}
              >
                <option value="SENIOR">Senior</option>
                <option value="CADET">Cadet</option>
              </SelectField>

              <SelectField
                label="Statut"
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="ACTIVE">Actif</option>
                <option value="INACTIVE">Inactif</option>
                <option value="ARCHIVED">Archivé</option>
              </SelectField>
            </div>

            {isComplete && selectedRegion && selectedOdcav && selectedCommune && selectedZone && (
              <div className="card">
                <div className="muted" style={{ fontSize: '0.75rem', marginBottom: 4 }}>Récapitulatif</div>
                <strong>
                  {selectedRegion.name} → {selectedOdcav.name} → {selectedCommune.name} → {selectedZone.name} → {name.trim()}
                </strong>
                <div className="muted" style={{ marginTop: 4 }}>
                  {categoryLabel} · {statusLabel}
                </div>
              </div>
            )}

            <div className="button-row">
              <button
                className="button button--primary"
                disabled={loading || !isComplete}
                type="submit"
              >
                {loading ? 'Création…' : "Créer l'équipe"}
              </button>
            </div>
          </form>
        </section>
      </AdminGuard>
    </PageShell>
  );
}
