'use client';

import { useMemo } from 'react';
import { SelectField } from '@/components/form/SelectField';
import { formatCurrency } from '@/lib/format';
import type { StepProps } from './types';

export function StepVenue({ data, onChange, errors, refData, venueAvailability, venueAvailabilityLoading }: StepProps) {
  const { regions, departments, communes, venues } = refData;

  const deptOptions = useMemo(
    () => data.venueRegionId ? departments.filter((d) => d.regionId === data.venueRegionId) : departments,
    [data.venueRegionId, departments],
  );

  const communeOptions = useMemo(
    () => data.venueDeptId ? communes.filter((c) => c.departmentId === data.venueDeptId) : communes,
    [data.venueDeptId, communes],
  );

  const venueOptions = useMemo(
    () => data.venueCommuneId ? venues.filter((v) => v.communeId === data.venueCommuneId) : venues,
    [data.venueCommuneId, venues],
  );

  const selectedVenue = venues.find((v) => v.id === data.venueId);

  return (
    <div className="stack">
      <div className="wiz-section-label">Localisation du stade</div>
      <div className="form__grid">
        <SelectField
          label="Région"
          id="venueRegionId"
          value={data.venueRegionId}
          onChange={(e) => onChange({
            venueRegionId: e.target.value,
            venueDeptId: '',
            venueCommuneId: '',
            venueId: '',
          })}
        >
          <option value="">— Toutes les régions —</option>
          {regions.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </SelectField>

        <SelectField
          label="Département"
          id="venueDeptId"
          value={data.venueDeptId}
          onChange={(e) => onChange({
            venueDeptId: e.target.value,
            venueCommuneId: '',
            venueId: '',
          })}
        >
          <option value="">— Tous les départements —</option>
          {deptOptions.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </SelectField>

        <SelectField
          label="Commune"
          id="venueCommuneId"
          value={data.venueCommuneId}
          onChange={(e) => onChange({ venueCommuneId: e.target.value, venueId: '' })}
        >
          <option value="">— Toutes les communes —</option>
          {communeOptions.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </SelectField>

        <SelectField
          label="Stade"
          id="venueId"
          required
          value={data.venueId}
          onChange={(e) => onChange({ venueId: e.target.value })}
          error={errors.venueId}
          success={!!data.venueId && !errors.venueId}
        >
          <option value="">— Choisir un stade —</option>
          {venueOptions.map((v) => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </SelectField>
      </div>

      {selectedVenue && (
        <div className="wiz-venue-info">
          <span className="wiz-venue-info__icon" aria-hidden>🏟️</span>
          <div>
            <div className="wiz-venue-info__name">{selectedVenue.name}</div>
            <div className="wiz-venue-info__details">
              {selectedVenue.address && <span>{selectedVenue.address}</span>}
              {selectedVenue.capacity && (
                <span>{selectedVenue.capacity.toLocaleString('fr-FR')} places</span>
              )}
            </div>
          </div>
        </div>
      )}

      {data.venueId && data.matchDate && (
        <div
          className={`wiz-avail${
            venueAvailabilityLoading
              ? ' wiz-avail--loading'
              : venueAvailability?.available === false
              ? ' wiz-avail--conflict'
              : venueAvailability?.available
              ? ' wiz-avail--ok'
              : ' wiz-avail--loading'
          }`}
          role="status"
          aria-live="polite"
        >
          {venueAvailabilityLoading ? (
            <>
              <span className="wiz-avail__icon" aria-hidden>⏳</span>
              <span>Vérification de disponibilité…</span>
            </>
          ) : venueAvailability ? (
            <>
              <span className="wiz-avail__icon" aria-hidden>
                {venueAvailability.available ? '✓' : '⚠'}
              </span>
              <span>{venueAvailability.message}</span>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
