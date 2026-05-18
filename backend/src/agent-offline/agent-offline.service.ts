import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { MatchStatus, ScanResult, TicketStatus } from '@prisma/client';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { buildScopeContext } from '../common/utils/scope.util';
import { PrismaService } from '../prisma/prisma.service';
import { OfflineSyncDto } from './dto/offline-sync.dto';

@Injectable()
export class AgentOfflineService {
  private readonly logger = new Logger(AgentOfflineService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getOfflineTickets(matchId: string, user: AuthenticatedUser) {
    // 1. Match must exist
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      select: { id: true, organizationId: true, matchDate: true, status: true },
    });

    if (!match) {
      throw new NotFoundException('Match introuvable.');
    }

    // 2. Only PUBLISHED matches can be prepared for offline
    if (match.status !== MatchStatus.PUBLISHED) {
      throw new ForbiddenException(
        "Ce match n'est pas disponible pour la préparation hors ligne.",
      );
    }

    // 3. Same end-of-day date gate as the scan endpoint
    const matchEndOfDay = new Date(match.matchDate);
    matchEndOfDay.setHours(23, 59, 59, 999);
    if (new Date() > matchEndOfDay) {
      throw new ForbiddenException(
        "Ce match est terminé. La préparation hors ligne n'est plus disponible.",
      );
    }

    // 4. Scope check — identical pattern to scans.service.ts
    const scope = user.scope ?? buildScopeContext(user);
    const canAccess =
      scope.isGlobal ||
      scope.organizationIds.includes(match.organizationId) ||
      scope.zoneAssignmentIds.includes(match.organizationId) ||
      scope.matchIds.includes(match.id);

    if (!canAccess) {
      throw new ForbiddenException(
        "Vous n'êtes pas autorisé à préparer ce match en mode hors ligne.",
      );
    }

    // 5. Fetch non-cancelled tickets — read-only, no data mutation
    const tickets = await this.prisma.ticket.findMany({
      where: {
        matchId,
        status: { not: TicketStatus.CANCELLED },
      },
      select: {
        id: true,
        ticketCode: true,
        matchId: true,
        status: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    this.logger.log(
      `[OFFLINE_BOOTSTRAP] agentId=${user.id} matchId=${matchId} tickets=${tickets.length}`,
    );

    const mappedTickets = tickets.map((t) => ({
      ticketId: t.id,
      ticketCode: t.ticketCode,
      matchId: t.matchId,
      isUsed: t.status === TicketStatus.USED,
      status: t.status === TicketStatus.USED ? 'USED' : 'VALID',
      signature: null, // Reserved — HMAC signing to be added in a future security step
    }));

    return {
      matchId,
      generatedAt: new Date().toISOString(),
      count: mappedTickets.length,
      tickets: mappedTickets,
    };
  }

  async syncOfflineScans(dto: OfflineSyncDto, user: AuthenticatedUser) {
    const synced: string[] = [];
    const rejected: { localScanId: string; reason: string }[] = [];
    const conflicts: string[] = [];

    const scope = user.scope ?? buildScopeContext(user);

    // Pre-load each unique match once
    const uniqueMatchIds = [...new Set(dto.scans.map((s) => s.matchId))];
    const matchMap = new Map<
      string,
      {
        id: string;
        organizationId: string;
        matchDate: Date;
        status: MatchStatus;
      }
    >();
    for (const matchId of uniqueMatchIds) {
      const match = await this.prisma.match.findUnique({
        where: { id: matchId },
        select: {
          id: true,
          organizationId: true,
          matchDate: true,
          status: true,
        },
      });
      if (match) matchMap.set(matchId, match);
    }

    for (const scan of dto.scans) {
      const { localScanId, ticketId, ticketCode, matchId, scannedAtLocal } =
        scan;

      // 1. Match exists
      const match = matchMap.get(matchId);
      if (!match) {
        rejected.push({ localScanId, reason: 'Match introuvable.' });
        continue;
      }

      // 2. Match not finished (end-of-day gate)
      const matchEndOfDay = new Date(match.matchDate);
      matchEndOfDay.setHours(23, 59, 59, 999);
      if (new Date() > matchEndOfDay) {
        rejected.push({ localScanId, reason: 'Match terminé.' });
        continue;
      }

      // 3. Scope check
      const canAccess =
        scope.isGlobal ||
        scope.organizationIds.includes(match.organizationId) ||
        scope.zoneAssignmentIds.includes(match.organizationId) ||
        scope.matchIds.includes(match.id);
      if (!canAccess) {
        rejected.push({
          localScanId,
          reason: "Accès non autorisé à ce match.",
        });
        continue;
      }

      // 4. Ticket exists
      const ticket = await this.prisma.ticket.findUnique({
        where: { id: ticketId },
        select: { id: true, ticketCode: true, matchId: true, status: true },
      });
      if (!ticket) {
        rejected.push({ localScanId, reason: 'Ticket introuvable.' });
        continue;
      }

      // 5. Ticket belongs to this match
      if (ticket.matchId !== matchId) {
        rejected.push({
          localScanId,
          reason: 'Ticket ne correspond pas au match.',
        });
        continue;
      }

      // 6. Ticket code matches
      if (ticket.ticketCode !== ticketCode) {
        rejected.push({ localScanId, reason: 'Code ticket invalide.' });
        continue;
      }

      // 7. Ticket not cancelled
      if (ticket.status === TicketStatus.CANCELLED) {
        rejected.push({ localScanId, reason: 'Ticket annulé.' });
        continue;
      }

      // 8. Atomically mark as USED — if 0 rows updated, already used (conflict)
      const updated = await this.prisma.ticket.updateMany({
        where: { id: ticketId, status: { not: TicketStatus.USED } },
        data: { status: TicketStatus.USED },
      });

      const receivedAt = new Date();
      const syncDelayMinutes = Math.round(
        (receivedAt.getTime() - new Date(scannedAtLocal).getTime()) / 60_000,
      );

      if (updated.count === 0) {
        conflicts.push(localScanId);
        this.logger.warn(
          `[OFFLINE_SYNC] finalStatus=conflict deviceId=${dto.deviceId} agentId=${user.id} matchId=${matchId} ticketId=${ticketId} scannedAtLocal=${scannedAtLocal} receivedAtServer=${receivedAt.toISOString()} syncDelayMinutes=${syncDelayMinutes}`,
        );
        continue;
      }

      // 9. Create scan trace
      await this.prisma.ticketScan.create({
        data: {
          ticketId,
          matchId,
          scannedById: user.id,
          scanResult: ScanResult.VALID,
          scannedAt: new Date(scannedAtLocal),
          deviceLabel: dto.deviceId,
        },
      });

      synced.push(localScanId);
      this.logger.log(
        `[OFFLINE_SYNC] finalStatus=synced deviceId=${dto.deviceId} agentId=${user.id} matchId=${matchId} ticketId=${ticketId} scannedAtLocal=${scannedAtLocal} receivedAtServer=${receivedAt.toISOString()} syncDelayMinutes=${syncDelayMinutes}`,
      );
    }

    // Log rejected items
    for (const r of rejected) {
      this.logger.warn(
        `[OFFLINE_SYNC] finalStatus=rejected deviceId=${dto.deviceId} agentId=${user.id} localScanId=${r.localScanId} reason=${r.reason}`,
      );
    }

    return { synced, rejected, conflicts };
  }
}
