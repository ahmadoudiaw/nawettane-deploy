import { Injectable, Logger } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { OrderStatus, Prisma, TicketStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { DashboardQueryDto } from './dto/dashboard-query.dto';
import { buildScopeContext } from '../common/utils/scope.util';

type ReportRow = {
  key: string;
  label: string;
  matchesCount: number;
  ticketsSold: number;
  revenue: Prisma.Decimal;
  ticketsScanned: number;
  ticketsUnused: number;
};

type MatchWithRelations = Prisma.MatchGetPayload<{
  include: {
    organization: { include: { region: true; department: true; commune: true } };
    season: true;
    venue: true;
    homeTeam: true;
    awayTeam: true;
  };
}>;

type TicketCategoryShape = {
  id: string;
  matchId: string;
  name: string;
  price: Prisma.Decimal;
  quota: number | null;
  soldCount: number;
  badgeColor: string;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class ReportingService {
  private readonly logger = new Logger(ReportingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(user: AuthenticatedUser, query: DashboardQueryDto) {
    const scope = user.scope ?? buildScopeContext(user);
    const reportType = query.reportType ?? 'zone';
    const matchWhere = this.buildMatchWhere(scope, query);
    const orderWhere = { match: matchWhere };
    const ticketWhere = { match: matchWhere };
    const scanWhere = { match: matchWhere };

    try {
      const [matches, paidOrders, tickets, scans, revenue] = await Promise.all([
        this.prisma.match.findMany({
          where: matchWhere,
          include: {
            organization: {
              include: {
                region: true,
                department: true,
                commune: true,
              },
            },
            season: true,
            homeTeam: true,
            awayTeam: true,
          },
        }),
        this.prisma.order.findMany({
          where: {
            ...orderWhere,
            status: OrderStatus.PAID,
          },
          include: {
            match: {
              include: {
                organization: {
                  include: {
                    region: true,
                    department: true,
                    commune: true,
                  },
                },
              },
            },
          },
        }),
        this.prisma.ticket.findMany({
          where: ticketWhere,
          include: {
            match: {
              include: {
                organization: {
                  include: {
                    region: true,
                    department: true,
                    commune: true,
                  },
                },
              },
            },
          },
        }),
        this.prisma.ticketScan.findMany({
          where: scanWhere,
          include: {
            match: {
              include: {
                organization: {
                  include: {
                    region: true,
                    department: true,
                    commune: true,
                  },
                },
              },
            },
          },
        }),
        this.prisma.order.aggregate({
          where: {
            ...orderWhere,
            status: OrderStatus.PAID,
          },
          _sum: {
            totalAmount: true,
          },
        }),
      ]);

      const rows = this.buildRows(reportType, matches, paidOrders, tickets, scans);

      return {
        reportType,
        filters: query,
        matchesCount: matches.length,
        ticketsSold: tickets.length,
        revenue: revenue._sum.totalAmount ?? new Prisma.Decimal(0),
        ticketsScanned: scans.length,
        ticketsUnused: tickets.filter((ticket) => ticket.status !== TicketStatus.USED).length,
        rows,
      };
    } catch (error) {
      this.logger.error(
        `Grouped reporting failed for reportType=${reportType}; falling back to legacy KPI dashboard.`,
        error instanceof Error ? error.stack : String(error),
      );

      return this.getLegacyDashboard(matchWhere, query, reportType);
    }
  }

  async exportMatchesWorkbook(user: AuthenticatedUser, query: DashboardQueryDto) {
    const matches = await this.getScopedMatches(user, query);
    const workbook = this.createWorkbook('Export Matchs');
    const sheet = workbook.addWorksheet('Matchs');

    sheet.columns = [
      { header: 'ID match', key: 'id', width: 28 },
      { header: 'Saison', key: 'season', width: 24 },
      { header: 'Competition', key: 'competitionName', width: 28 },
      { header: 'Phase', key: 'stage', width: 20 },
      { header: 'Date', key: 'matchDate', width: 24 },
      { header: 'Statut', key: 'status', width: 16 },
      { header: 'Zone', key: 'zone', width: 24 },
      { header: 'Region', key: 'region', width: 18 },
      { header: 'Departement', key: 'department', width: 18 },
      { header: 'Commune', key: 'commune', width: 18 },
      { header: 'Stade', key: 'venue', width: 22 },
      { header: 'Equipe domicile', key: 'homeTeam', width: 24 },
      { header: 'Equipe exterieure', key: 'awayTeam', width: 24 },
      { header: 'Prix base', key: 'ticketPrice', width: 14 },
      { header: 'Quota', key: 'ticketQuota', width: 12 },
    ];

    matches.forEach((match) => {
      sheet.addRow({
        id: match.id,
        season: match.season.name,
        competitionName: match.competitionName,
        stage: match.stage ?? '',
        matchDate: this.formatDateTime(match.matchDate),
        status: match.status,
        zone: match.organization.name,
        region: match.organization.region?.name ?? '',
        department: match.organization.department?.name ?? '',
        commune: match.organization.commune?.name ?? '',
        venue: match.venue.name,
        homeTeam: match.homeTeam.name,
        awayTeam: match.awayTeam.name,
        ticketPrice: this.toNumber(match.ticketPrice),
        ticketQuota: match.ticketQuota,
      });
    });

    this.styleWorksheet(sheet);
    return this.writeWorkbook(workbook);
  }

  async exportSalesByMatchWorkbook(user: AuthenticatedUser, query: DashboardQueryDto) {
    const [matches, paidOrders, tickets] = await Promise.all([
      this.getScopedMatches(user, query),
      this.getScopedPaidOrders(user, query),
      this.getScopedTickets(user, query),
    ]);

    const workbook = this.createWorkbook('Export Ventes par match');
    const sheet = workbook.addWorksheet('Ventes par match');

    sheet.columns = [
      { header: 'Match', key: 'match', width: 30 },
      { header: 'Zone', key: 'zone', width: 22 },
      { header: 'Date', key: 'date', width: 24 },
      { header: 'Nb commandes payees', key: 'paidOrders', width: 20 },
      { header: 'Tickets vendus', key: 'ticketsSold', width: 18 },
      { header: 'Revenus', key: 'revenue', width: 16 },
    ];

    matches.forEach((match) => {
      const relatedOrders = paidOrders.filter((order) => order.matchId === match.id);
      const relatedTickets = tickets.filter((ticket) => ticket.matchId === match.id);
      const revenue = relatedOrders.reduce((sum, order) => sum + this.toNumber(order.totalAmount), 0);

      sheet.addRow({
        match: `${match.homeTeam.name} vs ${match.awayTeam.name}`,
        zone: match.organization.name,
        date: this.formatDateTime(match.matchDate),
        paidOrders: relatedOrders.length,
        ticketsSold: relatedTickets.length,
        revenue,
      });
    });

    this.styleWorksheet(sheet);
    return this.writeWorkbook(workbook);
  }

  async exportTicketsWorkbook(user: AuthenticatedUser, query: DashboardQueryDto) {
    const tickets = await this.getScopedTickets(user, query);
    const workbook = this.createWorkbook('Export Tickets vendus');
    const sheet = workbook.addWorksheet('Tickets');

    sheet.columns = [
      { header: 'Code ticket', key: 'ticketCode', width: 22 },
      { header: 'Statut', key: 'status', width: 14 },
      { header: 'Titulaire', key: 'holderName', width: 24 },
      { header: 'Date utilisation', key: 'usedAt', width: 24 },
      { header: 'Match', key: 'match', width: 30 },
      { header: 'Zone', key: 'zone', width: 22 },
      { header: 'Categorie', key: 'category', width: 18 },
      { header: 'Prix', key: 'price', width: 12 },
      { header: 'Commande', key: 'orderReference', width: 22 },
      { header: 'Acheteur', key: 'buyerName', width: 22 },
      { header: 'Telephone', key: 'buyerPhone', width: 18 },
    ];

    tickets.forEach((ticket) => {
      const category = this.resolveTicketCategory(ticket);

      sheet.addRow({
        ticketCode: ticket.ticketCode,
        status: ticket.status,
        holderName: ticket.holderName ?? ticket.order.buyerName,
        usedAt: ticket.usedAt ? this.formatDateTime(ticket.usedAt) : '',
        match: `${ticket.match.homeTeam.name} vs ${ticket.match.awayTeam.name}`,
        zone: ticket.match.organization.name,
        category: category.name,
        price: this.toNumber(category.price),
        orderReference: ticket.order.reference,
        buyerName: ticket.order.buyerName,
        buyerPhone: ticket.order.buyerPhone,
      });
    });

    this.styleWorksheet(sheet);
    return this.writeWorkbook(workbook);
  }

  async exportPaymentsWorkbook(user: AuthenticatedUser, query: DashboardQueryDto) {
    const payments = await this.getScopedPayments(user, query);
    const workbook = this.createWorkbook('Export Paiements');
    const sheet = workbook.addWorksheet('Paiements');

    sheet.columns = [
      { header: 'Paiement ID', key: 'id', width: 26 },
      { header: 'Commande', key: 'reference', width: 22 },
      { header: 'Provider', key: 'provider', width: 18 },
      { header: 'Reference provider', key: 'providerReference', width: 26 },
      { header: 'Montant', key: 'amount', width: 14 },
      { header: 'Statut', key: 'status', width: 16 },
      { header: 'Date paiement', key: 'paidAt', width: 24 },
      { header: 'Match', key: 'match', width: 30 },
      { header: 'Zone', key: 'zone', width: 22 },
      { header: 'Acheteur', key: 'buyerName', width: 22 },
      { header: 'Telephone', key: 'buyerPhone', width: 18 },
    ];

    payments.forEach((payment) => {
      sheet.addRow({
        id: payment.id,
        reference: payment.order.reference,
        provider: payment.provider,
        providerReference: payment.providerReference ?? '',
        amount: this.toNumber(payment.amount),
        status: payment.status,
        paidAt: payment.paidAt ? this.formatDateTime(payment.paidAt) : '',
        match: `${payment.order.match.homeTeam.name} vs ${payment.order.match.awayTeam.name}`,
        zone: payment.order.match.organization.name,
        buyerName: payment.order.buyerName,
        buyerPhone: payment.order.buyerPhone,
      });
    });

    this.styleWorksheet(sheet);
    return this.writeWorkbook(workbook);
  }

  async exportRevenueWorkbook(user: AuthenticatedUser, query: DashboardQueryDto) {
    const [matches, paidOrders] = await Promise.all([
      this.getScopedMatches(user, query),
      this.getScopedPaidOrders(user, query),
    ]);

    const workbook = this.createWorkbook('Export Recettes');
    const byZone = workbook.addWorksheet('Recettes Zones');
    const byAsc = workbook.addWorksheet('Recettes ASC');
    const byVenue = workbook.addWorksheet('Recettes Stades');

    byZone.columns = [
      { header: 'Zone', key: 'label', width: 26 },
      { header: 'Matchs', key: 'matchesCount', width: 12 },
      { header: 'Tickets vendus', key: 'ticketsSold', width: 18 },
      { header: 'Recettes', key: 'revenue', width: 16 },
    ];
    byAsc.columns = [...byZone.columns];
    byVenue.columns = [...byZone.columns];

    const zoneRows = new Map<string, { label: string; matchesCount: number; ticketsSold: number; revenue: number }>();
    const ascRows = new Map<string, { label: string; matchesCount: number; ticketsSold: number; revenue: number }>();
    const venueRows = new Map<string, { label: string; matchesCount: number; ticketsSold: number; revenue: number }>();

    const ensure = (
      map: Map<string, { label: string; matchesCount: number; ticketsSold: number; revenue: number }>,
      key: string,
      label: string,
    ) => {
      if (!map.has(key)) {
        map.set(key, { label, matchesCount: 0, ticketsSold: 0, revenue: 0 });
      }
      return map.get(key)!;
    };

    matches.forEach((match) => {
      ensure(zoneRows, match.organization.id, match.organization.name).matchesCount += 1;
      ensure(venueRows, match.venue.id, match.venue.name).matchesCount += 1;
      ensure(ascRows, match.homeTeam.id, match.homeTeam.name).matchesCount += 1;
      ensure(ascRows, match.awayTeam.id, match.awayTeam.name).matchesCount += 1;
    });

    paidOrders.forEach((order) => {
      const amount = this.toNumber(order.totalAmount);
      const quantity = order.quantity;
      ensure(zoneRows, order.match.organization.id, order.match.organization.name).ticketsSold += quantity;
      ensure(zoneRows, order.match.organization.id, order.match.organization.name).revenue += amount;
      ensure(venueRows, order.match.venue.id, order.match.venue.name).ticketsSold += quantity;
      ensure(venueRows, order.match.venue.id, order.match.venue.name).revenue += amount;
      ensure(ascRows, order.match.homeTeam.id, order.match.homeTeam.name).ticketsSold += quantity;
      ensure(ascRows, order.match.homeTeam.id, order.match.homeTeam.name).revenue += amount;
      ensure(ascRows, order.match.awayTeam.id, order.match.awayTeam.name).ticketsSold += quantity;
      ensure(ascRows, order.match.awayTeam.id, order.match.awayTeam.name).revenue += amount;
    });

    [...zoneRows.values()].sort((a, b) => a.label.localeCompare(b.label, 'fr')).forEach((row) => byZone.addRow(row));
    [...ascRows.values()].sort((a, b) => a.label.localeCompare(b.label, 'fr')).forEach((row) => byAsc.addRow(row));
    [...venueRows.values()].sort((a, b) => a.label.localeCompare(b.label, 'fr')).forEach((row) => byVenue.addRow(row));

    this.styleWorksheet(byZone);
    this.styleWorksheet(byAsc);
    this.styleWorksheet(byVenue);
    return this.writeWorkbook(workbook);
  }

  async exportDashboardWorkbook(user: AuthenticatedUser, query: DashboardQueryDto) {
    const dashboard = await this.getDashboard(user, query);
    const workbook = this.createWorkbook('Export Dashboard global');
    const summary = workbook.addWorksheet('KPI');
    const rowsSheet = workbook.addWorksheet('Lignes');

    summary.columns = [
      { header: 'Indicateur', key: 'metric', width: 24 },
      { header: 'Valeur', key: 'value', width: 20 },
    ];

    summary.addRows([
      { metric: 'Type de rapport', value: dashboard.reportType ?? 'zone' },
      { metric: 'Nombre de matchs', value: dashboard.matchesCount },
      { metric: 'Tickets vendus', value: dashboard.ticketsSold },
      { metric: 'Revenus', value: this.toNumber(dashboard.revenue) },
      { metric: 'Tickets scannes', value: dashboard.ticketsScanned },
      { metric: 'Tickets non utilises', value: dashboard.ticketsUnused },
    ]);

    rowsSheet.columns = [
      { header: 'Groupe', key: 'label', width: 28 },
      { header: 'Matchs', key: 'matchesCount', width: 12 },
      { header: 'Tickets vendus', key: 'ticketsSold', width: 18 },
      { header: 'Revenus', key: 'revenue', width: 16 },
      { header: 'Scannes', key: 'ticketsScanned', width: 14 },
      { header: 'Non utilises', key: 'ticketsUnused', width: 16 },
    ];

    dashboard.rows.forEach((row) => {
      rowsSheet.addRow({
        label: row.label,
        matchesCount: row.matchesCount,
        ticketsSold: row.ticketsSold,
        revenue: this.toNumber(row.revenue),
        ticketsScanned: row.ticketsScanned,
        ticketsUnused: row.ticketsUnused,
      });
    });

    this.styleWorksheet(summary);
    this.styleWorksheet(rowsSheet);
    return this.writeWorkbook(workbook);
  }

  async getAnalytics(user: AuthenticatedUser, query: DashboardQueryDto) {
    const scope = user.scope ?? buildScopeContext(user);
    const matchWhere = this.buildMatchWhere(scope, query);

    // Fetch paid orders with category name; fall back gracefully if table is missing
    let ordersWithCategory: Array<{
      matchId: string;
      quantity: number;
      totalAmount: Prisma.Decimal;
      categoryName: string;
    }> = [];

    try {
      const rawOrders = await this.prisma.order.findMany({
        where: { match: matchWhere, status: OrderStatus.PAID },
        select: {
          matchId: true,
          quantity: true,
          totalAmount: true,
          ticketCategory: { select: { name: true } },
        },
      });
      ordersWithCategory = rawOrders.map((o) => ({
        matchId: o.matchId,
        quantity: o.quantity,
        totalAmount: o.totalAmount,
        categoryName: o.ticketCategory?.name ?? 'Populaire',
      }));
    } catch (error) {
      if (!this.isMissingTicketCategoriesTableError(error)) throw error;
      const rawOrders = await this.prisma.order.findMany({
        where: { match: matchWhere, status: OrderStatus.PAID },
        select: { matchId: true, quantity: true, totalAmount: true },
      });
      ordersWithCategory = rawOrders.map((o) => ({
        matchId: o.matchId,
        quantity: o.quantity,
        totalAmount: o.totalAmount,
        categoryName: 'Populaire',
      }));
    }

    const [matches, tickets, scans] = await Promise.all([
      this.prisma.match.findMany({
        where: matchWhere,
        include: { organization: true, homeTeam: true, awayTeam: true },
        orderBy: [{ matchDate: 'desc' }],
      }),
      this.prisma.ticket.findMany({
        where: { match: matchWhere },
        select: { matchId: true },
      }),
      this.prisma.ticketScan.findMany({
        where: { match: matchWhere },
        include: { scannedBy: { select: { id: true, fullName: true, role: true } } },
        orderBy: { scannedAt: 'asc' },
      }),
    ]);

    // Revenue per match
    const revMap = new Map<string, number>();
    for (const order of ordersWithCategory) {
      revMap.set(order.matchId, (revMap.get(order.matchId) ?? 0) + this.toNumber(order.totalAmount));
    }

    // Ticket count per match
    const ticketCountMap = new Map<string, number>();
    for (const ticket of tickets) {
      ticketCountMap.set(ticket.matchId, (ticketCountMap.get(ticket.matchId) ?? 0) + 1);
    }

    // Scan count per match
    const scanCountMap = new Map<string, number>();
    for (const scan of scans) {
      scanCountMap.set(scan.matchId, (scanCountMap.get(scan.matchId) ?? 0) + 1);
    }

    // Per-match stats with fill rate
    const matchStats = matches.map((m) => {
      const sold = ticketCountMap.get(m.id) ?? 0;
      const quota = m.ticketQuota ?? 0;
      const revenue = revMap.get(m.id) ?? 0;
      const scanned = scanCountMap.get(m.id) ?? 0;
      const fillRate = quota > 0 ? Math.min(100, Math.round((sold / quota) * 100)) : 0;
      return {
        matchId: m.id,
        label: `${m.homeTeam.name} vs ${m.awayTeam.name}`,
        zone: m.organization.name,
        matchDate: m.matchDate.toISOString(),
        status: m.status,
        ticketsSold: sold,
        revenue,
        ticketsScanned: scanned,
        ticketQuota: quota,
        fillRate,
      };
    });

    // Sales by category
    const catMap = new Map<string, { name: string; ticketsSold: number; revenue: number }>();
    for (const order of ordersWithCategory) {
      const name = order.categoryName;
      if (!catMap.has(name)) catMap.set(name, { name, ticketsSold: 0, revenue: 0 });
      const cat = catMap.get(name)!;
      cat.ticketsSold += order.quantity;
      cat.revenue += this.toNumber(order.totalAmount);
    }
    const categoryStats = [...catMap.values()].sort((a, b) => b.revenue - a.revenue);

    // Agent scan performance
    type AgentEntry = {
      agentId: string;
      agentName: string;
      agentRole: string;
      totalScans: number;
      validScans: number;
      invalidScans: number;
      alreadyUsedScans: number;
      lastScan: string | null;
    };
    const agentMap = new Map<string, AgentEntry>();
    for (const scan of scans) {
      const id = scan.scannedById;
      if (!agentMap.has(id)) {
        agentMap.set(id, {
          agentId: id,
          agentName: scan.scannedBy.fullName,
          agentRole: scan.scannedBy.role,
          totalScans: 0,
          validScans: 0,
          invalidScans: 0,
          alreadyUsedScans: 0,
          lastScan: null,
        });
      }
      const agent = agentMap.get(id)!;
      agent.totalScans += 1;
      if (scan.scanResult === 'VALID') {
        agent.validScans += 1;
      } else if (scan.scanResult === 'INVALID' || scan.scanResult === 'OUT_OF_SCOPE') {
        agent.invalidScans += 1;
      } else if (scan.scanResult === 'ALREADY_USED') {
        agent.alreadyUsedScans += 1;
      }
      // scans are ordered asc — last iteration is the most recent scan
      agent.lastScan = scan.scannedAt.toISOString();
    }
    const agentStats = [...agentMap.values()].sort((a, b) => b.totalScans - a.totalScans);

    return { matchStats, categoryStats, agentStats };
  }

  private async getLegacyDashboard(
    matchWhere: Prisma.MatchWhereInput,
    query: DashboardQueryDto,
    reportType: string,
  ) {
    const orderWhere = { match: matchWhere };
    const ticketWhere = { match: matchWhere };
    const scanWhere = { match: matchWhere };

    const [matchesCount, tickets, scansCount, revenue] = await Promise.all([
      this.prisma.match.count({
        where: matchWhere,
      }),
      this.prisma.ticket.findMany({
        where: ticketWhere,
        select: {
          status: true,
        },
      }),
      this.prisma.ticketScan.count({
        where: scanWhere,
      }),
      this.prisma.order.aggregate({
        where: {
          ...orderWhere,
          status: OrderStatus.PAID,
        },
        _sum: {
          totalAmount: true,
        },
      }),
    ]);

    return {
      reportType,
      filters: query,
      matchesCount,
      ticketsSold: tickets.length,
      revenue: revenue._sum.totalAmount ?? new Prisma.Decimal(0),
      ticketsScanned: scansCount,
      ticketsUnused: tickets.filter((ticket) => ticket.status !== TicketStatus.USED).length,
      rows: [] as ReportRow[],
    };
  }

  private buildMatchWhere(
    scope: ReturnType<typeof buildScopeContext>,
    query: DashboardQueryDto,
  ): Prisma.MatchWhereInput {
    const scopeWhere = scope.isGlobal
      ? undefined
      : {
          OR: [
            {
              organizationId: {
                in: [...scope.organizationIds, ...scope.zoneAssignmentIds],
              },
            },
            {
              id: {
                in: scope.matchIds,
              },
            },
          ],
        };

    const filterWhere: Prisma.MatchWhereInput = {
      seasonId: query.seasonId,
      organizationId: query.zoneId,
      id: query.matchId,
      status: undefined,
      stage: query.pool,
      organization: query.regionId || query.departmentId || query.communeId
        ? {
            is: {
              regionId: query.regionId,
              departmentId: query.departmentId,
              communeId: query.communeId,
            },
          }
        : undefined,
      matchDate:
        query.fromDate || query.toDate || query.week
          ? {
              gte: this.resolveFromDate(query),
              lte: this.resolveToDate(query),
            }
          : undefined,
    };

    return {
      AND: [scopeWhere, filterWhere].filter((value) => value !== undefined),
    };
  }

  private resolveFromDate(query: DashboardQueryDto) {
    if (query.week) {
      const [yearPart, weekPart] = query.week.split('-W');
      const year = Number(yearPart);
      const week = Number(weekPart);
      if (!Number.isNaN(year) && !Number.isNaN(week)) {
        const januaryFourth = new Date(Date.UTC(year, 0, 4));
        const dayOfWeek = januaryFourth.getUTCDay() || 7;
        const start = new Date(januaryFourth);
        start.setUTCDate(januaryFourth.getUTCDate() - dayOfWeek + 1 + (week - 1) * 7);
        start.setUTCHours(0, 0, 0, 0);
        return start;
      }
    }

    return query.fromDate ? new Date(query.fromDate) : undefined;
  }

  private resolveToDate(query: DashboardQueryDto) {
    if (query.week) {
      const start = this.resolveFromDate(query);
      if (start) {
        const end = new Date(start);
        end.setUTCDate(end.getUTCDate() + 6);
        end.setUTCHours(23, 59, 59, 999);
        return end;
      }
    }

    if (!query.toDate) {
      return undefined;
    }

    const end = new Date(query.toDate);
    end.setHours(23, 59, 59, 999);
    return end;
  }

  private buildRows(
    reportType: string,
    matches: Array<
      Prisma.MatchGetPayload<{
        include: {
          organization: { include: { region: true; department: true; commune: true } };
          season: true;
          homeTeam: true;
          awayTeam: true;
        };
      }>
    >,
    orders: Array<
      Prisma.OrderGetPayload<{
        include: {
          match: { include: { organization: { include: { region: true; department: true; commune: true } } } };
        };
      }>
    >,
    tickets: Array<
      Prisma.TicketGetPayload<{
        include: {
          match: { include: { organization: { include: { region: true; department: true; commune: true } } } };
        };
      }>
    >,
    scans: Array<
      Prisma.TicketScanGetPayload<{
        include: {
          match: { include: { organization: { include: { region: true; department: true; commune: true } } } };
        };
      }>
    >,
  ): ReportRow[] {
    const rows = new Map<string, ReportRow>();

    const ensureRow = (key: string, label: string) => {
      if (!rows.has(key)) {
        rows.set(key, {
          key,
          label,
          matchesCount: 0,
          ticketsSold: 0,
          revenue: new Prisma.Decimal(0),
          ticketsScanned: 0,
          ticketsUnused: 0,
        });
      }

      return rows.get(key)!;
    };

    const resolveGrouping = (match: { id: string; matchDate: Date; stage: string | null; organization: { name: string } ; homeTeam?: { name: string }; awayTeam?: { name: string } }) => {
      switch (reportType) {
        case 'match':
          return {
            key: match.id,
            label: `${match.homeTeam?.name ?? 'Match'} vs ${match.awayTeam?.name ?? ''}`.trim(),
          };
        case 'journee':
          return {
            key: match.matchDate.toISOString().slice(0, 10),
            label: new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeZone: 'UTC' }).format(match.matchDate),
          };
        case 'poule':
          return {
            key: match.stage ?? 'Sans poule',
            label: match.stage ?? 'Sans poule',
          };
        case 'semaine':
          return this.getWeekLabel(match.matchDate);
        case 'zone':
        default:
          return {
            key: match.organization.name,
            label: match.organization.name,
          };
      }
    };

    matches.forEach((match) => {
      const group = resolveGrouping(match);
      ensureRow(group.key, group.label).matchesCount += 1;
    });

    orders.forEach((order) => {
      const group = resolveGrouping(order.match);
      const row = ensureRow(group.key, group.label);
      row.revenue = row.revenue.add(order.totalAmount);
    });

    tickets.forEach((ticket) => {
      const group = resolveGrouping(ticket.match);
      const row = ensureRow(group.key, group.label);
      row.ticketsSold += 1;
      if (ticket.status !== TicketStatus.USED) {
        row.ticketsUnused += 1;
      }
    });

    scans.forEach((scan) => {
      const group = resolveGrouping(scan.match);
      ensureRow(group.key, group.label).ticketsScanned += 1;
    });

    return [...rows.values()].sort((left, right) => left.label.localeCompare(right.label, 'fr'));
  }

  private getWeekLabel(date: Date) {
    const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const dayNr = (target.getUTCDay() + 6) % 7;
    target.setUTCDate(target.getUTCDate() - dayNr + 3);
    const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
    const firstDayNr = (firstThursday.getUTCDay() + 6) % 7;
    firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNr + 3);
    const week = 1 + Math.round((target.getTime() - firstThursday.getTime()) / 604800000);
    const year = target.getUTCFullYear();

    return {
      key: `${year}-W${String(week).padStart(2, '0')}`,
      label: `Semaine ${week} (${year})`,
    };
  }

  private async getScopedMatches(user: AuthenticatedUser, query: DashboardQueryDto) {
    const scope = user.scope ?? buildScopeContext(user);
    const matchWhere = this.buildMatchWhere(scope, query);

    return this.prisma.match.findMany({
      where: matchWhere,
      include: {
        organization: {
          include: {
            region: true,
            department: true,
            commune: true,
          },
        },
        season: true,
        venue: true,
        homeTeam: true,
        awayTeam: true,
      },
      orderBy: [{ matchDate: 'asc' }],
    });
  }

  private async getScopedPaidOrders(user: AuthenticatedUser, query: DashboardQueryDto) {
    const scope = user.scope ?? buildScopeContext(user);
    const matchWhere = this.buildMatchWhere(scope, query);

    return this.prisma.order.findMany({
      where: {
        status: OrderStatus.PAID,
        match: matchWhere,
      },
      omit: { ticketCategoryId: true },
      include: {
        match: {
          include: {
            organization: {
              include: {
                region: true,
                department: true,
                commune: true,
              },
            },
            venue: true,
            homeTeam: true,
            awayTeam: true,
            season: true,
          },
        },
      },
      orderBy: [{ createdAt: 'asc' }],
    });
  }

  private async getScopedTickets(user: AuthenticatedUser, query: DashboardQueryDto) {
    const scope = user.scope ?? buildScopeContext(user);
    const matchWhere = this.buildMatchWhere(scope, query);

    try {
      return await this.prisma.ticket.findMany({
        where: {
          match: matchWhere,
        },
        omit: { ticketCategoryId: true },
        include: {
          match: {
            include: {
              organization: {
                include: {
                  region: true,
                  department: true,
                  commune: true,
                },
              },
              venue: true,
              homeTeam: true,
              awayTeam: true,
              season: true,
            },
          },
          order: { omit: { ticketCategoryId: true } },
          ticketCategory: true,
        },
        orderBy: [{ createdAt: 'asc' }],
      });
    } catch (error) {
      if (!this.isMissingTicketCategoriesTableError(error)) {
        throw error;
      }

      this.logger.warn(
        'Ticket category table is unavailable for reporting exports; falling back to legacy ticket category values.',
      );

      const tickets = await this.prisma.ticket.findMany({
        where: {
          match: matchWhere,
        },
        omit: { ticketCategoryId: true },
        include: {
          match: {
            include: {
              organization: {
                include: {
                  region: true,
                  department: true,
                  commune: true,
                },
              },
              venue: true,
              homeTeam: true,
              awayTeam: true,
              season: true,
            },
          },
          order: { omit: { ticketCategoryId: true } },
        },
        orderBy: [{ createdAt: 'asc' }],
      });

      return tickets.map((ticket) => ({
        ...ticket,
        ticketCategory: {
          id: `legacy-${ticket.matchId}`,
          matchId: ticket.matchId,
          name: 'Populaire',
          price: ticket.order.unitPrice,
          quota: ticket.match.ticketQuota,
          soldCount: 0,
          badgeColor: '#0F5C8B',
          createdAt: ticket.createdAt,
          updatedAt: ticket.updatedAt,
        } satisfies TicketCategoryShape,
      }));
    }
  }

  private async getScopedPayments(user: AuthenticatedUser, query: DashboardQueryDto) {
    const scope = user.scope ?? buildScopeContext(user);
    const matchWhere = this.buildMatchWhere(scope, query);

    return this.prisma.payment.findMany({
      where: {
        order: {
          match: matchWhere,
        },
      },
      include: {
        order: {
          omit: { ticketCategoryId: true },
          include: {
            match: {
              include: {
                organization: {
                  include: {
                    region: true,
                    department: true,
                    commune: true,
                  },
                },
                venue: true,
                homeTeam: true,
                awayTeam: true,
                season: true,
              },
            },
          },
        },
      },
      orderBy: [{ createdAt: 'asc' }],
    });
  }

  private createWorkbook(title: string) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'NAWETTANE';
    workbook.created = new Date();
    workbook.modified = new Date();
    workbook.subject = title;
    return workbook;
  }

  private styleWorksheet(worksheet: ExcelJS.Worksheet) {
    const header = worksheet.getRow(1);
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    header.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F5C8B' },
    };
    header.alignment = { vertical: 'middle', horizontal: 'center' };
    header.height = 22;

    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
          left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
          bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
          right: { style: 'thin', color: { argb: 'FFD9D9D9' } },
        };

        if (rowNumber > 1) {
          cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
        }
      });
    });
  }

  private async writeWorkbook(workbook: ExcelJS.Workbook) {
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private resolveTicketCategory(ticket: {
    matchId: string;
    createdAt: Date;
    updatedAt: Date;
    match: { ticketQuota: number | null };
    order: { unitPrice: Prisma.Decimal };
    ticketCategory?: TicketCategoryShape | null;
  }): TicketCategoryShape {
    if (ticket.ticketCategory) {
      return ticket.ticketCategory;
    }

    return {
      id: `legacy-${ticket.matchId}`,
      matchId: ticket.matchId,
      name: 'Populaire',
      price: ticket.order.unitPrice,
      quota: ticket.match.ticketQuota,
      soldCount: 0,
      badgeColor: '#0F5C8B',
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    };
  }

  private toNumber(value: Prisma.Decimal | number | string | null | undefined) {
    if (value == null) {
      return 0;
    }
    if (typeof value === 'number') {
      return value;
    }
    return Number(value);
  }

  private formatDateTime(value: Date) {
    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'UTC',
    }).format(value);
  }

  private isMissingTicketCategoriesTableError(error: unknown) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
      return false;
    }
    if (error.code === 'P2021') return true;
    if (error.code === 'P2022') {
      const model = (error.meta as Record<string, unknown> | undefined)?.modelName as string | undefined;
      return model === 'Order' || model === 'Ticket' || model === 'MatchTicketCategory';
    }
    return false;
  }
}
