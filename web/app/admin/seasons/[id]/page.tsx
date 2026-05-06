'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AdminGuard } from '@/components/admin-guard';
import { AdminNav } from '@/components/admin-nav';
import { PageShell } from '@/components/page-shell';
import { Field } from '@/components/form/Field';
import { useToast } from '@/components/ToastProvider';
import { seasonEditSchema, type SeasonFormData } from '@/lib/schemas';
import { ApiError, formatApiError, getSeasons, updateSeason } from '@/lib/api';
import { getSession } from '@/lib/auth';

export default function EditSeasonPage() {
  const params = useParams<{ id: string }>();
  const toast = useToast();
  const [dataError, setDataError] = useState<string | null>(null);
  const [activeLabel, setActiveLabel] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SeasonFormData>({
    resolver: zodResolver(seasonEditSchema),
    defaultValues: { name: '', year: new Date().getFullYear() },
  });

  const w = watch();

  useEffect(() => {
    const session = getSession();
    if (!session) return;

    getSeasons(session.token)
      .then((seasons) => {
        const season = seasons.find((s) => s.id === params.id);
        if (!season) { setDataError('Saison introuvable.'); return; }
        reset({ name: season.name, year: season.year });
        setActiveLabel(season.active ? 'En cours' : 'Terminée');
      })
      .catch((err) => {
        if (err instanceof ApiError && err.globallyHandled) return;
        setDataError(formatApiError(err));
      });
  }, [params.id, reset]);

  async function onSubmit(data: SeasonFormData) {
    const session = getSession();
    if (!session) return;
    try {
      await updateSeason(session.token, params.id, { name: data.name, year: data.year });
      toast.success('Saison mise à jour.');
    } catch (err) {
      if (err instanceof ApiError && err.globallyHandled) return;
      toast.error('Mise à jour impossible', formatApiError(err));
    }
  }

  return (
    <PageShell
      eyebrow="Administration"
      title="Modifier une saison"
      description="Mettez à jour le nom et l'année de la saison."
    >
      <AdminGuard>
        <AdminNav />
        <section className="panel">
          {dataError && <div className="error">{dataError}</div>}
          <form className="form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="form__grid">
              <Field
                label="Nom"
                id="name"
                required
                error={errors.name?.message}
                success={!!w.name && !errors.name}
                {...register('name')}
              />

              <Field
                label="Année"
                id="year"
                type="number"
                min={2020}
                max={2040}
                required
                error={errors.year?.message}
                success={!!w.year && !errors.year}
                {...register('year', { valueAsNumber: true })}
              />

              {activeLabel && (
                <Field label="Statut actuel" id="active-label" readOnly value={activeLabel} />
              )}
            </div>

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
