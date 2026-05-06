'use client';

import { Field } from '@/components/form/Field';
import { SelectField } from '@/components/form/SelectField';
import type { StepProps } from './types';

export function StepGeneral({ data, onChange, errors, refData }: StepProps) {
  return (
    <div className="stack">
      <div className="wiz-section-label">Informations générales</div>
      <div className="form__grid">
        <SelectField
          label="Saison"
          id="seasonId"
          required
          value={data.seasonId}
          onChange={(e) => onChange({ seasonId: e.target.value })}
          error={errors.seasonId}
          success={!!data.seasonId && !errors.seasonId}
        >
          <option value="">— Choisir une saison —</option>
          {refData.seasons.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </SelectField>

        <Field
          label="Nom de la compétition"
          id="competitionName"
          required
          value={data.competitionName}
          onChange={(e) => onChange({ competitionName: e.target.value })}
          error={errors.competitionName}
          success={!!data.competitionName && !errors.competitionName}
        />

        <SelectField
          label="Catégorie sportive"
          id="category"
          required
          value={data.category}
          onChange={(e) => onChange({ category: e.target.value })}
          error={errors.category}
          success={!!data.category && !errors.category}
        >
          <option value="">— Choisir —</option>
          <option value="SENIOR">Senior</option>
          <option value="CADET">Cadet</option>
        </SelectField>

        <Field
          label="Phase"
          id="stage"
          placeholder="Poule, Huitième, Finale…"
          value={data.stage}
          onChange={(e) => onChange({ stage: e.target.value })}
          error={errors.stage}
        />
      </div>

      <div className="wiz-section-label" style={{ marginTop: 8 }}>Date & heure</div>
      <div className="form__grid">
        <Field
          label="Date du match"
          id="matchDate"
          type="date"
          required
          value={data.matchDate}
          onChange={(e) => onChange({ matchDate: e.target.value })}
          error={errors.matchDate}
          success={!!data.matchDate && !errors.matchDate}
        />

        <Field
          label="Heure du match"
          id="matchTime"
          type="time"
          required
          value={data.matchTime}
          onChange={(e) => onChange({ matchTime: e.target.value })}
          error={errors.matchTime}
          success={!!data.matchTime && !errors.matchTime}
        />
      </div>
    </div>
  );
}
