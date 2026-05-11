import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { createHmac } from 'crypto';
import {
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
  TicketStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const WAVE_API_URL = 'https://api.wave.com/v1';
const PAYMENT_CONFIG_ID = 'singleton';

@Injectable()
export class WaveService {
  private readonly logger = new Logger(WaveService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Initiate Wave checkout ──────────────────────────────────────────────

  async initiate(orderId: string): Promise<{ wave_launch_url: string; session_id: string }> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });

    if (!order) throw new NotFoundException('Commande introuvable.');
    if (order.status === OrderStatus.PAID) throw new BadRequestException('Cette commande est déjà payée.');
    if (order.status !== OrderStatus.PENDING) throw new BadRequestException('Cette commande ne peut plus être payée.');

    const config = await this.prisma.paymentConfig.findUnique({
      where: { id: PAYMENT_CONFIG_ID },
    });

    if (!config?.waveEnabled || !config.waveApiKey) {
      throw new BadRequestException('Le paiement Wave n\'est pas configuré.');
    }

    const amount = Math.round(Number(order.totalAmount)).toString();

    const successUrl =
      process.env.WAVE_SUCCESS_URL ??
      'https://nawettane-deploy-1.onrender.com/payment/success';
    const errorUrl =
      process.env.WAVE_ERROR_URL ??
      'https://nawettane-deploy-1.onrender.com/payment/error';

    const requestBody = {
      amount,
      currency: 'XOF',
      error_url: `${errorUrl}?order_id=${orderId}`,
      success_url: `${successUrl}?order_id=${orderId}`,
      client_reference: order.reference,
    };

    this.logger.log(
      `Wave initiate → orderId=${orderId} ref=${order.reference} amount=${amount} XOF`,
    );

    let response: Response;
    try {
      response = await fetch(`${WAVE_API_URL}/checkout/sessions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.waveApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
    } catch (err) {
      this.logger.error(`Wave API réseau KO: ${(err as Error).message}`);
      throw new BadRequestException('Erreur réseau lors de la connexion à Wave. Réessayez.');
    }

    const responseData = (await response.json()) as {
      id?: string;
      wave_launch_url?: string;
      message?: string;
      errors?: unknown;
    };

    if (!response.ok) {
      this.logger.error(
        `Wave API erreur HTTP ${response.status}: ${JSON.stringify(responseData)}`,
      );
      throw new BadRequestException(
        `Erreur Wave (${response.status}): ${responseData?.message ?? response.statusText}`,
      );
    }

    if (!responseData.wave_launch_url || !responseData.id) {
      this.logger.error(`Wave API réponse invalide: ${JSON.stringify(responseData)}`);
      throw new BadRequestException('Réponse Wave invalide. Contactez le support.');
    }

    this.logger.log(
      `Wave session créée → id=${responseData.id}`,
    );

    // Store session id in the payment record for traceability
    const wavePayment = order.payments.find(
      (p) => p.provider === PaymentProvider.WAVE_MOCK,
    );
    if (wavePayment) {
      await this.prisma.payment.update({
        where: { id: wavePayment.id },
        data: { providerReference: responseData.id },
      });
    }

    return {
      wave_launch_url: responseData.wave_launch_url,
      session_id: responseData.id,
    };
  }

  // ─── Handle Wave webhook ─────────────────────────────────────────────────

  async handleWebhook(
    rawBody: Buffer,
    signature: string,
  ): Promise<{ received: boolean }> {
    const secret = process.env.WAVE_WEBHOOK_SECRET;

    if (secret) {
      const expected = createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');

      if (!secret || signature !== expected) {
        this.logger.warn(`Wave webhook: signature invalide. received=${signature?.slice(0, 8)}…`);
        throw new BadRequestException('Signature webhook invalide.');
      }
    } else {
      this.logger.warn(
        'WAVE_WEBHOOK_SECRET non défini sur ce serveur — vérification de signature ignorée.',
      );
    }

    let event: { type: string; data: Record<string, unknown> };
    try {
      event = JSON.parse(rawBody.toString('utf-8')) as typeof event;
    } catch {
      throw new BadRequestException('Corps du webhook invalide.');
    }

    this.logger.log(`Wave webhook reçu: type=${event.type}`);

    if (event.type === 'checkout.session.completed') {
      const data = event.data as {
        client_reference?: string;
        id?: string;
        amount?: string;
        currency?: string;
      };

      this.logger.log(
        `Wave paiement confirmé → ref=${data.client_reference} session=${data.id} montant=${data.amount} ${data.currency}`,
      );

      if (!data.client_reference) {
        this.logger.warn('Webhook Wave sans client_reference — ignoré.');
        return { received: true };
      }

      await this.confirmByReference(data.client_reference, data.id ?? 'WAVE-WEBHOOK');
    }

    return { received: true };
  }

  // ─── Confirm order by reference (called from webhook) ───────────────────

  private async confirmByReference(reference: string, sessionId: string) {
    const order = await this.prisma.order.findFirst({
      where: { reference },
      include: {
        payments: true,
        tickets: true,
        ticketCategory: true,
      },
    });

    if (!order) {
      this.logger.warn(`Wave webhook: commande "${reference}" introuvable en base.`);
      return;
    }

    if (order.status === OrderStatus.PAID) {
      this.logger.log(`Wave webhook: commande "${reference}" déjà confirmée — ignoré.`);
      return;
    }

    const payment = order.payments.find(
      (p) => p.provider === PaymentProvider.WAVE_MOCK,
    );
    if (!payment) {
      this.logger.error(
        `Wave webhook: aucun enregistrement paiement WAVE pour la commande "${reference}".`,
      );
      return;
    }

    if (order.tickets.length > 0) {
      this.logger.warn(
        `Wave webhook: tickets déjà générés pour la commande "${reference}" — ignoré.`,
      );
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      const category = await tx.matchTicketCategory.findUnique({
        where: { id: order.ticketCategoryId },
      });
      if (!category) throw new Error('Catégorie de ticket introuvable.');

      if (category.quota !== null) {
        const remaining = category.quota - category.soldCount;
        if (order.quantity > remaining) {
          throw new Error(
            `Quota insuffisant: ${remaining} place(s) restante(s), commande de ${order.quantity}.`,
          );
        }
      }

      await tx.payment.update({
        where: { id: payment.id },
        data: {
          providerReference: sessionId,
          status: PaymentStatus.SUCCEEDED,
          paidAt: new Date(),
        },
      });

      await tx.payment.updateMany({
        where: {
          orderId: order.id,
          id: { not: payment.id },
          status: PaymentStatus.PENDING,
        },
        data: { status: PaymentStatus.CANCELLED },
      });

      await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.PAID },
      });

      await tx.matchTicketCategory.update({
        where: { id: order.ticketCategoryId },
        data: { soldCount: { increment: order.quantity } },
      });

      const ticketsData = Array.from({ length: order.quantity }, (_, i) => {
        const ticketCode = `TCK-${order.id.toUpperCase()}-${i + 1}`;
        return {
          orderId: order.id,
          matchId: order.matchId,
          ticketCategoryId: order.ticketCategoryId,
          ticketCode,
          qrPayload: JSON.stringify({
            ticketCode,
            orderId: order.id,
            matchId: order.matchId,
            ticketCategoryId: order.ticketCategoryId,
            ticketCategoryName: order.ticketCategory.name,
          }),
          holderName: order.buyerName,
          status: TicketStatus.GENERATED,
        };
      });

      await tx.ticket.createMany({ data: ticketsData });
    });

    this.logger.log(
      `Wave: commande "${reference}" confirmée — ${order.quantity} ticket(s) générés.`,
    );
  }

  // ─── Order status (for mobile polling) ──────────────────────────────────

  async getOrderStatus(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        reference: true,
        status: true,
        tickets: {
          select: { id: true, ticketCode: true, status: true },
        },
        payments: {
          select: { provider: true, status: true, providerReference: true },
        },
      },
    });

    if (!order) throw new NotFoundException('Commande introuvable.');
    return order;
  }
}
