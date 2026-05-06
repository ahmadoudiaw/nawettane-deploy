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
import { useToast } from '@/components/ToastProvider';
import { userEditSchema, type UserEditFormData } from '@/lib/schemas';
import { ApiError, formatApiError, getOrganizationsTree, getUser, updateUser } from '@/lib/api';
import { getSession } from '@/lib/auth';
import { Organization, Role } from '@/lib/types';

const ADMIN_ROLES: Role[] = [
  'SUPER_ADMIN', 'ONCAV_ADMIN', 'ORCAV_ADMIN', 'ODCAV_ADMIN',
  'ZONE_ADMIN', 'GUICHET_AGENT', 'AGENT_MAIRIE',
];

function flattenOrganizations(nodes: Organization[]): Organization[] {
  return nodes.flatMap((n) => [n, ...(n.children ? flattenOrganizations(n.children) : [])]);
}

export default function EditUserPage() {
  const params = useParams<{ id: string }>();
  const toast = useToast();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [dataError, setDataError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UserEditFormData>({
    resolver: zodResolver(userEditSchema),
    defaultValues: {
      fullName: '', email: '', phone: '', password: '',
      role: 'ZONE_ADMIN', status: 'ACTIVE', organizationId: '',
    },
  });

  const w = watch();

  useEffect(() => {
    const session = getSession();
    if (!session) return;

    Promise.all([getOrganizationsTree(session.token), getUser(session.token, params.id)])
      .then(([tree, user]) => {
        setOrganizations(flattenOrganizations(tree));
        reset({
          fullName: user.fullName,
          email: user.email ?? '',
          phone: user.phone,
          password: '',
          role: user.role as UserEditFormData['role'],
          status: user.status as UserEditFormData['status'],
          organizationId: user.organizationAssignments[0]?.organizationId ?? '',
        });
      })
      .catch((err) => {
        if (err instanceof ApiError && err.globallyHandled) return;
        setDataError(formatApiError(err));
      });
  }, [params.id, reset]);

  async function onSubmit(data: UserEditFormData) {
    const session = getSession();
    if (!session) return;
    try {
      await updateUser(session.token, params.id, {
        fullName: data.fullName,
        email: data.email || undefined,
        phone: data.phone,
        password: data.password || undefined,
        role: data.role,
        status: data.status,
        organizationIds: data.organizationId ? [data.organizationId] : undefined,
      });
      toast.success('Utilisateur mis à jour.');
    } catch (err) {
      if (err instanceof ApiError && err.globallyHandled) return;
      toast.error('Mise à jour impossible', formatApiError(err));
    }
  }

  return (
    <PageShell
      eyebrow="Administration"
      title="Modifier un utilisateur"
      description="Mettez à jour le rôle, le statut et le périmètre d'un compte admin."
    >
      <AdminGuard>
        <AdminNav />
        <section className="panel">
          {dataError && <div className="error">{dataError}</div>}
          <form className="form" onSubmit={handleSubmit(onSubmit)} noValidate>
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
                label="Nouveau mot de passe"
                id="password"
                type="password"
                helper="Laisser vide pour ne pas modifier."
                error={errors.password?.message}
                {...register('password')}
              />

              <SelectField
                label="Rôle"
                id="role"
                error={errors.role?.message}
                {...register('role')}
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

              <Controller
                name="organizationId"
                control={control}
                render={({ field, fieldState }) => (
                  <SelectField
                    ref={field.ref}
                    label="Périmètre"
                    id="organizationId"
                    value={field.value ?? ''}
                    onBlur={field.onBlur}
                    onChange={(e) => field.onChange(e.target.value)}
                    error={fieldState.error?.message}
                  >
                    <option value="">Aucun périmètre</option>
                    {organizations.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name} ({o.type})
                      </option>
                    ))}
                  </SelectField>
                )}
              />
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
