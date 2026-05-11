import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  OrderStatus,
  PaymentStatus,
  Prisma,
  TicketStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MockConfirmPaymentDto } from './dto/mock-confirm-payment.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async mockConfirm(orderId: string, dto: MockConfirmPaymentDto) {
    if (process.env.ALLOW_MOCK_PAYMENTS !== 'true') {
      this.logger.warn(
        `mock-confirm refusé pour orderId=${orderId} — ALLOW_MOCK_PAYMENTS non activé.`,
      );
      throw new ForbiddenException(
        'Les paiements mock sont désactivés en production. Définir ALLOW_MOCK_PAYMENTS=true en développement uniquement.',
      );
    }

    this.logger.log(
      `[MOCK] Confirmation paiement → orderId=${orderId} provider=${dto.provider}`,
    );

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        payments: true,
        tickets: true,
        ticketCategory: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    if (order.status === OrderStatus.PAID) {
      this.logger.log(`[MOCK] Commande ${orderId} déjà payée — retour immédiat.`);
      return order;
    }

    const payment = order.payments.find((item) => item.provider === dto.provider);

    if (!payment) {
      throw new NotFoundException('Payment record not found for this provider.');
    }

    if (order.tickets.length > 0) {
      throw new BadRequestException('Tickets already generated for this order.');
    }

    return this.prisma.$transaction(async (tx) => {
      const category = await tx.matchTicketCategory.findUnique({
        where: { id: order.ticketCategoryId },
      });

      if (!category) {
        throw new NotFoundException('Ticket category not found for this order.');
      }

      if (category.quota !== null) {
        const remainingQuota = category.quota - category.soldCount;
        if (order.quantity > remainingQuota) {
          throw new BadRequestException('Not enough tickets remaining for this category.');
        }
      }

      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          providerReference:
            dto.providerReference ?? `MOCK-${dto.provider}-${Date.now()}`,
          status: PaymentStatus.SUCCEEDED,
          paidAt: new Date(),
        },
      });

      await tx.payment.updateMany({
        where: {
          orderId,
          id: { not: payment.id },
          status: PaymentStatus.PENDING,
        },
        data: { status: PaymentStatus.CANCELLED },
      });

      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.PAID },
      });

      await tx.matchTicketCategory.update({
        where: { id: order.ticketCategoryId },
        data: { soldCount: { increment: updatedOrder.quantity } },
      });

      const ticketsData = Array.from({ length: updatedOrder.quantity }, (_, index) => {
        const ticketCode = `TCK-${updatedOrder.id.toUpperCase()}-${index + 1}`;
        return {
          orderId: updatedOrder.id,
          matchId: updatedOrder.matchId,
          ticketCategoryId: order.ticketCategoryId,
          ticketCode,
          qrPayload: JSON.stringify({
            ticketCode,
            orderId: updatedOrder.id,
            matchId: updatedOrder.matchId,
            ticketCategoryId: order.ticketCategoryId,
            ticketCategoryName: order.ticketCategory.name,
          }),
          holderName: updatedOrder.buyerName,
          status: TicketStatus.GENERATED,
        };
      });

      await tx.ticket.createMany({ data: ticketsData });

      this.logger.log(
        `[MOCK] ${updatedOrder.quantity} ticket(s) générés pour commande ${orderId}.`,
      );

      const result = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          payments: true,
          tickets: true,
          ticketCategory: true,
          match: {
            include: {
              ticketCategories: {
                orderBy: [{ price: 'asc' }, { name: 'asc' }],
              },
            },
          },
        },
      });

      return {
        order: result,
        payment: updatedPayment,
      };
    });
  }
}
