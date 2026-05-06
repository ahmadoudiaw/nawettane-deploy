'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AdminGuard } from '@/components/admin-guard';
import { AdminNav } from '@/components/admin-nav';
import { PageShell } from '@/components/page-shell';
import { Field } from '@/components/form/Field';
import { SelectField } from '@/components/form/SelectField';
import { TextareaField } from '@/components/form/TextareaField';
import { useToast } from '@/components/ToastProvider';
import { venueEditSchema, type VenueEditFormData } from '@/lib/schemas';
import { ApiError, formatApiError, getCommunes, getVenue, updateVenue } from '@/lib/api';
import { getSession } from '@/lib/auth';
import { Commune } from '@/lib/types';

export default function EditVenuePage() {
  const params = useParams<{ id: string }>();
  const toast = useToast();
  const [communes, setCommunes] = useState<Commune[]>([]);
  const [dataError, setDataError] = useState<string | null>(null);
  const [capacityStr, setCapacityStr] = useState('');

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<VenueEditFormData>({
    resolver: zodResolver(venueEditSchema),
    defaultValues: { name: '', communeId: '', address: '', status: 'ACTIVE' },
  });

  const w = watch();
  const selectedCommune = communes.find((c) => c.id === w.communeId);

  useEffect(() => {
    const session = getSession();
    if (!session) return;

    Promise.all([getVenue(session.token, params.id), getCommunes(session.token)])
      .then(([venue, communeList]) => {
        setCommunes(communeList);
        reset({
          name: venue.name,
          communeId: venue.communeId ?? '',
          address: venue.address ?? '',
          status: venue.status as VenueEditFormData['status'],
        });
        setCapacityStr(venue.capacity != null ? String(venue.capacity) : '');
      })
      .catch((err) => {
        if (err instanceof ApiError && err.globallyHandled) return;
        setDataError(formatApiError(err));
      });
  }, [params.id, reset]);

  async function onSubmit(data: VenueEditFormData) {
    const session = getSession();
    if (!session) return;
    try {
      await updateVenue(session.token, params.id, {
        communeId: data.communeId || undefined,
        name: data.name,
        address: data.address || undefined,
        capacity: capacityStr ? Number(capacityStr) : undefined,
        status: data.status,
      });
      toast.success('Stade mis à jour.');
    } catch (err) {
      if (err instanceof ApiError && err.globallyHandled) return;
      toast.error('Mise à jour impossible', formatApiError(err));
    }
  }

  return (
    <PageShell
      eyebrow="Administration"
      title="Modifier un stade"
      description="Mettez à jour les informations du stade ou terrain."
    >
      <AdminGuard>
        <AdminNav />
        <section className="panel stack">
          {dataError && <div className="error">{dataError}</div>}
          <form className="form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="form__grid">
              <Controller
                name="communeId"
                control={control}
                render={({ field, fieldState }) => (
                  <SelectField
                    ref={field.ref}
                    label="Commune"
                    id="communeId"
                    value={field.value}
                    onBlur={field.onBlur}
                    onChange={(e) => field.onChange(e.target.value)}
                    error={fieldState.error?.message}
                  >
                    <option value="">— Non rattaché —</option>
                    {communes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                        {c.department
                          ? ` (${c.department.name}${c.department.region ? ` — ${c.department.region.name}` : ''})`
                          : ''}
                      </option>
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
                {isSubmitting ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </section>
      </AdminGuard>
    </PageShell>
  );
}
