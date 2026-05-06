'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AdminGuard } from '@/components/admin-guard';
import { AdminNav } from '@/components/admin-nav';
import { PageShell } from '@/components/page-shell';
import { Field } from '@/components/form/Field';
import { SelectField } from '@/components/form/SelectField';
import { useToast } from '@/components/ToastProvider';
import { seasonSchema, type SeasonFormData } from '@/lib/schemas';
import { ApiError, formatApiError, createSeason } from '@/lib/api';
import { getSession } from '@/lib/auth';

export default function NewSeasonPage() {
  const toast = useToast();
  const currentYear = new Date().getFullYear();
  const [active, setActive] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SeasonFormData>({
    resolver: zodResolver(seasonSchema),
    defaultValues: { name: `Saison Nawettane ${currentYear}`, year: currentYear },
  });

  const w = watch();

  async function onSubmit(data: SeasonFormData) {
    const session = getSession();
    if (!session) return;
    try {
      const season = await createSeason(session.token, {
        name: data.name,
        year: data.year,
        active,
      });
      toast.success(`Saison créée : ${season.name}`);
      reset({ name: '', year: currentYear });
      setActive(false);
    } catch (err) {
      if (err instanceof ApiError && err.globallyHandled) return;
      toast.error('Création impossible', formatApiError(err));
    }
  }

  return (
    <PageShell
      eyebrow="Administration"
      title="Nouvelle saison"
      description="Créez une saison pour regrouper les matchs Nawettane d'une même année."
    >
      <AdminGuard>
        <AdminNav />
        <section className="panel stack">
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

              <SelectField
                label="Activer immédiatement"
                id="active"
                value={active ? 'true' : 'false'}
                onChange={(e) => setActive(e.target.value === 'true')}
              >
                <option value="false">Non</option>
                <option value="true">Oui (désactive les autres)</option>
              </SelectField>
            </div>

            <div className="button-row">
              <button className="button button--primary" disabled={isSubmitting} type="submit">
                {isSubmitting ? 'Création…' : 'Créer la saison'}
              </button>
            </div>
          </form>
        </section>
      </AdminGuard>
    </PageShell>
  );
}
