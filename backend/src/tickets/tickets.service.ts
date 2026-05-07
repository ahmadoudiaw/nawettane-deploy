import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const ticketInclude = {
  order: { include: { ticketCategory: true } },
  ticketCategory: true,
  match: {
    include: {
      organization: true,
      season: true,
      venue: true,
      homeTeam: true,
      awayTeam: true,
      ticketCategories: {
        orderBy: [
          { price: Prisma.SortOrder.asc },
          { name: Prisma.SortOrder.asc },
        ],
      },
    },
  },
};

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  async getById(id: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: ticketInclude,
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found.');
    }

    return ticket;
  }

  async getByPhone(phone: string) {
    if (!phone) {
      throw new BadRequestException('phone query param is required.');
    }

    const tickets = await this.prisma.ticket.findMany({
      where: {
        order: { buyerPhone: phone },
        status: { not: 'CANCELLED' },
      },
      include: ticketInclude,
      orderBy: { createdAt: Prisma.SortOrder.desc },
    });

    return tickets;
  }
}
