'use client';

import { useRef, useState } from 'react';
import { AdminGuard } from '@/components/admin-guard';
import { AdminNav } from '@/components/admin-nav';
import { PageShell } from '@/components/page-shell';
import {
  ApiError,
  formatApiError,
  downloadImportTemplate,
  importCommunes,
  importDepartments,
  importOdcav,
  importRegions,
  importTeams,
  importVenues,
  importZones,
} from '@/lib/api';
import { getSession } from '@/lib/auth';
import { ImportResult } from '@/lib/types';

function ImportSummary({ result }: { result: ImportResult }) {
  return (
    <div className="stack">
      <p>
        <strong>Total :</strong> {result.total} ligne{result.total !== 1 ? 's' : ''} —{' '}
        <strong>{result.created}</strong> créée{result.created !== 1 ? 's' : ''},{' '}
        <strong>{result.skipped}</strong> ignorée{result.skipped !== 1 ? 's' : ''} (doublon
        {result.skipped !== 1 ? 's' : ''}),{' '}
        <strong>{result.errors.length}</strong> erreur{result.errors.length !== 1 ? 's' : ''}.
      </p>
      {result.errors.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Ligne</th>
              <th>Erreur</th>
            </tr>
          </thead>
          <tbody>
            {result.errors.map((e) => (
              <tr key={e.row}>
                <td>{e.row}</td>
                <td>{e.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

type TemplateType = 'regions' | 'departments' | 'communes' | 'odcav' | 'zones' | 'venues' | 'teams';
type ImportFn = (token: string, file: File) => Promise<ImportResult>;

function useImport(fn: ImportFn) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    const file = fileRef.current?.files?.[0];
    if (!file) { setError('Veuillez sélectionner un fichier .xlsx ou .csv.'); return; }
    const session = getSession();
    if (!session) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await fn(session.token, file));
    } catch (err) {
      if (err instanceof ApiError && err.globallyHandled) return;
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }

  return { fileRef, result, error, loading, run };
}

function ImportBlock({
  title,
  hint,
  templateType,
  importer,
}: {
  title: string;
  hint: string;
  templateType: TemplateType;
  importer: ReturnType<typeof useImport>;
}) {
  const { fileRef, result, error, loading, run } = importer;
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    const session = getSession();
    if (!session) return;
    setDownloading(true);
    try { await downloadImportTemplate(session.token, templateType); } catch { /* silent */ } finally { setDownloading(false); }
  }

  return (
    <section className="panel stack">
      <div>
        <h2>{title}</h2>
        <p className="description">{hint}</p>
      </div>
      <div className="button-row">
        <button className="button button--secondary" disabled={downloading} onClick={handleDownload}>
          {downloading ? 'Téléchargement...' : 'Télécharger modèle .xlsx'}
        </button>
      </div>
      <div className="button-row">
        <input ref={fileRef} type="file" accept=".xlsx,.csv" />
        <button className="button button--primary" disabled={loading} onClick={run}>
          {loading ? 'Import en cours...' : 'Importer'}
        </button>
      </div>
      {error && <div className="error">{error}</div>}
      {result && (
        <div className={result.errors.length === 0 ? 'panel' : 'error'}>
          <ImportSummary result={result} />
        </div>
      )}
    </section>
  );
}

export default function ImportsPage() {
  const regions = useImport(importRegions);
  const departments = useImport(importDepartments);
  const communes = useImport(importCommunes);
  const odcav = useImport(importOdcav);
  const zones = useImport(importZones);
  const venues = useImport(importVenues);
  const teams = useImport(importTeams);

  return (
    <PageShell
      eyebrow="Administration"
      title="Imports"
      description="Importez des données en masse depuis un fichier Excel (.xlsx) ou CSV. Respectez l'ordre : Régions → Départements → Communes → ODCAV → Zones → Stades → Équipes."
    >
      <AdminGuard>
        <AdminNav />

        <ImportBlock
          title="Importer des Régions"
          hint="Colonnes : name | code (optionnel)"
          templateType="regions"
          importer={regions}
        />

        <ImportBlock
          title="Importer des Départements"
          hint="Colonnes : name | code (optionnel) | regionName"
          templateType="departments"
          importer={departments}
        />

        <ImportBlock
          title="Importer des Communes"
          hint="Colonnes : name | code (optionnel) | departmentName | regionName (optionnel, aide à disambiguïser)"
          templateType="communes"
          importer={communes}
        />

        <ImportBlock
          title="Importer des ODCAV"
          hint="Colonnes : name | departmentName | regionName (optionnel) | status (optionnel : ACTIVE, INACTIVE)"
          templateType="odcav"
          importer={odcav}
        />

        <ImportBlock
          title="Importer des Zones"
          hint="Colonnes : name | communeName | departmentName (optionnel) | regionName (optionnel) | odcavName (optionnel) | status (optionnel)"
          templateType="zones"
          importer={zones}
        />

        <ImportBlock
          title="Importer des Stades"
          hint="Colonnes : name | communeName | departmentName (optionnel) | regionName (optionnel) | address (optionnel) | capacity (optionnel) | status (optionnel)"
          templateType="venues"
          importer={venues}
        />

        <ImportBlock
          title="Importer des ASC / Équipes"
          hint="Colonnes : name | zoneName | communeName (optionnel) | departmentName (optionnel) | regionName (optionnel) | category (optionnel) | status (optionnel)"
          templateType="teams"
          importer={teams}
        />
      </AdminGuard>
    </PageShell>
  );
}
