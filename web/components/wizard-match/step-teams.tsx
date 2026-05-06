'use client';

import { useMemo } from 'react';
import { SelectField } from '@/components/form/SelectField';
import type { StepProps } from './types';
import type { Organization } from '@/lib/types';

function zoneLabel(z: Organization): string {
  return z.commune ? `${z.name} — ${z.commune.name}` : z.name;
}

export function StepTeams({ data, onChange, errors, refData }: StepProps) {
  const { regions, odcavs, zones, teams } = refData;

  const deptIdsByRegion = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const d of refData.departments) {
      if (!m.has(d.regionId)) m.set(d.regionId, new Set());
      m.get(d.regionId)!.add(d.id);
    }
    return m;
  }, [refData.departments]);

  function odcavsFor(regionId: string): Organization[] {
    if (!regionId) return odcavs;
    const deptIds = deptIdsByRegion.get(regionId) ?? new Set<string>();
    return odcavs.filter((o) => !o.departmentId || deptIds.has(o.departmentId));
  }

  function zonesFor(odcavId: string, regionId: string): Organization[] {
    if (odcavId) return zones.filter((z) => z.parentId === odcavId);
    if (regionId) return zones.filter((z) => z.commune?.department?.region?.id === regionId);
    return zones;
  }

  function teamsFor(zoneId: string) {
    if (!zoneId) return [];
    return teams.filter((t) => t.organizationId === zoneId);
  }

  const homeOdcavOptions = odcavsFor(data.homeRegionId);
  const homeZoneOptions = zonesFor(data.homeOdcavId, data.homeRegionId);
  const homeTeamOptions = teamsFor(data.homeZoneId);

  const awayOdcavOptions = odcavsFor(data.awayRegionId);
  const awayZoneOptions = zonesFor(data.awayOdcavId, data.awayRegionId);
  const awayTeamOptions = teamsFor(data.awayZoneId);

  return (
    <div className="wiz-teams-grid">
      {/* ── Équipe domicile ── */}
      <div className="wiz-team-panel">
        <div className="wiz-team-panel__badge wiz-team-panel__badge--home">Domicile</div>
        <div className="stack" style={{ gap: 14 }}>
          <SelectField
            label="Région"
            id="homeRegionId"
            value={data.homeRegionId}
            onChange={(e) => onChange({
              homeRegionId: e.target.value,
              homeOdcavId: '',
              homeZoneId: '',
              homeTeamId: '',
            })}
          >
            <option value="">— Toutes —</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </SelectField>

          <SelectField
            label="ODCAV"
            id="homeOdcavId"
            value={data.homeOdcavId}
            onChange={(e) => onChange({
              homeOdcavId: e.target.value,
              homeZoneId: '',
              homeTeamId: '',
            })}
          >
            <option value="">— Tous —</option>
            {homeOdcavOptions.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </SelectField>

          <SelectField
            label="Zone"
            id="homeZoneId"
            required
            value={data.homeZoneId}
            onChange={(e) => onChange({ homeZoneId: e.target.value, homeTeamId: '' })}
            error={errors.homeZoneId}
            success={!!data.homeZoneId && !errors.homeZoneId}
          >
            <option value="">— Choisir une zone —</option>
            {homeZoneOptions.map((z) => (
              <option key={z.id} value={z.id}>{zoneLabel(z)}</option>
            ))}
          </SelectField>

          <SelectField
            label="Équipe domicile"
            id="homeTeamId"
            required
            disabled={!data.homeZoneId}
            value={data.homeTeamId}
            onChange={(e) => onChange({ homeTeamId: e.target.value })}
            error={errors.homeTeamId}
            success={!!data.homeTeamId && !errors.homeTeamId}
          >
            <option value="">— Choisir une équipe —</option>
            {homeTeamOptions.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </SelectField>
        </div>
      </div>

      <div className="wiz-teams-vs">VS</div>

      {/* ── Équipe extérieure ── */}
      <div className="wiz-team-panel">
        <div className="wiz-team-panel__badge wiz-team-panel__badge--away">Extérieur</div>
        <div className="stack" style={{ gap: 14 }}>
          <SelectField
            label="Région"
            id="awayRegionId"
            value={data.awayRegionId}
            onChange={(e) => onChange({
              awayRegionId: e.target.value,
              awayOdcavId: '',
              awayZoneId: '',
              awayTeamId: '',
            })}
          >
            <option value="">— Toutes —</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </SelectField>

          <SelectField
            label="ODCAV"
            id="awayOdcavId"
            value={data.awayOdcavId}
            onChange={(e) => onChange({
              awayOdcavId: e.target.value,
              awayZoneId: '',
              awayTeamId: '',
            })}
          >
            <option value="">— Tous —</option>
            {awayOdcavOptions.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </SelectField>

          <SelectField
            label="Zone"
            id="awayZoneId"
            required
            value={data.awayZoneId}
            onChange={(e) => onChange({ awayZoneId: e.target.value, awayTeamId: '' })}
            error={errors.awayZoneId}
            success={!!data.awayZoneId && !errors.awayZoneId}
          >
            <option value="">— Choisir une zone —</option>
            {awayZoneOptions.map((z) => (
              <option key={z.id} value={z.id}>{zoneLabel(z)}</option>
            ))}
          </SelectField>

          <SelectField
            label="Équipe extérieure"
            id="awayTeamId"
            required
            disabled={!data.awayZoneId}
            value={data.awayTeamId}
            onChange={(e) => onChange({ awayTeamId: e.target.value })}
            error={errors.awayTeamId}
            success={!!data.awayTeamId && !errors.awayTeamId}
          >
            <option value="">— Choisir une équipe —</option>
            {awayTeamOptions.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </SelectField>
        </div>
      </div>
    </div>
  );
}
