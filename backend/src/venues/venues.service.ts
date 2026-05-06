import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrganizationStatus, OrganizationType, Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { buildScopeContext } from '../common/utils/scope.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVenueDto } from './dto/create-venue.dto';
import { UpdateVenueDto } from './dto/update-venue.dto';

@Injectable()
export class VenuesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthenticatedUser) {
    const scope = user.scope ?? buildScopeContext(user);

    if (scope.isGlobal) {
      return this.prisma.venue.findMany({
        include: this.defaultInclude(),
        orderBy: [{ name: 'asc' }],
      });
    }

    // Scoped users see their zone-linked venues plus all commune-based venues
    return this.prisma.venue.findMany({
      where: {
        OR: [
          {
            organizationId: {
              in: [...scope.organizationIds, ...scope.zoneAssignmentIds],
            },
          },
          { communeId: { not: null } },
        ],
      },
      include: this.defaultInclude(),
      orderBy: [{ name: 'asc' }],
    });
  }

  async create(dto: CreateVenueDto, user: AuthenticatedUser) {
    if (!dto.communeId && !dto.organizationId) {
      throw new BadRequestException('communeId or organizationId is required.');
    }

    if (dto.communeId && !dto.organizationId) {
      // Commune-based venue: only global-scope users can create
      this.assertGlobalScope(user);
      return this.prisma.venue.create({
        data: {
          communeId: dto.communeId,
          name: dto.name,
          address: dto.address,
          capacity: dto.capacity,
          status: dto.status ?? OrganizationStatus.ACTIVE,
        },
        include: this.defaultInclude(),
      });
    }

    // Legacy zone-based venue
    await this.ensureZoneOrganization(dto.organizationId!);
    this.assertCanManage(user, dto.organizationId!);

    return this.prisma.venue.create({
      data: {
        organizationId: dto.organizationId,
        communeId: dto.communeId,
        name: dto.name,
        address: dto.address,
        capacity: dto.capacity,
        status: dto.status ?? OrganizationStatus.ACTIVE,
      },
      include: this.defaultInclude(),
    });
  }

  async getById(id: string, user: AuthenticatedUser) {
    const venue = await this.prisma.venue.findUnique({
      where: { id },
      include: this.defaultInclude(),
    });

    if (!venue) {
      throw new NotFoundException('Venue not found.');
    }

    this.assertCanRead(user, venue.organizationId);
    return venue;
  }

  async update(id: string, dto: UpdateVenueDto, user: AuthenticatedUser) {
    const existing = await this.prisma.venue.findUnique({
      where: { id },
      include: { organization: true },
    });

    if (!existing) {
      throw new NotFoundException('Venue not found.');
    }

    // Determine effective organizationId after update
    const newOrgId = dto.organizationId !== undefined ? dto.organizationId : existing.organizationId;

    if (newOrgId) {
      // Zone-based path: validate zone and manage scope
      if (dto.organizationId && dto.organizationId !== existing.organizationId) {
        await this.ensureZoneOrganization(dto.organizationId);
        this.assertCanManage(user, dto.organizationId);
      } else {
        this.assertCanManage(user, existing.organizationId);
      }
    } else {
      // Commune-based path: only global scope can manage
      this.assertGlobalScope(user);
    }

    return this.prisma.venue.update({
      where: { id },
      data: {
        organizationId: dto.organizationId,
        communeId: dto.communeId,
        name: dto.name,
        address: dto.address,
        capacity: dto.capacity,
        status: dto.status,
      },
      include: this.defaultInclude(),
    });
  }

  async softDelete(id: string, user: AuthenticatedUser) {
    const existing = await this.prisma.venue.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException('Venue not found.');
    }

    if (existing.organizationId) {
      this.assertCanManage(user, existing.organizationId);
    } else {
      this.assertGlobalScope(user);
    }

    return this.prisma.venue.update({
      where: { id },
      data: { status: OrganizationStatus.INACTIVE },
      include: this.defaultInclude(),
    });
  }

  private async ensureZoneOrganization(organizationId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found.');
    }

    if (organization.type !== OrganizationType.ZONE) {
      throw new ForbiddenException('Venues can only be assigned to zone organizations.');
    }
  }

  private assertGlobalScope(user: AuthenticatedUser) {
    const scope = user.scope ?? buildScopeContext(user);
    if (!scope.isGlobal) {
      throw new ForbiddenException('Only global admins can manage commune-based venues.');
    }
  }

  private assertCanManage(user: AuthenticatedUser, organizationId: string | null) {
    const scope = user.scope ?? buildScopeContext(user);
    if (scope.isGlobal) return;
    if (!organizationId || !scope.zoneIds.includes(organizationId)) {
      throw new ForbiddenException('You cannot manage venues outside your zone scope.');
    }
  }

  private assertCanRead(user: AuthenticatedUser, organizationId: string | null) {
    const scope = user.scope ?? buildScopeContext(user);
    if (scope.isGlobal) return;
    // Commune-based venues are readable by all authenticated users
    if (!organizationId) return;
    if (
      !scope.organizationIds.includes(organizationId) &&
      !scope.zoneAssignmentIds.includes(organizationId)
    ) {
      throw new ForbiddenException('You cannot access this venue.');
    }
  }

  private defaultInclude(): Prisma.VenueInclude {
    return {
      organization: {
        include: { commune: true },
      },
      commune: {
        include: {
          department: { include: { region: true } },
        },
      },
    };
  }
}
