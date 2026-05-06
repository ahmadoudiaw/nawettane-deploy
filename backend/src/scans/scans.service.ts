import { Injectable } from '@nestjs/common';
import { ScanResult, TicketStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ValidateScanDto } from './dto/validate-scan.dto';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { buildScopeContext } from '../common/utils/scope.util';

@Injectable()
export class ScansService {
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
