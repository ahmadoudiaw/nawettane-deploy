import Link from 'next/link';
import { getPublicMatches } from '@/lib/api';
import { MatchCard } from './match-card';
import { MatchFilters } from '@/lib/types';

function getSingleParam(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function uniqueById<T extends { id: string }>(items: T[]) {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}

export async function PublicMatchList({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const filters: MatchFilters = {
    q: getSingleParam(resolvedSearchParams.q),
    departmentId: getSingleParam(resolvedSearchParams.departmentId),
    zoneId: getSingleParam(resolvedSearchParams.zoneId),
    seasonId: getSingleParam(resolvedSearchParams.seasonId),
    fromDate: getSingleParam(resolvedSearchParams.fromDate),
    toDate: getSingleParam(resolvedSearchParams.toDate),
  };

  const [matches, allMatches] = await Promise.all([
    getPublicMatches(filters),
    getPublicMatches(),
  ]);

  const seasons = uniqueById(allMatches.map((match) => match.season)).sort((a, b) =>
    b.year - a.year,
  );
  const zones = uniqueById(allMatches.map((match) => match.organization)).sort((a, b) =>
    a.name.localeCompare(b.name, 'fr'),
  );
  const departments = uniqueById(
    allMatches
      .map((match) => match.organization.department)
      .filter((department): department is NonNullable<typeof department> => Boolean(department)),
  ).sort((a, b) => a.name.localeCompare(b.name, 'fr'));

  return (
    <div className="stack">
      <form className="panel filters-panel" action="/matches" method="get">
        <div className="filters-grid">
          <div className="field">
            <label htmlFor="q">Recherche</label>
            <input
              id="q"
              name="q"
              placeholder="Equipe, zone, competition..."
              defaultValue={filters.q ?? ''}
            />
          </div>

          <div className="field">
            <label htmlFor="departmentId">Département</label>
            <select id="departmentId" name="departmentId" defaultValue={filters.departmentId ?? ''}>
              <option value="">Tous les départements</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="zoneId">Zone</label>
            <select id="zoneId" name="zoneId" defaultValue={filters.zoneId ?? ''}>
              <option value="">Toutes les zones</option>
              {zones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="seasonId">Saison</label>
            <select id="seasonId" name="seasonId" defaultValue={filters.seasonId ?? ''}>
              <option value="">Toutes les saisons</option>
              {seasons.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="fromDate">À partir du</label>
            <input
              id="fromDate"
              name="fromDate"
              type="date"
              defaultValue={filters.fromDate ?? ''}
            />
          </div>

          <div className="field">
            <label htmlFor="toDate">Jusqu’au</label>
            <input
              id="toDate"
              name="toDate"
              type="date"
              defaultValue={filters.toDate ?? ''}
            />
          </div>
        </div>

        <div className="button-row">
          <button className="button button--primary" type="submit">
            Filtrer
          </button>
          <Link className="button button--secondary" href="/matches">
            Effacer les filtres
          </Link>
        </div>
      </form>

      {matches.length === 0 ? (
        <div className="empty">Aucun match publié ne correspond à ces filtres.</div>
      ) : (
        <div className="grid grid--cards">
          {matches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      )}
    </div>
  );
}
