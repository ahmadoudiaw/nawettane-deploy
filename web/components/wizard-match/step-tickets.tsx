'use client';

import { BADGE_COLORS, type WizardCategory } from './types';
import type { StepProps } from './types';

function newCategory(index: number): WizardCategory {
  return {
    _id: `cat-${Date.now()}-${index}`,
    name: `Catégorie ${index + 1}`,
    price: '1000',
    quota: '100',
    badgeColor: BADGE_COLORS[index % BADGE_COLORS.length],
  };
}

export function StepTickets({ data, onChange, errors }: StepProps) {
  const cats = data.categories;

  function update(i: number, patch: Partial<WizardCategory>) {
    onChange({
      categories: cats.map((c, idx) => (idx === i ? { ...c, ...patch } : c)),
    });
  }

  function remove(i: number) {
    onChange({ categories: cats.filter((_, idx) => idx !== i) });
  }

  function add() {
    onChange({ categories: [...cats, newCategory(cats.length)] });
  }

  return (
    <div className="stack">
      <div className="wiz-tickets-toolbar">
        <div>
          <div className="wiz-section-label">Catégories de billets</div>
          {errors._categories && (
            <p className="field__error-msg" style={{ marginTop: 4 }}>{errors._categories}</p>
          )}
        </div>
        <button type="button" className="button button--secondary" onClick={add}>
          + Ajouter
        </button>
      </div>

      <div className="stack" style={{ gap: 12 }}>
        {cats.map((cat, i) => (
          <div key={cat._id} className="wiz-cat-row">
            <div className="wiz-cat-row__color">
              <div
                className="wiz-cat-row__swatch"
                style={{ background: cat.badgeColor }}
              />
              <div className="wiz-palette">
                {BADGE_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`wiz-palette__dot${cat.badgeColor === color ? ' wiz-palette__dot--active' : ''}`}
                    style={{ background: color }}
                    onClick={() => update(i, { badgeColor: color })}
                    aria-label={color}
                  />
                ))}
              </div>
            </div>

            <div className="wiz-cat-row__fields">
              <div className="field">
                <label htmlFor={`cat-name-${i}`}>Nom</label>
                <input
                  id={`cat-name-${i}`}
                  value={cat.name}
                  onChange={(e) => update(i, { name: e.target.value })}
                  aria-invalid={errors[`cat_${i}_name`] ? 'true' : undefined}
                />
                {errors[`cat_${i}_name`] && (
                  <p className="field__error-msg">{errors[`cat_${i}_name`]}</p>
                )}
              </div>

              <div className="field">
                <label htmlFor={`cat-price-${i}`}>Prix (FCFA)</label>
                <input
                  id={`cat-price-${i}`}
                  type="number"
                  min={1}
                  value={cat.price}
                  onChange={(e) => update(i, { price: e.target.value })}
                  aria-invalid={errors[`cat_${i}_price`] ? 'true' : undefined}
                />
                {errors[`cat_${i}_price`] && (
                  <p className="field__error-msg">{errors[`cat_${i}_price`]}</p>
                )}
              </div>

              <div className="field">
                <label htmlFor={`cat-quota-${i}`}>
                  Quantité disponible{' '}
                  <span style={{ fontWeight: 400, color: 'var(--muted)', fontSize: 11 }}>(optionnel)</span>
                </label>
                <input
                  id={`cat-quota-${i}`}
                  type="number"
                  min={1}
                  placeholder="Illimité"
                  value={cat.quota}
                  onChange={(e) => update(i, { quota: e.target.value })}
                  aria-invalid={errors[`cat_${i}_quota`] ? 'true' : undefined}
                />
                {errors[`cat_${i}_quota`] && (
                  <p className="field__error-msg">{errors[`cat_${i}_quota`]}</p>
                )}
              </div>
            </div>

            {cats.length > 1 && (
              <button
                type="button"
                className="wiz-cat-row__remove"
                onClick={() => remove(i)}
                aria-label="Supprimer cette catégorie"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

    </div>
  );
}
