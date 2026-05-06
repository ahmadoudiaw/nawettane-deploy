import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  async getById(id: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            ticketCategory: true,
          },
        },
        ticketCategory: true,
        match: {
          include: {
            organization: true,
            season: true,
            venue: true,
            homeTeam: true,
            awayTeam: true,
            ticketCategories: {
              orderBy: [{ price: 'asc' }, { name: 'asc' }],
            },
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found.');
    }

    return ticket;
  }
}
