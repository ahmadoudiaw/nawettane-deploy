import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TicketStatus } from '@prisma/client';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PrismaService } from '../prisma/prisma.service';
import { CancelTicketDto } from './dto/cancel-ticket.dto';
import { QueryAdminTicketsDto } from './dto/query-admin-tickets.dto';

const TICKET_INCLUDE = {
  order: {
    select: {
      id: true,
      reference: true,
      buyerName: true,
      buyerPhone: true,
      totalAmount: true,
    },
  },
  match: {
    select: {
      id: true,
      matchDate: true,
      competitionName: true,
      homeTeam: { select: { name: true } },
      awayTeam: { select: { name: true } },
    },
  },
  ticketCategory: {
    select: { id: true, name: true, price: true },
  },
  cancelledByAdmin: {
    select: { id: true, fullName: true },
  },
} satisfies Prisma.TicketInclude;

@Injectable()
export class AdminTicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async findAll(dto: QueryAdminTicketsDto) {
    const page = Math.max(1, Number(dto.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(dto.limit ?? 50)));

    const where: Prisma.TicketWhereInput = {};

    if (dto.q?.trim()) {
      const q = dto.q.trim();
      where.OR = [
        { ticketCode: { contains: q, mode: 'insensitive' } },
        { order: { buyerPhone: { contains: q, mode: 'insensitive' } } },
        { order: { buyerName: { contains: q, mode: 'insensitive' } } },
      ];
    }

    if (dto.matchId) where.matchId = dto.matchId;
    if (dto.ticketCategoryId) where.ticketCategoryId = dto.ticketCategoryId;
    if (dto.status) where.status = dto.status as TicketStatus;

    if (dto.fromDate || dto.toDate) {
      where.createdAt = {
        ...(dto.fromDate ? { gte: new Date(dto.fromDate) } : {}),
        ...(dto.toDate
          ? { lte: new Date(new Date(dto.toDate).setHours(23, 59, 59, 999)) }
          : {}),
      };
    }

    const [total, data] = await Promise.all([
      this.prisma.ticket.count({ where }),
      this.prisma.ticket.findMany({
        where,
        include: TICKET_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return { data, total, page, limit };
  }

  async cancel(id: string, dto: CancelTicketDto, user: AuthenticatedUser) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });

    if (!ticket) {
      throw new NotFoundException('Billet introuvable.');
    }

    if (ticket.status === TicketStatus.USED) {
      throw new BadRequestException(
        "Ce billet a déjà été scanné et utilisé. L'annulation est impossible.",
      );
    }

    if (ticket.status === TicketStatus.CANCELLED) {
      throw new BadRequestException('Ce billet est déjà annulé.');
    }

    const updated = await this.prisma.ticket.update({
      where: { id },
      data: {
        status: TicketStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelledByAdminId: user.id,
        cancelReason: dto.cancelReason,
      },
      include: TICKET_INCLUDE,
    });

    this.auditLogs.log({
      userId: user.id,
      action: 'TICKET_CANCELLED',
      entityType: 'Ticket',
      entityId: id,
      metadata: {
        ticketCode: updated.ticketCode,
        cancelReason: dto.cancelReason,
        matchLabel: `${updated.match.homeTeam.name} vs ${updated.match.awayTeam.name}`,
      },
    });

    return updated;
  }
}
