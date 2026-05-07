import { PageShell } from '@/components/page-shell';
import { QrCode } from '@/components/qr-code';
import { getTicket } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/format';

export default async function TicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ticket = await getTicket(id);

  return (
    <PageShell
      eyebrow="Billet généré"
      title={`Ticket ${ticket.ticketCode}`}
      description="Votre billet de démonstration est prêt. Présentez ce code au contrôle ou testez-le sur l’écran scan."
    >
      <div className="split split--ticket">
        <section className="panel stack ticket-screen">
          <div className="card card--contrast">
            <h2>{ticket.holderName ?? 'Supporter'}</h2>
            <p className="muted">{ticket.match?.competitionName}</p>
            <div className="meta">
              <span className="pill">{ticket.status}</span>
              {ticket.ticketCategory ? (
                <span
                  className="pill"
                  style={{
                    backgroundColor: `${ticket.ticketCategory.badgeColor}1A`,
                    color: ticket.ticketCategory.badgeColor,
                  }}
                >
                  {ticket.ticketCategory.name}
                </span>
              ) : null}
              {ticket.ticketCategory ? (
                <span className="pill pill--warn">
                  {formatCurrency(ticket.ticketCategory.price)}
                </span>
              ) : null}
            </div>
          </div>

          <div className="ticket-detail-card">
            <h3>Détails</h3>
            <p className="muted">Code ticket: {ticket.ticketCode}</p>
            <p className="muted">QR payload: {ticket.qrPayload}</p>
            {ticket.ticketCategory ? (
              <p className="muted">Catégorie: {ticket.ticketCategory.name}</p>
            ) : null}
            {ticket.match ? (
              <>
                <p className="muted">
                  Match: {ticket.match.homeTeam?.name} vs {ticket.match.awayTeam?.name}
                </p>
                <p className="muted">Date: {formatDate(ticket.match.matchDate)}</p>
                <p className="muted">Zone: {ticket.match.organization?.name}</p>
              </>
            ) : null}
          </div>
        </section>

        <aside className="panel stack ticket-qr-panel">
          <div className="card" style={{ alignItems: 'center', textAlign: 'center' }}>
            <h3>QR de démo</h3>
            <QrCode value={ticket.qrPayload ?? ticket.ticketCode} size={200} />
            <p className="muted" style={{ marginTop: '12px', fontSize: '0.75rem', wordBreak: 'break-all' }}>
              {ticket.ticketCode}
            </p>
          </div>
        </aside>
      </div>
    </PageShell>
  );
}
