import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MatchStatus, OrderStatus, OrganizationType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreateMatchDto } from './dto/create-match.dto';
import { buildScopeContext } from '../common/utils/scope.util';
import { UpdateMatchDto } from './dto/update-match.dto';
import { MatchTicketCategoryDto } from './dto/match-ticket-category.dto';
import { ListMatchesQueryDto } from './dto/list-matches-query.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class MatchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async checkVenueAvailability(params: {
    venueId: string;
    matchDate: Date;
    durationMinutes?: number;
    bufferMinutes?: number;
    excludeMatchId?: string;
  }): Promise<{
    available: boolean;
    conflict?: { id: string; label: string; homeTeam: string; awayTeam: string; matchDate: string; status: string };
    message: string;
  }> {
    const duration = params.durationMinutes ?? 120;
    const buffer = params.bufferMinutes ?? 30;

    const windowStart = new Date(params.matchDate.getTime() - buffer * 60_000);
    const windowEnd = new Date(params.matchDate.getTime() + (duration + buffer) * 60_000);

    // [AUDIT-LOG] Temporary diagnostic — remove after verification
    console.log('[AVAILABILITY] check:', {
      venueId: params.venueId,
      matchDate: params.matchDate.toISOString(),
      excludeMatchId: params.excludeMatchId ?? null,
      durationMinutes: duration,
      bufferMinutes: buffer,
      windowStart: windowStart.toISOString(),
      windowEnd: windowEnd.toISOString(),
    });

    const conflict = await this.prisma.match.findFirst({
      where: {
        venueId: params.venueId,
        status: { in: [MatchStatus.DRAFT, MatchStatus.PUBLISHED] },
        matchDate: { gte: windowStart, lte: windowEnd },
        ...(params.excludeMatchId ? { id: { not: params.excludeMatchId } } : {}),
      },
      include: {
        homeTeam: { select: { id: true, name: true } },
        awayTeam: { select: { id: true, name: true } },
      },
      orderBy: { matchDate: 'asc' },
    });

    // [AUDIT-LOG] Temporary diagnostic — remove after verification
    console.log('[AVAILABILITY] result:', conflict
      ? { conflictFound: true, id: conflict.id, status: conflict.status, matchDate: conflict.matchDate.toISOString(), label: `${conflict.homeTeam.name} vs ${conflict.awayTeam.name}` }
      : { conflictFound: false },
    );

    if (!conflict) {
      return { available: true, message: 'Stade disponible sur ce créneau.' };
    }

    const conflictTime = conflict.matchDate.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return {
      available: false,
      conflict: {
        id: conflict.id,
        label: `${conflict.homeTeam.name} vs ${conflict.awayTeam.name}`,
        homeTeam: conflict.homeTeam.name,
        awayTeam: conflict.awayTeam.name,
        matchDate: conflict.matchDate.toISOString(),
        status: conflict.status,
      },
      message: `Ce stade est déjà occupé par ${conflict.homeTeam.name} vs ${conflict.awayTeam.name} à ${conflictTime}.`,
    };
  }

  async list(user: AuthenticatedUser, query: ListMatchesQueryDto) {
    const scope = user.scope ?? buildScopeContext(user);
    const filters = this.buildMatchFilters(query);
    const scopeWhere = scope.isGlobal ? undefined : this.buildScopeWhere(scope);

    return this.findMatches({
      where: {
        AND: [scopeWhere, filters].filter((value) => value !== undefined),
      },
    });
  }

  async create(dto: CreateMatchDto, user: AuthenticatedUser) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: dto.organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Target organization not found.');
    }

    if (organization.type !== OrganizationType.ZONE) {
      throw new ForbiddenException('Matches can only be created for a zone organization.');
    }

    const season = await this.prisma.season.findUnique({
      where: { id: dto.seasonId },
    });

    if (!season) {
      throw new NotFoundException('Season not found.');
    }

    const scope = user.scope ?? buildScopeContext(user);

    if (!scope.isGlobal && !scope.zoneIds.includes(dto.organizationId)) {
      throw new ForbiddenException('You cannot create a match outside your zone scope.');
    }

    // [AUDIT-LOG] Temporary diagnostic — remove after verification
    console.log('[CREATE] availability pre-check:', { venueId: dto.venueId, matchDate: dto.matchDate });

    const venueAvailability = await this.checkVenueAvailability({
      venueId: dto.venueId,
      matchDate: new Date(dto.matchDate),
    });

    // [AUDIT-LOG] Temporary diagnostic — remove after verification
    console.log('[CREATE] availability result:', venueAvailability.available ? 'OK' : `CONFLICT: ${venueAvailability.message}`);

    if (!venueAvailability.available) {
      this.auditLogs.log({
        userId: user.id,
        action: 'MATCH_CREATE_BLOCKED',
        entityType: 'Match',
        entityId: venueAvailability.conflict!.id,
        metadata: {
          venueId: dto.venueId,
          requestedDate: dto.matchDate,
          conflictMatchId: venueAvailability.conflict!.id,
          conflictLabel: venueAvailability.conflict!.label,
        },
      });
      throw new ConflictException(venueAvailability.message);
    }

    const categoryInput = this.resolveCategoryInput(dto);

    let created: Awaited<ReturnType<typeof this.findMatchOrThrow>>;

    try {
      created = await this.prisma.match.create({
        data: {
          seasonId: dto.seasonId,
          organizationId: dto.organizationId,
          venueId: dto.venueId,
          homeTeamId: dto.homeTeamId,
          awayTeamId: dto.awayTeamId,
          competitionName: dto.competitionName,
          stage: dto.stage,
          matchDate: new Date(dto.matchDate),
          status: MatchStatus.DRAFT,
          ticketQuota: categoryInput.totalQuota,
          ticketPrice: categoryInput.minPrice,
          createdById: user.id,
          ticketCategories: {
            create: categoryInput.items,
          },
        },
        include: this.defaultMatchInclude(),
      });
    } catch (error) {
      if (!this.isMissingTicketCategoriesTableError(error)) {
        throw error;
      }

      const legacyMatch = await this.prisma.match.create({
        data: {
          seasonId: dto.seasonId,
          organizationId: dto.organizationId,
          venueId: dto.venueId,
          homeTeamId: dto.homeTeamId,
          awayTeamId: dto.awayTeamId,
          competitionName: dto.competitionName,
          stage: dto.stage,
          matchDate: new Date(dto.matchDate),
          status: MatchStatus.DRAFT,
          ticketQuota: categoryInput.totalQuota,
          ticketPrice: categoryInput.minPrice,
          createdById: user.id,
        },
        include: this.legacyMatchInclude(),
      });

      created = this.attachLegacyTicketCategory(legacyMatch, {
        name: categoryInput.primaryCategory.name,
        price: categoryInput.primaryCategory.price,
        quota: categoryInput.totalQuota,
        soldCount: 0,
        badgeColor: categoryInput.primaryCategory.badgeColor,
      });
    }

    this.auditLogs.log({
      userId: user.id,
      action: 'MATCH_CREATED',
      entityType: 'Match',
      entityId: created.id,
      metadata: {
        homeTeam: created.homeTeam?.name,
        awayTeam: created.awayTeam?.name,
        competitionName: dto.competitionName,
        matchDate: dto.matchDate,
      },
    });

    return created;
  }

  async getById(id: string, user?: AuthenticatedUser) {
    const match = await this.findMatchOrThrow(id);

    if (user) {
      this.assertCanAccessMatch(user, match.organizationId, match.id);
    }

    return match;
  }

  async update(id: string, dto: UpdateMatchDto, user: AuthenticatedUser) {
    const existingMatch = await this.findMatchOrThrow(id);
    this.assertCanManageMatch(user, existingMatch.organizationId);

    if (dto.organizationId && dto.organizationId !== existingMatch.organizationId) {
      const organization = await this.prisma.organization.findUnique({
        where: { id: dto.organizationId },
      });

      if (!organization || organization.type !== OrganizationType.ZONE) {
        throw new ForbiddenException('Target organization must be an existing zone.');
      }

      this.assertCanManageMatch(user, dto.organizationId);
    }

    if (dto.seasonId) {
      const season = await this.prisma.season.findUnique({
        where: { id: dto.seasonId },
      });

      if (!season) {
        throw new NotFoundException('Season not found.');
      }
    }

    if (dto.venueId || dto.matchDate) {
      const venueToCheck = dto.venueId ?? existingMatch.venueId;
      const dateToCheck = dto.matchDate ? new Date(dto.matchDate) : existingMatch.matchDate;

      // [AUDIT-LOG] Temporary diagnostic — remove after verification
      console.log('[UPDATE] availability pre-check:', { venueToCheck, dateToCheck: dateToCheck.toISOString(), excludeMatchId: id });

      const updateAvailability = await this.checkVenueAvailability({
        venueId: venueToCheck,
        matchDate: dateToCheck,
        excludeMatchId: id,
      });

      // [AUDIT-LOG] Temporary diagnostic — remove after verification
      console.log('[UPDATE] availability result:', updateAvailability.available ? 'OK' : `CONFLICT: ${updateAvailability.message}`);

      if (!updateAvailability.available) {
        throw new ConflictException(updateAvailability.message);
      }
    }

    const data: Prisma.MatchUpdateInput = {
      season: dto.seasonId ? { connect: { id: dto.seasonId } } : undefined,
      organization: dto.organizationId
        ? { connect: { id: dto.organizationId } }
        : undefined,
      venue: dto.venueId ? { connect: { id: dto.venueId } } : undefined,
      homeTeam: dto.homeTeamId ? { connect: { id: dto.homeTeamId } } : undefined,
      awayTeam: dto.awayTeamId ? { connect: { id: dto.awayTeamId } } : undefined,
      competitionName: dto.competitionName,
      stage: dto.stage,
      matchDate: dto.matchDate ? new Date(dto.matchDate) : undefined,
      status: dto.status,
    };

    if (dto.ticketCategories) {
      const paidOrdersCount = await this.prisma.order.count({
        where: {
          matchId: id,
          status: {
            in: [OrderStatus.PAID, OrderStatus.PENDING],
          },
        },
      });

      if (paidOrdersCount > 0) {
        throw new BadRequestException(
          'Ticket categories cannot be changed once orders already exist for the match.',
        );
      }

      const normalizedCategories = this.normalizeTicketCategories(dto.ticketCategories);
      data.ticketQuota = normalizedCategories.totalQuota;
      data.ticketPrice = normalizedCategories.minPrice;
      data.ticketCategories = {
        deleteMany: {},
        create: normalizedCategories.items,
      };
    } else {
      if (dto.ticketQuota !== undefined) {
        data.ticketQuota = dto.ticketQuota;
      }

      if (dto.ticketPrice) {
        data.ticketPrice = new Prisma.Decimal(dto.ticketPrice);
      }
    }

    const result = await this.updateMatchWithLegacyFallback(id, data);

    this.auditLogs.log({
      userId: user.id,
      action: 'MATCH_UPDATED',
      entityType: 'Match',
      entityId: id,
      metadata: {
        homeTeam: existingMatch.homeTeam?.name,
        awayTeam: existingMatch.awayTeam?.name,
        updatedFields: Object.keys(dto).filter(
          (k) => (dto as Record<string, unknown>)[k] !== undefined,
        ),
      },
    });

    return result;
  }

  async publish(id: string, user: AuthenticatedUser) {
    const existingMatch = await this.findMatchOrThrow(id);
    this.assertCanManageMatch(user, existingMatch.organizationId);

    if (existingMatch.ticketCategories.length === 0) {
      throw new BadRequestException('Match must have at least one ticket category before publish.');
    }

    const result = await this.updateMatchWithLegacyFallback(id, {
      status: MatchStatus.PUBLISHED,
    });

    this.auditLogs.log({
      userId: user.id,
      action: 'MATCH_PUBLISHED',
      entityType: 'Match',
      entityId: id,
      metadata: {
        homeTeam: existingMatch.homeTeam?.name,
        awayTeam: existingMatch.awayTeam?.name,
      },
    });

    return result;
  }

  async deactivate(id: string, user: AuthenticatedUser) {
    const existingMatch = await this.findMatchOrThrow(id);
    this.assertCanManageMatch(user, existingMatch.organizationId);

    const result = await this.updateMatchWithLegacyFallback(id, {
      status: MatchStatus.CANCELLED,
    });

    this.auditLogs.log({
      userId: user.id,
      action: 'MATCH_DEACTIVATED',
      entityType: 'Match',
      entityId: id,
      metadata: {
        homeTeam: existingMatch.homeTeam?.name,
        awayTeam: existingMatch.awayTeam?.name,
      },
    });

    return result;
  }

  async permanentDelete(id: string, user: AuthenticatedUser) {
    const existingMatch = await this.findMatchOrThrow(id);
    this.assertCanManageMatch(user, existingMatch.organizationId);

    const [ticketCount, orderCount] = await Promise.all([
      this.prisma.ticket.count({ where: { matchId: id } }),
      this.prisma.order.count({ where: { matchId: id } }),
    ]);

    if (ticketCount > 0 || orderCount > 0) {
      throw new BadRequestException(
        `Impossible de supprimer ce match : ${ticketCount} billet${ticketCount !== 1 ? 's' : ''} et ${orderCount} commande${orderCount !== 1 ? 's' : ''} y sont liés. Désactivez-le à la place.`,
      );
    }

    try {
      const deleted = await this.prisma.match.delete({ where: { id } });

      this.auditLogs.log({
        userId: user.id,
        action: 'MATCH_DELETED',
        entityType: 'Match',
        entityId: id,
        metadata: {
          homeTeam: existingMatch.homeTeam?.name,
          awayTeam: existingMatch.awayTeam?.name,
        },
      });

      return deleted;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new BadRequestException(
          'Impossible de supprimer ce match car des données liées existent. Désactivez-le à la place.',
        );
      }
      throw error;
    }
  }

  private async findMatches(args?: Prisma.MatchFindManyArgs) {
    try {
      const matches = await this.prisma.match.findMany({
        ...args,
        include: this.defaultMatchInclude(),
        orderBy: { matchDate: 'asc' },
      });

      return this.sortMatchesByNearestDate(matches);
    } catch (error) {
      if (this.isMissingTicketCategoriesTableError(error)) {
        const matches = await this.prisma.match.findMany({
          ...args,
          include: this.legacyMatchInclude(),
          orderBy: { matchDate: 'asc' },
        });

        return this.sortMatchesByNearestDate(
          matches.map((match) => this.attachLegacyTicketCategory(match)),
        );
      }

      throw error;
    }
  }

  private async findMatchOrThrow(id: string) {
    let match;

    try {
      match = await this.prisma.match.findUnique({
        where: { id },
        include: this.defaultMatchInclude(),
      });
    } catch (error) {
      if (!this.isMissingTicketCategoriesTableError(error)) {
        throw error;
      }

      const legacyMatch = await this.prisma.match.findUnique({
        where: { id },
        include: this.legacyMatchInclude(),
      });

      match = legacyMatch ? this.attachLegacyTicketCategory(legacyMatch) : null;
    }

    if (!match) {
      throw new NotFoundException('Match not found.');
    }

    return match;
  }

  private async updateMatchWithLegacyFallback(
    id: string,
    data: Prisma.MatchUpdateInput,
  ) {
    try {
      return await this.prisma.match.update({
        where: { id },
        data,
        include: this.defaultMatchInclude(),
      });
    } catch (error) {
      if (!this.isMissingTicketCategoriesTableError(error)) {
        throw error;
      }

      const legacyData = { ...data };
      delete (legacyData as { ticketCategories?: unknown }).ticketCategories;

      const legacyMatch = await this.prisma.match.update({
        where: { id },
        data: legacyData,
        include: this.legacyMatchInclude(),
      });

      return this.attachLegacyTicketCategory(legacyMatch);
    }
  }

  private assertCanManageMatch(user: AuthenticatedUser, organizationId: string) {
    const scope = user.scope ?? buildScopeContext(user);

    if (scope.isGlobal) {
      return;
    }

    if (!scope.zoneIds.includes(organizationId)) {
      throw new ForbiddenException('You cannot manage this match.');
    }
  }

  private assertCanAccessMatch(
    user: AuthenticatedUser,
    organizationId: string,
    matchId: string,
  ) {
    const scope = user.scope ?? buildScopeContext(user);

    if (scope.isGlobal) {
      return;
    }

    const canAccessByOrganization =
      scope.organizationIds.includes(organizationId) ||
      scope.zoneAssignmentIds.includes(organizationId);
    const canAccessByMatch = scope.matchIds.includes(matchId);

    if (!canAccessByOrganization && !canAccessByMatch) {
      throw new ForbiddenException('You cannot access this match.');
    }
  }

  private defaultMatchInclude(): Prisma.MatchInclude {
    return {
      season: true,
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
      ticketCategories: {
        orderBy: [{ price: 'asc' }, { name: 'asc' }],
      },
    };
  }

  private legacyMatchInclude(): Prisma.MatchInclude {
    return {
      season: true,
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
    };
  }

  private attachLegacyTicketCategory<
    T extends {
      id: string;
      ticketPrice: Prisma.Decimal;
      ticketQuota: number | null;
      createdAt: Date;
      updatedAt: Date;
    },
  >(
    match: T,
    categoryOverride?: {
      name: string;
      price: Prisma.Decimal;
      quota: number | null;
      soldCount: number;
      badgeColor: string;
    },
  ) {
    return {
      ...match,
      ticketCategories: [
        {
          id: `legacy-${match.id}`,
          matchId: match.id,
          name: categoryOverride?.name ?? 'Populaire',
          price: categoryOverride?.price ?? match.ticketPrice,
          quota: categoryOverride?.quota ?? match.ticketQuota,
          soldCount: categoryOverride?.soldCount ?? 0,
          badgeColor: categoryOverride?.badgeColor ?? '#0F766E',
          createdAt: match.createdAt,
          updatedAt: match.updatedAt,
        },
      ],
    };
  }

  private isMissingTicketCategoriesTableError(error: unknown) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2021'
    );
  }

  private buildScopeWhere(
    scope: ReturnType<typeof buildScopeContext>,
  ): Prisma.MatchWhereInput {
    return {
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
  }

  private buildMatchFilters(query: ListMatchesQueryDto): Prisma.MatchWhereInput | undefined {
    const and: Prisma.MatchWhereInput[] = [];

    if (query.q?.trim()) {
      const keyword = query.q.trim();
      and.push({
        OR: [
          {
            competitionName: {
              contains: keyword,
              mode: 'insensitive',
            },
          },
          {
            homeTeam: {
              is: {
                name: {
                  contains: keyword,
                  mode: 'insensitive',
                },
              },
            },
          },
          {
            awayTeam: {
              is: {
                name: {
                  contains: keyword,
                  mode: 'insensitive',
                },
              },
            },
          },
          {
            organization: {
              is: {
                name: {
                  contains: keyword,
                  mode: 'insensitive',
                },
              },
            },
          },
        ],
      });
    }

    if (query.zoneId) {
      and.push({
        organizationId: query.zoneId,
      });
    }

    if (query.regionId || query.departmentId || query.communeId) {
      and.push({
        organization: {
          is: {
            regionId: query.regionId,
            departmentId: query.departmentId,
            communeId: query.communeId,
          },
        },
      });
    }

    if (query.seasonId) {
      and.push({
        seasonId: query.seasonId,
      });
    }

    if (query.status) {
      and.push({
        status: query.status,
      });
    }

    // Exclude past matches when fetching PUBLISHED matches without an explicit date range
    if (query.status === MatchStatus.PUBLISHED && !query.fromDate) {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      and.push({ matchDate: { gte: startOfToday } });
    }

    if (query.fromDate || query.toDate) {
      and.push({
        matchDate: {
          gte: query.fromDate ? new Date(query.fromDate) : undefined,
          lte: query.toDate ? new Date(query.toDate) : undefined,
        },
      });
    }

    return and.length > 0 ? { AND: and } : undefined;
  }

  private sortMatchesByNearestDate<T extends { matchDate: Date }>(matches: T[]) {
    const now = Date.now();

    return [...matches].sort((left, right) => {
      const leftDistance = Math.abs(left.matchDate.getTime() - now);
      const rightDistance = Math.abs(right.matchDate.getTime() - now);

      if (leftDistance === rightDistance) {
        return left.matchDate.getTime() - right.matchDate.getTime();
      }

      return leftDistance - rightDistance;
    });
  }

  private normalizeTicketCategories(categories: MatchTicketCategoryDto[]) {
    if (!categories || categories.length === 0) {
      throw new BadRequestException('At least one ticket category is required.');
    }

    const items = categories.map((category) => ({
      name: category.name.trim(),
      price: new Prisma.Decimal(category.price),
      quota: category.quota ?? null,
      soldCount: 0,
      badgeColor: category.badgeColor,
    }));

    const uniqueNames = new Set(items.map((item) => item.name.toLowerCase()));

    if (uniqueNames.size !== items.length) {
      throw new BadRequestException('Ticket category names must be unique within a match.');
    }

    const totalQuota = items.some((item) => item.quota === null)
      ? null
      : items.reduce((sum, item) => sum + (item.quota as number), 0);
    const minPrice = items.reduce(
      (lowest, item) => (item.price.lessThan(lowest) ? item.price : lowest),
      items[0].price,
    );

    return {
      items,
      totalQuota,
      minPrice,
    };
  }

  private resolveCategoryInput(dto: CreateMatchDto) {
    if (dto.ticketCategories && dto.ticketCategories.length > 0) {
      const normalized = this.normalizeTicketCategories(dto.ticketCategories);

      return {
        ...normalized,
        primaryCategory: normalized.items[0],
      };
    }

    if (dto.ticketPrice && dto.ticketQuota !== undefined) {
      const primaryCategory = {
        name: 'Populaire',
        price: new Prisma.Decimal(dto.ticketPrice),
        quota: dto.ticketQuota,
        soldCount: 0,
        badgeColor: '#0F766E',
      };

      return {
        items: [primaryCategory],
        totalQuota: dto.ticketQuota,
        minPrice: primaryCategory.price,
        primaryCategory,
      };
    }

    throw new BadRequestException(
      'Either ticketCategories or legacy ticketPrice/ticketQuota fields are required.',
    );
  }
}
