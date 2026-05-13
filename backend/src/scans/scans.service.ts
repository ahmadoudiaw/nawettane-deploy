import { Injectable, Logger } from '@nestjs/common';
import { ScanResult, TicketStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ValidateScanDto } from './dto/validate-scan.dto';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { buildScopeContext } from '../common/utils/scope.util';

@Injectable()
export class ScansService {
  private readonly logger = new Logger(ScansService.name);

  constructor(private readonly prisma: PrismaService) {}

  async validate(dto: ValidateScanDto, user: AuthenticatedUser) {
    const ticket = await this.prisma.ticket.findUnique({
      where: {
        ticketCode: dto.ticketCode,
      },
      include: {
        match: true,
      },
    });

    if (!ticket || ticket.matchId !== dto.matchId) {
      return this.createScanResult(dto.matchId, user.id, null, ScanResult.INVALID, dto.deviceLabel);
    }

    const matchEndOfDay = new Date(ticket.match.matchDate);
    matchEndOfDay.setHours(23, 59, 59, 999);
    if (new Date() > matchEndOfDay) {
      this.logger.warn(
        `[SCAN_BLOCKED] matchId=${ticket.matchId} matchDate=${ticket.match.matchDate.toISOString()} agentId=${user.id}`,
      );
      return {
        result: ScanResult.INVALID,
        reason: 'MATCH_ENDED' as const,
        message: "Ce match est terminé. Le scan n'est plus autorisé.",
      };
    }

    const scope = user.scope ?? buildScopeContext(user);
    const canAccessByOrganization =
      scope.isGlobal ||
      scope.organizationIds.includes(ticket.match.organizationId) ||
      scope.zoneAssignmentIds.includes(ticket.match.organizationId);
    const canAccessByMatch = scope.matchIds.includes(ticket.matchId);

    if (!canAccessByOrganization && !canAccessByMatch) {
      return this.createScanResult(
        ticket.matchId,
        user.id,
        ticket.id,
        ScanResult.OUT_OF_SCOPE,
        dto.deviceLabel,
      );
    }

    if (ticket.status === TicketStatus.CANCELLED) {
      const scanRecord = await this.createScanResult(
        ticket.matchId,
        user.id,
        ticket.id,
        ScanResult.INVALID,
        dto.deviceLabel,
      );
      return {
        ...scanRecord,
        reason: 'TICKET_CANCELLED' as const,
        message: 'Ce ticket a été annulé.',
      };
    }

    if (ticket.status === TicketStatus.USED || ticket.usedAt) {
      return this.createScanResult(
        ticket.matchId,
        user.id,
        ticket.id,
        ScanResult.ALREADY_USED,
        dto.deviceLabel,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.ticket.update({
        where: { id: ticket.id },
        data: {
          status: TicketStatus.USED,
          usedAt: new Date(),
        },
      });

      const scan = await tx.ticketScan.create({
        data: {
          ticketId: ticket.id,
          matchId: ticket.matchId,
          scannedById: user.id,
          scanResult: ScanResult.VALID,
          deviceLabel: dto.deviceLabel,
        },
      });

      return {
        result: ScanResult.VALID,
        ticketId: ticket.id,
        scanId: scan.id,
      };
    });
  }

  async getAgentStats(agentId: string, matchId: string) {
    this.logger.log(`[SCAN_STATS] agentId=${agentId} matchId=${matchId}`);

    const [valid, alreadyUsed, invalid, outOfScope] = await Promise.all([
      this.prisma.ticketScan.count({
        where: { scannedById: agentId, matchId, scanResult: ScanResult.VALID },
      }),
      this.prisma.ticketScan.count({
        where: { scannedById: agentId, matchId, scanResult: ScanResult.ALREADY_USED },
      }),
      this.prisma.ticketScan.count({
        where: { scannedById: agentId, matchId, scanResult: ScanResult.INVALID },
      }),
      this.prisma.ticketScan.count({
        where: { scannedById: agentId, matchId, scanResult: ScanResult.OUT_OF_SCOPE },
      }),
    ]);

    const total = valid + alreadyUsed + invalid + outOfScope;
    this.logger.log(
      `[SCAN_STATS] valid=${valid} alreadyUsed=${alreadyUsed} invalid=${invalid} outOfScope=${outOfScope} total=${total}`,
    );

    return { valid, alreadyUsed, invalid, outOfScope };
  }

  private async createScanResult(
    matchId: string,
    scannedById: string,
    ticketId: string | null,
    result: ScanResult,
    deviceLabel?: string,
  ) {
    if (ticketId) {
      const scan = await this.prisma.ticketScan.create({
        data: {
          ticketId,
          matchId,
          scannedById,
          scanResult: result,
          deviceLabel,
        },
      });

      return {
        result,
        scanId: scan.id,
        ticketId,
      };
    }

    return {
      result,
    };
  }
}
