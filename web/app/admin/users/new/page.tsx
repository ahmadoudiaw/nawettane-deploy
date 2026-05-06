'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AdminGuard } from '@/components/admin-guard';
import { AdminNav } from '@/components/admin-nav';
import { PageShell } from '@/components/page-shell';
import { Field } from '@/components/form/Field';
import { SelectField } from '@/components/form/SelectField';
import { useToast } from '@/components/ToastProvider';
import { userSchema, type UserFormData } from '@/lib/schemas';
import {
  ApiError,
  formatApiError,
  createUser,
  getDepartments,
  getOrganizationsTree,
  getRegions,
  getZones,
} from '@/lib/api';
import { getSession } from '@/lib/auth';
import { Department, Organization, Region, Role } from '@/lib/types';

type ScopeType = 'NATIONAL' | 'REGIONAL' | 'DEPARTMENTAL' | 'ZONAL';

const ADMIN_ROLES: Role[] = [
  'SUPER_ADMIN', 'ONCAV_ADMIN', 'ORCAV_ADMIN', 'ODCAV_ADMIN',
  'ZONE_ADMIN', 'GUICHET_AGENT', 'AGENT_MAIRIE',
];

const SCOPE_OPTIONS: { value: ScopeType; label: string }[] = [
  { value: 'NATIONAL', label: 'National — accès à toutes les données' },
  { value: 'REGIONAL', label: 'Régional — limité à une région (ORCAV)' },
  { value: 'DEPARTMENTAL', label: 'Départemental — limité à un département (ODCAV)' },
  { value: 'ZONAL', label: 'Zonal — limité à une zone' },
];

const ROLE_DEFAULT_SCOPE: Partial<Record<Role, ScopeType>> = {
  SUPER_ADMIN: 'NATIONAL', ONCAV_ADMIN: 'NATIONAL',
  ORCAV_ADMIN: 'REGIONAL', ODCAV_ADMIN: 'DEPARTMENTAL',
  ZONE_ADMIN: 'ZONAL', GUICHET_AGENT: 'ZONAL', AGENT_MAIRIE: 'ZONAL',
};

function flattenOrganizations(nodes: Organization[]): Organization[] {
  return nodes.flatMap((n) => [n, ...(n.children ? flattenOrganizations(n.children) : [])]);
}

export default function NewUserPage() {
  const toast = useToast();
  const [regions, setRegions] = useState<Region[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [orcavs, setOrcavs] = useState<Organization[]>([]);
  const [odcavs, setOdcavs] = useState<Organization[]>([]);
  const [zones, setZones] = useState<Organization[]>([]);
  const [dataError, setDataError] = useState<string | null>(null);

  // Scope cascade — outside RHF (not in API payload directly)
  const [scopeType, setScopeType] = useState<ScopeType>('ZONAL');
  const [scopeRegionId, setScopeRegionId] = useState('');
  const [scopeDeptId, setScopeDeptId] = useState('');
  const [scopeZoneId, setScopeZoneId] = useState('');
  const [scopeError, setScopeError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      fullName: '', email: '', phone: '', password: '',
      role: 'ZONE_ADMIN', status: 'ACTIVE',
    },
  });

  const w = watch();

  useEffect(() => {
    const session = getSession();
    if (!session) return;
    const t = session.token;
    Promise.all([getRegions(t), getDepartments(t), getOrganizationsTree(t), getZones(t)])
      .then(([r, d, tree, z]) => {
        setRegions(r);
        setDepartments(d);
        const all = flattenOrganizations(tree);
        setOrcavs(all.filter((o) => o.type === 'ORCAV'));
        setOdcavs(all.filter((o) => o.type === 'ODCAV'));
        setZones(z);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.globallyHandled) return;
        setDataError(formatApiError(err));
      });
  }, []);

  const scopeDeptOptions = useMemo(
    () => (scopeRegionId ? departments.filter((d) => d.regionId === scopeRegionId) : departments),
    [scopeRegionId, departments],
  );

  const scopeZoneOptions = useMemo(
    () => scopeDeptId ? zones.filter((z) => z.commune?.departmentId === scopeDeptId) : zones,
    [scopeDeptId, zones],
  );

  const resolvedOrcav = orcavs.find((o) => o.regionId === scopeRegionId);
  const resolvedOdcav = odcavs.find((o) => o.departmentId === scopeDeptId);
  const resolvedZone = zones.find((z) => z.id === scopeZoneId);

  function buildOrganizationIds(): string[] | undefined {
    if (scopeType === 'REGIONAL') return resolvedOrcav ? [resolvedOrcav.id] : undefined;
    if (scopeType === 'DEPARTMENTAL') return resolvedOdcav ? [resolvedOdcav.id] : undefined;
    if (scopeType === 'ZONAL') return scopeZoneId ? [scopeZoneId] : undefined;
    return undefined;
  }

  function handleRoleChange(role: UserFormData['role']) {
    setValue('role', role);
    const suggested = ROLE_DEFAULT_SCOPE[role] ?? 'NATIONAL';
    setScopeType(suggested);
    setScopeRegionId('');
    setScopeDeptId('');
    setScopeZoneId('');
    setScopeError(null);
  }

  function handleScopeTypeChange(type: ScopeType) {
    setScopeType(type);
    setScopeRegionId('');
    setScopeDeptId('');
    setScopeZoneId('');
    setScopeError(null);
  }

  async function onSubmit(data: UserFormData) {
    const session = getSession();
    if (!session) return;

    // Manual scope validation (cascade is outside Zod schema)
    if (scopeType === 'REGIONAL' && !scopeRegionId) {
      setScopeError('Veuillez sélectionner une région.');
      return;
    }
    if (scopeType === 'DEPARTMENTAL' && !scopeDeptId) {
      setScopeError('Veuillez sélectionner un département.');
      return;
    }
    if (scopeType === 'ZONAL' && !scopeZoneId) {
      setScopeError('Veuillez sélectionner une zone.');
      return;
    }
    setScopeError(null);

    try {
      const user = await createUser(session.token, {
        fullName: data.fullName,
        email: data.email || undefined,
        phone: data.phone,
        password: data.password || undefined,
        role: data.role,
        status: data.status,
        organizationIds: buildOrganizationIds(),
      });
      toast.success(`Utilisateur créé : ${user.fullName}`);
      reset();
      setScopeRegionId('');
      setScopeDeptId('');
      setScopeZoneId('');
    } catch (err) {
      if (err instanceof ApiError && err.globallyHandled) return;
      toast.error('Création impossible', formatApiError(err));
    }
  }

  return (
    <PageShell
      eyebrow="Administration"
      title="Créer un utilisateur"
      description="Ajoutez un compte admin avec rôle et périmètre territorial hiérarchique."
    >
      <AdminGuard>
        <AdminNav />

        <section className="panel stack">
          {dataError && <div className="error">{dataError}</div>}

          <form className="form" onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* ── Informations personnelles ──────────────────────────────── */}
            <div className="form__grid">
              <Field
                label="Nom complet"
                id="fullName"
                required
                error={errors.fullName?.message}
                success={!!w.fullName && !errors.fullName}
                {...register('fullName')}
              />

              <Field
                label="Email"
                id="email"
                type="email"
                error={errors.email?.message}
                success={!!w.email && !errors.email}
                {...register('email')}
              />

              <Field
                label="Téléphone"
                id="phone"
                required
                error={errors.phone?.message}
                success={!!w.phone && !errors.phone}
                {...register('phone')}
              />

              <Field
                label="Mot de passe"
                id="password"
                type="password"
                error={errors.password?.message}
                {...register('password')}
              />

              <SelectField
                label="Rôle"
                id="role"
                value={w.role}
                error={errors.role?.message}
                onChange={(e) => handleRoleChange(e.target.value as UserFormData['role'])}
              >
                {ADMIN_ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </SelectField>

              <SelectField
                label="Statut"
                id="status"
                error={errors.status?.message}
                {...register('status')}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="SUSPENDED">SUSPENDED</option>
              </SelectField>
            </div>

            {/* ── Périmètre territorial ─────────────────────────────────── */}
            <div className="stack">
              <div>
                <h3>Périmètre territorial</h3>
                <p className="muted">Définit l'étendue des données accessibles par cet utilisateur.</p>
              </div>

              <div className="form__grid">
                <SelectField
                  label="Type de périmètre"
                  id="scopeType"
                  value={scopeType}
                  onChange={(e) => handleScopeTypeChange(e.target.value as ScopeType)}
                >
                  {SCOPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </SelectField>

                {scopeType !== 'NATIONAL' && (
                  <SelectField
                    label="Région"
                    id="scopeRegion"
                    required
                    value={scopeRegionId}
                    error={scopeType === 'REGIONAL' && scopeError && !scopeRegionId ? scopeError : undefined}
                    onChange={(e) => {
                      setScopeRegionId(e.target.value);
                      setScopeDeptId('');
                      setScopeZoneId('');
                      setScopeError(null);
                    }}
                  >
                    <option value="">— Choisir —</option>
                    {regions.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </SelectField>
                )}

                {(scopeType === 'DEPARTMENTAL' || scopeType === 'ZONAL') && (
                  <SelectField
                    label="Département"
                    id="scopeDept"
                    required
                    value={scopeDeptId}
                    disabled={!scopeRegionId}
                    error={scopeType === 'DEPARTMENTAL' && scopeError && !scopeDeptId ? scopeError : undefined}
                    onChange={(e) => {
                      setScopeDeptId(e.target.value);
                      setScopeZoneId('');
                      setScopeError(null);
                    }}
                  >
                    <option value="">— Choisir —</option>
                    {scopeDeptOptions.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </SelectField>
                )}

                {scopeType === 'ZONAL' && (
                  <SelectField
                    label="Zone"
                    id="scopeZone"
                    required
                    value={scopeZoneId}
                    disabled={!scopeDeptId}
                    error={scopeType === 'ZONAL' && scopeError && !scopeZoneId ? scopeError : undefined}
                    onChange={(e) => {
                      setScopeZoneId(e.target.value);
                      setScopeError(null);
                    }}
                  >
                    <option value="">— Choisir —</option>
                    {scopeZoneOptions.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.commune ? `${z.name} — ${z.commune.name}` : z.name}
                      </option>
                    ))}
                  </SelectField>
                )}
              </div>

              {scopeType !== 'NATIONAL' && (
                <div className="card">
                  {scopeType === 'REGIONAL' &&
                    (resolvedOrcav ? (
                      <>
                        <strong>{resolvedOrcav.name}</strong>
                        <div className="muted">ORCAV — périmètre régional</div>
                      </>
                    ) : scopeRegionId ? (
                      <div className="muted">Aucun ORCAV configuré pour cette région.</div>
                    ) : (
                      <div className="muted">Sélectionnez une région.</div>
                    ))}

                  {scopeType === 'DEPARTMENTAL' &&
                    (resolvedOdcav ? (
                      <>
                        <strong>{resolvedOdcav.name}</strong>
                        <div className="muted">ODCAV — périmètre départemental</div>
                      </>
                    ) : scopeDeptId ? (
                      <div className="muted">Aucun ODCAV configuré pour ce département.</div>
                    ) : (
                      <div className="muted">Sélectionnez un département.</div>
                    ))}

                  {scopeType === 'ZONAL' &&
                    (resolvedZone ? (
                      <>
                        <strong>{resolvedZone.name}</strong>
                        <div className="muted">
                          Zone — périmètre zonal
                          {resolvedZone.commune ? ` · ${resolvedZone.commune.name}` : ''}
                        </div>
                      </>
                    ) : (
                      <div className="muted">Sélectionnez une zone.</div>
                    ))}
                </div>
              )}
            </div>

            <div className="button-row">
              <button className="button button--primary" disabled={isSubmitting} type="submit">
                {isSubmitting ? 'Création…' : 'Créer'}
              </button>
            </div>
          </form>
        </section>
      </AdminGuard>
    </PageShell>
  );
}
