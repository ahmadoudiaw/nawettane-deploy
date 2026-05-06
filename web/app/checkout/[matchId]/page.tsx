'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createOrder, confirmMockPayment, getPublicMatch, ApiError } from '@/lib/api';
import { Match } from '@/lib/types';
import { PageShell } from '@/components/page-shell';
import { formatCurrency } from '@/lib/format';

export default function CheckoutPage() {
  const params = useParams<{ matchId: string }>();
  const router = useRouter();
  const [match, setMatch] = useState<Match | null>(null);
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [ticketCategoryId, setTicketCategoryId] = useState('');
  const [provider, setProvider] = useState<'WAVE_MOCK' | 'ORANGE_MONEY_MOCK'>('WAVE_MOCK');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPublicMatch(params.matchId)
      .then((response) => {
        setMatch(response);
        setTicketCategoryId(response.ticketCategories[0]?.id ?? '');
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Impossible de charger le match.');
      });
  }, [params.matchId]);

  const selectedCategory =
    match?.ticketCategories.find((category) => category.id === ticketCategoryId) ?? null;
  const total = selectedCategory ? Number(selectedCategory.price) * quantity : 0;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const order = await createOrder({
        matchId: params.matchId,
        ticketCategoryId,
        buyerName,
        buyerPhone,
        buyerEmail: buyerEmail || undefined,
        quantity,
      });

      const confirmation = await confirmMockPayment(order.id, provider);
      const firstTicket = confirmation.order.tickets?.[0];

      if (!firstTicket) {
        throw new Error('Aucun ticket généré après le paiement.');
      }

      router.push(`/tickets/${firstTicket.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`${err.message} (${err.status})`);
      } else {
        setError(err instanceof Error ? err.message : 'Paiement impossible.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageShell
      eyebrow="Achat"
      title="Réserver vos billets"
      description="Sélectionnez votre catégorie, renseignez vos coordonnées et confirmez le paiement mobile de démonstration."
    >
      <div className="split split--checkout">
        <section className="panel stack checkout-panel">
          {match ? (
            <>
              <div>
                <h2 style={{ marginBottom: 8 }}>
                  {match.homeTeam.name} vs {match.awayTeam.name}
                </h2>
                <p className="muted">{match.organization.name}</p>
              </div>
              <div className="meta">
                <span className="pill">
                  Des {formatCurrency(match.ticketCategories[0]?.price ?? match.ticketPrice)}
                </span>
                <span className="pill">{match.season.name}</span>
              </div>
            </>
          ) : (
            <div className="panel">Chargement du match...</div>
          )}

          {match ? (
            <div className="category-picker">
              {match.ticketCategories.map((category) => {
                const active = category.id === ticketCategoryId;
                const remaining = category.quota - category.soldCount;

                return (
                  <button
                    key={category.id}
                    className={`category-option${active ? ' category-option--active' : ''}`}
                    type="button"
                    onClick={() => setTicketCategoryId(category.id)}
                  >
                    <div className="category-option__header">
                      <span
                        className="category-dot"
                        style={{ backgroundColor: category.badgeColor }}
                      />
                      <strong>{category.name}</strong>
                    </div>
                    <div className="category-option__price">
                      {formatCurrency(category.price)}
                    </div>
                    <div className="muted">{remaining} places restantes</div>
                  </button>
                );
              })}
            </div>
          ) : null}

          <form className="form" onSubmit={handleSubmit}>
            <div className="form__grid">
              <div className="field">
                <label htmlFor="buyerName">Nom complet</label>
                <input
                  id="buyerName"
                  required
                  value={buyerName}
                  onChange={(event) => setBuyerName(event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="buyerPhone">Téléphone</label>
                <input
                  id="buyerPhone"
                  required
                  value={buyerPhone}
                  onChange={(event) => setBuyerPhone(event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="buyerEmail">Email</label>
                <input
                  id="buyerEmail"
                  type="email"
                  value={buyerEmail}
                  onChange={(event) => setBuyerEmail(event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="quantity">Quantité</label>
                <select
                  id="quantity"
                  value={quantity}
                  onChange={(event) => setQuantity(Number(event.target.value))}
                >
                  {[1, 2, 3, 4, 5].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="provider">Mode de paiement</label>
                <select
                  id="provider"
                  value={provider}
                  onChange={(event) =>
                    setProvider(event.target.value as 'WAVE_MOCK' | 'ORANGE_MONEY_MOCK')
                  }
                >
                  <option value="WAVE_MOCK">Wave</option>
                  <option value="ORANGE_MONEY_MOCK">Orange Money</option>
                </select>
              </div>
            </div>

            {error ? <div className="error">{error}</div> : null}

            <div className="button-row">
              <button className="button button--accent" disabled={loading} type="submit">
                {loading ? 'Traitement...' : `Payer ${formatCurrency(total)}`}
              </button>
            </div>
          </form>
        </section>

        <aside className="panel mobile-summary">
          <h3>Résumé</h3>
          <p className="muted">Démo sans paiement réel.</p>
          {selectedCategory ? (
            <div className="summary-card">
              <div className="summary-card__row">
                <span>Catégorie</span>
                <strong>{selectedCategory.name}</strong>
              </div>
              <div className="summary-card__row">
                <span>Prix unitaire</span>
                <strong>{formatCurrency(selectedCategory.price)}</strong>
              </div>
              <div className="summary-card__row">
                <span>Quantité</span>
                <strong>{quantity}</strong>
              </div>
            </div>
          ) : null}
          <div className="stat">
            <span className="stat__label">Montant total</span>
            <span className="stat__value">{formatCurrency(total)}</span>
          </div>
        </aside>
      </div>
    </PageShell>
  );
}
