'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AdminGuard } from '@/components/admin-guard';
import { AdminNav } from '@/components/admin-nav';
import { PageShell } from '@/components/page-shell';
import { Field } from '@/components/form/Field';
import { SelectField } from '@/components/form/SelectField';
import { TextareaField } from '@/components/form/TextareaField';
import { useToast } from '@/components/ToastProvider';
import { venueSchema, type VenueFormData } from '@/lib/schemas';
import { ApiError, formatApiError, createVenue, getCommunes, getDepartments, getRegions } from '@/lib/api';
import { getSession } from '@/lib/auth';
import { Commune, Department, Region } from '@/lib/types';

export default function NewVenuePage() {
  const toast = useToast();
  const [regions, setRegions] = useState<Region[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [communes, setCommunes] = useState<Commune[]>([]);
  const [dataError, setDataError] = useState<string | null>(null);
  const [capacityStr, setCapacityStr] = useState('');

  // Cascade filter state — not in payload, not in RHF
  const [filterRegionId, setFilterRegionId] = useState('');
  const [filterDeptId, setFilterDeptId] = useState('');

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<VenueFormData>({
    resolver: zodResolver(venueSchema),
    defaultValues: { name: '', communeId: '', address: '', status: 'ACTIVE' },
  });

  const w = watch();
  const selectedCommune = communes.find((c) => c.id === w.communeId);

  useEffect(() => {
    const session = getSession();
    if (!session) return;
    const t = session.token;
    Promise.all([getRegions(t), getDepartments(t), getCommunes(t)])
      .then(([r, d, c]) => { setRegions(r); setDepartments(d); setCommunes(c); })
      .catch((err) => {
        if (err instanceof ApiError && err.globallyHandled) return;
        setDataError(formatApiError(err));
      });
  }, []);

  const deptOptions = useMemo(
    () => (filterRegionId ? departments.filter((d) => d.regionId === filterRegionId) : departments),
    [filterRegionId, departments],
  );

  const communeOptions = useMemo(
    () => (filterDeptId ? communes.filter((c) => c.departmentId === filterDeptId) : communes),
    [filterDeptId, communes],
  );

  async function onSubmit(data: VenueFormData) {
    const session = getSession();
    if (!session) return;
    try {
      const venue = await createVenue(session.token, {
        communeId: data.communeId || undefined,
        name: data.name,
        address: data.address || undefined,
        capacity: capacityStr ? Number(capacityStr) : undefined,
        status: data.status,
      });
      toast.success(`Stade créé : ${venue.name}`);
      reset({ name: '', communeId: '', address: '', status: 'ACTIVE' });
      setCapacityStr('');
      setFilterRegionId('');
      setFilterDeptId('');
    } catch (err) {
      if (err instanceof ApiError && err.globallyHandled) return;
      toast.error('Création impossible', formatApiError(err));
    }
  }

  return (
    <PageShell
      eyebrow="Administration"
      title="Nouveau stade"
      description="Rattachez le stade à sa commune en filtrant par région et département."
    >
      <AdminGuard>
        <AdminNav />
        <section className="panel stack">
          {dataError && <div className="error">{dataError}</div>}
          <form className="form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="form__grid">
              {/* ── Cascade filters (UI only) ── */}
              <SelectField
                label="Région"
                id="filterRegion"
                value={filterRegionId}
                onChange={(e) => {
                  setFilterRegionId(e.target.value);
                  setFilterDeptId('');
                  setValue('communeId', '');
                }}
              >
                <option value="">— Toutes les régions —</option>
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </SelectField>

              <SelectField
                label="Département"
                id="filterDept"
                value={filterDeptId}
                onChange={(e) => {
                  setFilterDeptId(e.target.value);
                  setValue('communeId', '');
                }}
              >
                <option value="">— Tous les départements —</option>
                {deptOptions.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </SelectField>

              {/* ── Required commune (validated) ── */}
              <Controller
                name="communeId"
                control={control}
                render={({ field, fieldState }) => (
                  <SelectField
                    ref={field.ref}
                    label="Commune"
                    id="communeId"
                    required
                    value={field.value}
                    onBlur={field.onBlur}
                    onChange={(e) => field.onChange(e.target.value)}
                    error={fieldState.error?.message}
                    success={!!field.value && !fieldState.error}
                  >
                    <option value="">— Choisir une commune —</option>
                    {communeOptions.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </SelectField>
                )}
              />

              <Field
                label="Nom"
                id="name"
                required
                error={errors.name?.message}
                success={!!w.name && !errors.name}
                {...register('name')}
              />

              <div className="field">
                <label htmlFor="capacity">Capacité</label>
                <input
                  id="capacity"
                  type="number"
                  min={0}
                  value={capacityStr}
                  placeholder="Facultatif"
                  onChange={(e) => setCapacityStr(e.target.value)}
                />
              </div>

              <SelectField
                label="Statut"
                id="status"
                error={errors.status?.message}
                {...register('status')}
              >
                <option value="ACTIVE">Actif</option>
                <option value="INACTIVE">Inactif</option>
                <option value="ARCHIVED">Archivé</option>
              </SelectField>
            </div>

            <TextareaField
              label="Adresse"
              id="address"
              error={errors.address?.message}
              {...register('address')}
            />

            {selectedCommune && (
              <div className="card">
                <strong>{selectedCommune.name}</strong>
                <div className="muted">
                  {selectedCommune.department?.name ?? '—'}
                  {selectedCommune.department?.region
                    ? ` — ${selectedCommune.department.region.name}`
                    : ''}
                </div>
              </div>
            )}

            <div className="button-row">
              <button className="button button--primary" disabled={isSubmitting} type="submit">
                {isSubmitting ? 'Création…' : 'Créer le stade'}
              </button>
            </div>
          </form>
        </section>
      </AdminGuard>
    </PageShell>
  );
}
