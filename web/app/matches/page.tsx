import { PageShell } from '@/components/page-shell';
import { PublicMatchList } from '@/components/public-match-list';

export default function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <PageShell
      eyebrow="Billetterie digitale"
      title="Matchs Nawettane"
      description="Choisissez votre affiche, comparez les catégories disponibles et achetez votre billet depuis votre téléphone en quelques secondes."
    >
      <PublicMatchList searchParams={searchParams} />
    </PageShell>
  );
}
