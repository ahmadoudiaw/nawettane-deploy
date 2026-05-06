'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Field } from '@/components/form/Field';
import { PasswordField } from '@/components/form/PasswordField';
import { useToast } from '@/components/ToastProvider';
import { loginSchema, type LoginFormData } from '@/lib/schemas';
import { ApiError, loginAdmin } from '@/lib/api';
import { saveSession } from '@/lib/auth';

export function LoginForm({ nextPath }: { nextPath?: string }) {
  const router = useRouter();
  const toast = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, dirtyFields },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: 'superadmin@nawettane.sn',
      password: 'Nawettane2026!',
    },
  });

  async function onSubmit(data: LoginFormData) {
    try {
      const response = await loginAdmin(data.identifier, data.password);
      saveSession(response);
      toast.success('Connecté', 'Redirection vers le tableau de bord…');
      router.push(nextPath ?? '/admin/dashboard');
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? `${err.message} (${err.status})`
          : err instanceof Error
            ? err.message
            : 'Connexion impossible.';
      toast.error('Échec de connexion', msg);
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <Field
        label="Email ou téléphone"
        id="identifier"
        autoComplete="username"
        error={errors.identifier?.message}
        success={dirtyFields.identifier && !errors.identifier}
        {...register('identifier')}
      />

      <PasswordField
        label="Mot de passe"
        id="password"
        autoComplete="current-password"
        error={errors.password?.message}
        success={dirtyFields.password && !errors.password}
        {...register('password')}
      />

      <div className="button-row">
        <button
          className="button button--primary button--large"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? 'Connexion…' : 'Se connecter'}
        </button>
      </div>
    </form>
  );
}
