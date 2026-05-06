import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(q: string) {
    const term = q.trim();
    if (!term) {
      return { matches: [], teams: [], zones: [], tickets: [], users: [] };
    }

    const contains: Prisma.StringFilter = { contains: term, mode: 'insensitive' };

    const [matches, teams, zones, tickets, users] = await Promise.all([
      this.prisma.match.findMany({
        where: {
          OR: [
            { homeTeam: { name: contains } },
            { awayTeam: { name: contains } },
          ],
        },
        select: {
          id: true,
          matchDate: true,
          status: true,
          competitionName: true,
          homeTeam: { select: { name: true } },
          awayTeam: { select: { name: true } },
          organization: { select: { name: true } },
        },
        take: 5,
        orderBy: { matchDate: 'desc' },
      }),

      this.prisma.team.findMany({
        where: { name: contains },
        select: { id: true, name: true, category: true, status: true },
        take: 5,
        orderBy: { name: 'asc' },
      }),

      this.prisma.organization.findMany({
        where: { name: contains },
        select: { id: true, name: true, type: true, status: true },
        take: 5,
        orderBy: { name: 'asc' },
      }),

      this.prisma.ticket.findMany({
        where: { ticketCode: contains },
        select: {
          id: true,
          ticketCode: true,
          status: true,
          match: {
            select: {
              homeTeam: { select: { name: true } },
              awayTeam: { select: { name: true } },
            },
          },
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),

      this.prisma.user.findMany({
        where: {
          OR: [
            { fullName: contains },
            { phone: contains },
          ],
        },
        select: { id: true, fullName: true, phone: true, role: true, status: true },
        take: 5,
        orderBy: { fullName: 'asc' },
      }),
    ]);

    return { matches, teams, zones, tickets, users };
  }
}
