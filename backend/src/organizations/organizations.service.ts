import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrganizationStatus, OrganizationType, Prisma } from '@prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { buildScopeContext } from '../common/utils/scope.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async getTree(user: AuthenticatedUser) {
    const organizations = await this.prisma.organization.findMany({
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
    const scope = user.scope ?? buildScopeContext(user);
    const allowedIds = scope.isGlobal
      ? new Set(organizations.map((organization) => organization.id))
      : new Set(scope.organizationIds);

    const byParentId = new Map<string | null, typeof organizations>();

    for (const organization of organizations) {
      if (!allowedIds.has(organization.id)) {
        continue;
      }

      const key = organization.parentId ?? null;
      const siblings = byParentId.get(key) ?? [];
      siblings.push(organization);
      byParentId.set(key, siblings);
    }

    type OrganizationTreeNode = (typeof organizations)[number] & {
      children: OrganizationTreeNode[];
    };

    const buildNode = (parentId: string | null): OrganizationTreeNode[] =>
      (byParentId.get(parentId) ?? []).map((organization) => ({
        ...organization,
        children: buildNode(organization.id),
      }));

    if (scope.isGlobal) {
      return buildNode(null);
    }

    const assignedRootIds = user.assignments
      .map((assignment) => assignment.organizationId)
      .filter((organizationId) => allowedIds.has(organizationId));

    return assignedRootIds.map((organizationId) => {
      const organization = organizations.find((item) => item.id === organizationId);

      if (!organization) {
        return null;
      }

      return {
        ...organization,
        children: buildNode(organization.id),
      };
    }).filter((node): node is NonNullable<typeof node> => node !== null);
  }

  async list(user: AuthenticatedUser, type?: OrganizationType) {
    const scope = user.scope ?? buildScopeContext(user);
    const where: Prisma.OrganizationWhereInput = {};

    if (type) {
      where.type = type;
    }

    if (!scope.isGlobal) {
      where.id = { in: scope.organizationIds };
    }

    return this.prisma.organization.findMany({
      where,
      include: this.defaultInclude(),
      orderBy: [{ name: 'asc' }],
    });
  }

  async create(dto: CreateOrganizationDto, user: AuthenticatedUser) {
    if (dto.type === OrganizationType.ZONE) {
      await this.validateZoneInput(dto.communeId, dto.parentId, dto.name);
    }

    const scope = user.scope ?? buildScopeContext(user);

    if (!scope.isGlobal && dto.parentId && !scope.organizationIds.includes(dto.parentId)) {
      throw new ForbiddenException('You cannot create an organization outside your scope.');
    }

    return this.prisma.organization.create({
      data: {
        name: dto.name,
        type: dto.type,
        parentId: dto.parentId,
        regionId: dto.regionId,
        departmentId: dto.departmentId,
        communeId: dto.communeId,
        status: dto.status ?? OrganizationStatus.ACTIVE,
      },
      include: this.defaultInclude(),
    });
  }

  async update(id: string, dto: UpdateOrganizationDto, user: AuthenticatedUser) {
    const existing = await this.prisma.organization.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException('Organization not found.');
    }

    // If updating a zone and commune/parent/name is changing, re-validate
    if (existing.type === OrganizationType.ZONE) {
      const effectiveCommuneId = dto.communeId !== undefined ? dto.communeId : existing.communeId ?? undefined;
      const effectiveParentId = dto.parentId !== undefined ? dto.parentId : existing.parentId ?? undefined;
      const effectiveName = dto.name !== undefined ? dto.name : existing.name;
      const communeChanged = dto.communeId !== undefined && dto.communeId !== existing.communeId;
      const parentChanged = dto.parentId !== undefined && dto.parentId !== existing.parentId;
      const nameChanged = dto.name !== undefined && dto.name !== existing.name;

      if (communeChanged || parentChanged || nameChanged) {
        await this.validateZoneInput(effectiveCommuneId, effectiveParentId, effectiveName, id);
      }
    }

    const scope = user.scope ?? buildScopeContext(user);

    if (!scope.isGlobal && !scope.organizationIds.includes(id)) {
      throw new ForbiddenException('You cannot modify this organization.');
    }

    return this.prisma.organization.update({
      where: { id },
      data: {
        name: dto.name,
        parentId: dto.parentId,
        regionId: dto.regionId,
        departmentId: dto.departmentId,
        communeId: dto.communeId,
        status: dto.status,
      },
      include: this.defaultInclude(),
    });
  }

  async softDelete(id: string, user: AuthenticatedUser) {
    const existing = await this.prisma.organization.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException('Organization not found.');
    }

    const scope = user.scope ?? buildScopeContext(user);

    if (!scope.isGlobal && !scope.organizationIds.includes(id)) {
      throw new ForbiddenException('You cannot modify this organization.');
    }

    return this.prisma.organization.update({
      where: { id },
      data: { status: OrganizationStatus.INACTIVE },
      include: this.defaultInclude(),
    });
  }

  async permanentDelete(id: string, user: AuthenticatedUser) {
    const existing = await this.prisma.organization.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException('Organization not found.');
    }

    const scope = user.scope ?? buildScopeContext(user);

    if (!scope.isGlobal && !scope.organizationIds.includes(id)) {
      throw new ForbiddenException('You cannot modify this organization.');
    }

    const [teamCount, venueCount, matchCount] = await Promise.all([
      this.prisma.team.count({ where: { organizationId: id } }),
      this.prisma.venue.count({ where: { organizationId: id } }),
      this.prisma.match.count({ where: { organizationId: id } }),
    ]);

    if (teamCount > 0 || venueCount > 0 || matchCount > 0) {
      throw new BadRequestException(
        'Impossible de supprimer cette zone car elle est liée à des équipes, stades ou matchs.',
      );
    }

    await this.prisma.organization.delete({ where: { id } });

    this.auditLogs.log({
      userId: user.id,
      action: 'ZONE_DELETED',
      entityType: 'organization',
      entityId: id,
      metadata: { name: existing.name, type: existing.type },
    });
  }

  async getById(id: string, user: AuthenticatedUser) {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        ...this.defaultInclude(),
        children: true,
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found.');
    }

    const scope = user.scope ?? buildScopeContext(user);

    if (!scope.isGlobal && !scope.organizationIds.includes(id)) {
      throw new ForbiddenException('You cannot access this organization.');
    }

    return organization;
  }

  private async validateZoneInput(communeId?: string, parentId?: string, name?: string, excludeId?: string) {
    if (!communeId) {
      throw new BadRequestException('Une zone doit être rattachée à une commune.');
    }

    const commune = await this.prisma.commune.findUnique({
      where: { id: communeId },
    });
    if (!commune) {
      throw new NotFoundException('Commune introuvable.');
    }

    if (name) {
      const duplicate = await this.prisma.organization.findFirst({
        where: {
          communeId,
          type: OrganizationType.ZONE,
          name: { equals: name, mode: 'insensitive' },
          ...(excludeId ? { id: { not: excludeId } } : {}),
        },
      });
      if (duplicate) {
        throw new BadRequestException('Une zone avec ce nom existe déjà dans cette commune.');
      }
    }

    if (parentId) {
      const parent = await this.prisma.organization.findUnique({ where: { id: parentId } });
      if (!parent) throw new NotFoundException('Organisation parente introuvable.');
      if (parent.type !== OrganizationType.ODCAV) {
        throw new BadRequestException("Le parent d'une zone doit être un ODCAV.");
      }
      if (parent.departmentId && parent.departmentId !== commune.departmentId) {
        throw new BadRequestException(
          "Incohérence territoriale : l'ODCAV et la commune ne sont pas dans le même département.",
        );
      }
    }
  }

  private defaultInclude(): Prisma.OrganizationInclude {
    return {
      parent: true,
      commune: {
        include: {
          department: { include: { region: true } },
        },
      },
    };
  }
}
