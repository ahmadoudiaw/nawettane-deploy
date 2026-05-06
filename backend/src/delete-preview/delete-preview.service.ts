import { Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, TicketStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type ActionType = 'DELETE' | 'DEACTIVATE' | 'CANCEL' | 'BLOCKED';

export interface DeletePreviewDep {
  label: string;
  count: number;
}

export interface DeletePreviewResult {
  entityName: string;
  actionType: ActionType;
  allowDelete: boolean;
  allowDeactivate: boolean;
  dependencies: DeletePreviewDep[];
  warningMessage: string;
}

@Injectable()
export class DeletePreviewService {
  constructor(private readonly prisma: PrismaService) {}

  async getPreview(entity: string, id: string): Promise<DeletePreviewResult> {
    switch (entity) {
      case 'zone':   return this.previewZone(id);
      case 'team':   return this.previewTeam(id);
      case 'venue':  return this.previewVenue(id);
      case 'match':  return this.previewMatch(id);
      case 'user':   return this.previewUser(id);
      case 'ticket': return this.previewTicket(id);
      default:       throw new NotFoundException(`Entité inconnue : ${entity}`);
    }
  }

  private async previewZone(id: string): Promise<DeletePreviewResult> {
    const zone = await this.prisma.organization.findUnique({ where: { id } });
    if (!zone) throw new NotFoundException('Zone introuvable.');

    const [teamCount, venueCount, matchCount] = await Promise.all([
      this.prisma.team.count({ where: { organizationId: id } }),
      this.prisma.venue.count({ where: { organizationId: id } }),
      this.prisma.match.count({ where: { organizationId: id } }),
    ]);

    const deps: DeletePreviewDep[] = [];
    if (teamCount > 0) deps.push({ label: teamCount === 1 ? 'équipe' : 'équipes', count: teamCount });
    if (venueCount > 0) deps.push({ label: venueCount === 1 ? 'stade' : 'stades', count: venueCount });
    if (matchCount > 0) deps.push({ label: matchCount === 1 ? 'match' : 'matchs', count: matchCount });

    return {
      entityName: zone.name,
      actionType: 'DEACTIVATE',
      allowDelete: false,
      allowDeactivate: true,
      dependencies: deps,
      warningMessage:
        deps.length > 0
          ? `Cette zone sera désactivée. Ses équipes et stades resteront dans le système mais ne seront plus actifs dans les listes.`
          : `Cette zone sera désactivée et n'apparaîtra plus dans les listes actives.`,
    };
  }

  private async previewTeam(id: string): Promise<DeletePreviewResult> {
    const team = await this.prisma.team.findUnique({ where: { id } });
    if (!team) throw new NotFoundException('Équipe introuvable.');

    const [homeCount, awayCount] = await Promise.all([
      this.prisma.match.count({ where: { homeTeamId: id } }),
      this.prisma.match.count({ where: { awayTeamId: id } }),
    ]);
    const matchCount = homeCount + awayCount;

    const deps: DeletePreviewDep[] = [];
    if (matchCount > 0) deps.push({ label: matchCount === 1 ? 'match' : 'matchs', count: matchCount });

    return {
      entityName: team.name,
      actionType: 'DEACTIVATE',
      allowDelete: false,
      allowDeactivate: true,
      dependencies: deps,
      warningMessage: `Cette équipe sera désactivée et ne pourra plus être assignée à de nouveaux matchs.`,
    };
  }

  private async previewVenue(id: string): Promise<DeletePreviewResult> {
    const venue = await this.prisma.venue.findUnique({ where: { id } });
    if (!venue) throw new NotFoundException('Stade introuvable.');

    const matchCount = await this.prisma.match.count({ where: { venueId: id } });

    const deps: DeletePreviewDep[] = [];
    if (matchCount > 0) deps.push({ label: matchCount === 1 ? 'match' : 'matchs', count: matchCount });

    return {
      entityName: venue.name,
      actionType: 'DEACTIVATE',
      allowDelete: false,
      allowDeactivate: true,
      dependencies: deps,
      warningMessage: `Ce stade sera désactivé et ne pourra plus être sélectionné pour de nouveaux matchs.`,
    };
  }

  private async previewMatch(id: string): Promise<DeletePreviewResult> {
    const match = await this.prisma.match.findUnique({
      where: { id },
      include: {
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } },
      },
    });
    if (!match) throw new NotFoundException('Match introuvable.');

    const [ticketCount, orderCount] = await Promise.all([
      this.prisma.ticket.count({ where: { matchId: id, status: { not: TicketStatus.CANCELLED } } }),
      this.prisma.order.count({ where: { matchId: id, status: OrderStatus.PAID } }),
    ]);

    const entityName = `${match.homeTeam.name} vs ${match.awayTeam.name}`;
    const isBlocked = ticketCount > 0 || orderCount > 0;

    const deps: DeletePreviewDep[] = [];
    if (ticketCount > 0) deps.push({ label: ticketCount === 1 ? 'billet vendu' : 'billets vendus', count: ticketCount });
    if (orderCount > 0) deps.push({ label: orderCount === 1 ? 'commande payée' : 'commandes payées', count: orderCount });

    if (isBlocked) {
      return {
        entityName,
        actionType: 'BLOCKED',
        allowDelete: false,
        allowDeactivate: true,
        dependencies: deps,
        warningMessage: `La suppression est impossible car des billets ont déjà été vendus. Vous pouvez désactiver ce match pour qu'il n'apparaisse plus dans la boutique.`,
      };
    }

    return {
      entityName,
      actionType: 'DELETE',
      allowDelete: true,
      allowDeactivate: true,
      dependencies: [],
      warningMessage: `Ce match n'a aucun billet vendu. La suppression définitive est autorisée. Cette action est irréversible.`,
    };
  }

  private async previewUser(id: string): Promise<DeletePreviewResult> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Utilisateur introuvable.');

    return {
      entityName: user.fullName,
      actionType: 'DEACTIVATE',
      allowDelete: false,
      allowDeactivate: true,
      dependencies: [],
      warningMessage: `Cet utilisateur ne pourra plus accéder à l'administration. Ses données et son historique seront conservés.`,
    };
  }

  private async previewTicket(id: string): Promise<DeletePreviewResult> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: {
        match: {
          include: {
            homeTeam: { select: { name: true } },
            awayTeam: { select: { name: true } },
          },
        },
      },
    });
    if (!ticket) throw new NotFoundException('Billet introuvable.');

    if (ticket.status === TicketStatus.CANCELLED) {
      return {
        entityName: ticket.ticketCode,
        actionType: 'BLOCKED',
        allowDelete: false,
        allowDeactivate: false,
        dependencies: [],
        warningMessage: `Ce billet est déjà annulé. Aucune action possible.`,
      };
    }

    if (ticket.status === TicketStatus.USED) {
      return {
        entityName: ticket.ticketCode,
        actionType: 'BLOCKED',
        allowDelete: false,
        allowDeactivate: false,
        dependencies: [],
        warningMessage: `Ce billet a déjà été utilisé. Aucune annulation possible.`,
      };
    }

    return {
      entityName: ticket.ticketCode,
      actionType: 'CANCEL',
      allowDelete: false,
      allowDeactivate: false,
      dependencies: [],
      warningMessage: `Billet pour ${ticket.match.homeTeam.name} vs ${ticket.match.awayTeam.name}. L'annulation est irréversible — un motif est requis.`,
    };
  }
}
