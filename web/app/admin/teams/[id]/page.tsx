'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AdminGuard } from '@/components/admin-guard';
import { AdminNav } from '@/components/admin-nav';
import { PageShell } from '@/components/page-shell';
import { Field } from '@/components/form/Field';
import { SelectField } from '@/components/form/SelectField';
import { useToast } from '@/components/ToastProvider';
import { teamEditSchema, type TeamEditFormData } from '@/lib/schemas';
import { ApiError, formatApiError, getTeam, updateTeam } from '@/lib/api';
import { getSession } from '@/lib/auth';

export default function EditTeamPage() {
  const params = useParams<{ id: string }>();
  const toast = useToast();
  const [dataError, setDataError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TeamEditFormData>({
    resolver: zodResolver(teamEditSchema),
    defaultValues: { name: '', category: 'SENIOR', status: 'ACTIVE' },
  });

  const w = watch();

  useEffect(() => {
    const session = getSession();
    if (!session) return;

    getTeam(session.token, params.id)
      .then((team) => {
        reset({ name: team.name, category: team.category ?? 'SENIOR', status: team.status as 'ACTIVE' | 'INACTIVE' | 'ARCHIVED' });
      })
      .catch((err) => {
        if (err instanceof ApiError && err.globallyHandled) return;
        setDataError(formatApiError(err));
      });
  }, [params.id, reset]);

  async function onSubmit(data: TeamEditFormData) {
    const session = getSession();
    if (!session) return;
    try {
      await updateTeam(session.token, params.id, {
        name: data.name,
        category: data.category,
        status: data.status,
      });
      toast.success('Équipe mise à jour.');
    } catch (err) {
      if (err instanceof ApiError && err.globallyHandled) return;
      toast.error('Mise à jour impossible', formatApiError(err));
    }
  }

  return (
    <PageShell
      eyebrow="Administration"
      title="Modifier une équipe"
      description="Mettez à jour les informations principales de l'équipe."
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

              <SelectField
                label="Catégorie sportive"
                id="category"
                required
                error={errors.category?.message}
                {...register('category')}
              >
                <option value="SENIOR">Senior</option>
                <option value="CADET">Cadet</option>
              </SelectField>

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
