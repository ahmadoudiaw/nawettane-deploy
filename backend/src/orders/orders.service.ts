import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MatchStatus, OrderStatus, PaymentProvider, PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateOrderDto) {
    const match = await this.prisma.match.findUnique({
      where: { id: dto.matchId },
      include: {
        ticketCategories: true,
      },
    });

    if (!match) {
      throw new NotFoundException('Match not found.');
    }

    if (match.status !== MatchStatus.PUBLISHED) {
      throw new BadRequestException('Tickets can only be sold for published matches.');
    }

    const category = match.ticketCategories.find(
      (item) => item.id === dto.ticketCategoryId,
    );

    if (!category) {
      throw new BadRequestException('Selected ticket category does not belong to this match.');
    }

    if (category.quota !== null) {
      const remainingQuota = category.quota - category.soldCount;
      if (dto.quantity > remainingQuota) {
        throw new BadRequestException('Not enough tickets remaining for this category.');
      }
    }

    const unitPrice = new Prisma.Decimal(category.price);
    const totalAmount = unitPrice.mul(dto.quantity);

    return this.prisma.order.create({
      data: {
        reference: `ORD-${Date.now()}`,
        matchId: dto.matchId,
        ticketCategoryId: category.id,
        buyerName: dto.buyerName,
        buyerPhone: dto.buyerPhone,
        buyerEmail: dto.buyerEmail,
        quantity: dto.quantity,
        unitPrice,
        totalAmount,
        status: OrderStatus.PENDING,
        payments: {
          createMany: {
            data: [
              {
                provider: PaymentProvider.WAVE_MOCK,
                amount: totalAmount,
                status: PaymentStatus.PENDING,
              },
              {
                provider: PaymentProvider.ORANGE_MONEY_MOCK,
                amount: totalAmount,
                status: PaymentStatus.PENDING,
              },
            ],
          },
        },
      },
      include: {
        match: {
          include: {
            ticketCategories: {
              orderBy: [{ price: 'asc' }, { name: 'asc' }],
            },
          },
        },
        ticketCategory: true,
        payments: true,
      },
    });
  }
}
