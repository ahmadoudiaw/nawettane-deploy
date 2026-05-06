import Image from 'next/image';
import { LoginForm } from '@/components/login-form';
import { PageShell } from '@/components/page-shell';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;

  return (
    <PageShell
      eyebrow="Admin"
      title="Connexion à l’espace NAWETTANE"
      description="Utilisez un compte admin du seed pour accéder au tableau de bord, aux rapports et à la gestion des matchs."
    >
      <div className="split">
        <section className="panel">
          <div className="login-logo">
            <Image src="/logo.png" alt="Logo Nawettane" width={96} height={96} />
          </div>
          <LoginForm nextPath={params.next} />
        </section>

        <aside className="panel stack">
          <h3>Comptes de démo</h3>
          <p className="muted">Super admin: `superadmin@nawettane.sn`</p>
          <p className="muted">ONCAV: `oncav.admin@nawettane.sn`</p>
          <p className="muted">Mot de passe commun: `Nawettane2026!`</p>
        </aside>
      </div>
    </PageShell>
  );
}
