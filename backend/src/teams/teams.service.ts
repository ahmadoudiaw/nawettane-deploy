import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AgeCategory, OrganizationStatus, OrganizationType, Prisma } from '@prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { buildScopeContext } from '../common/utils/scope.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';

@Injectable()
export class TeamsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async list(user: AuthenticatedUser) {
    const scope = user.scope ?? buildScopeContext(user);

    if (scope.isGlobal) {
      return this.prisma.team.findMany({
        include: this.defaultInclude(),
        orderBy: [{ name: 'asc' }],
      });
    }

    return this.prisma.team.findMany({
      where: {
        organizationId: {
          in: [...scope.organizationIds, ...scope.zoneAssignmentIds],
        },
      },
      include: this.defaultInclude(),
      orderBy: [{ name: 'asc' }],
    });
  }

  async create(dto: CreateTeamDto, user: AuthenticatedUser) {
    await this.ensureZoneOrganization(dto.organizationId);
    this.assertCanManage(user, dto.organizationId);
    await this.checkDuplicateTeamName(dto.organizationId, dto.name, dto.category);

    return this.prisma.team.create({
      data: {
        organizationId: dto.organizationId,
        name: dto.name,
        category: dto.category,
        status: dto.status,
      },
      include: this.defaultInclude(),
    });
  }

  async getById(id: string, user: AuthenticatedUser) {
    const team = await this.prisma.team.findUnique({
      where: { id },
      include: this.defaultInclude(),
    });

    if (!team) {
      throw new NotFoundException('Team not found.');
    }

    this.assertCanRead(user, team.organizationId);
    return team;
  }

  async update(id: string, dto: UpdateTeamDto, user: AuthenticatedUser) {
    const existing = await this.prisma.team.findUnique({
      where: { id },
      include: {
        organization: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Team not found.');
    }

    this.assertCanManage(user, existing.organizationId);

    if (dto.organizationId && dto.organizationId !== existing.organizationId) {
      await this.ensureZoneOrganization(dto.organizationId);
      this.assertCanManage(user, dto.organizationId);
    }

    const effectiveOrgId = dto.organizationId ?? existing.organizationId;
    const effectiveName = dto.name ?? existing.name;
    const effectiveCategory = dto.category ?? existing.category;
    const nameChanged = dto.name !== undefined && dto.name !== existing.name;
    const orgChanged = dto.organizationId !== undefined && dto.organizationId !== existing.organizationId;
    const categoryChanged = dto.category !== undefined && dto.category !== existing.category;
    if (nameChanged || orgChanged || categoryChanged) {
      await this.checkDuplicateTeamName(effectiveOrgId, effectiveName, effectiveCategory, id);
    }

    return this.prisma.team.update({
      where: { id },
      data: {
        organizationId: dto.organizationId,
        name: dto.name,
        category: dto.category,
        status: dto.status,
      },
      include: this.defaultInclude(),
    });
  }

  async softDelete(id: string, user: AuthenticatedUser) {
    const existing = await this.prisma.team.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Team not found.');
    }

    this.assertCanManage(user, existing.organizationId);

    return this.prisma.team.update({
      where: { id },
      data: {
        status: OrganizationStatus.INACTIVE,
      },
      include: this.defaultInclude(),
    });
  }

  async delete(id: string, user: AuthenticatedUser) {
    const existing = await this.prisma.team.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Team not found.');
    }

    this.assertCanManage(user, existing.organizationId);

    const matchCount = await this.prisma.match.count({
      where: {
        OR: [{ homeTeamId: id }, { awayTeamId: id }],
      },
    });

    if (matchCount > 0) {
      throw new BadRequestException(
        'Impossible de supprimer cette équipe car elle est liée à des matchs.',
      );
    }

    const deleted = await this.prisma.team.delete({ where: { id } });

    this.auditLogs.log({
      userId: user.id,
      action: 'TEAM_DELETED',
      entityType: 'team',
      entityId: id,
      metadata: { name: existing.name, category: existing.category },
    });

    return deleted;
  }

  private async checkDuplicateTeamName(
    organizationId: string,
    name: string,
    category: AgeCategory,
    excludeId?: string,
  ): Promise<void> {
    const duplicate = await this.prisma.team.findFirst({
      where: {
        organizationId,
        name: { equals: name, mode: 'insensitive' },
        category,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    if (duplicate) {
      throw new BadRequestException(
        'Une équipe avec ce nom existe déjà dans cette zone pour cette catégorie.',
      );
    }
  }

  private async ensureZoneOrganization(organizationId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found.');
    }

    if (organization.type !== OrganizationType.ZONE) {
      throw new ForbiddenException('Teams can only be assigned to zone organizations.');
    }
  }

  private assertCanManage(user: AuthenticatedUser, organizationId: string) {
    const scope = user.scope ?? buildScopeContext(user);

    if (scope.isGlobal) {
      return;
    }

    if (!scope.zoneIds.includes(organizationId)) {
      throw new ForbiddenException('You cannot manage teams outside your zone scope.');
    }
  }

  private assertCanRead(user: AuthenticatedUser, organizationId: string) {
    const scope = user.scope ?? buildScopeContext(user);

    if (scope.isGlobal) {
      return;
    }

    if (
      !scope.organizationIds.includes(organizationId) &&
      !scope.zoneAssignmentIds.includes(organizationId)
    ) {
      throw new ForbiddenException('You cannot access this team.');
    }
  }

  private defaultInclude(): Prisma.TeamInclude {
    return {
      organization: {
        include: {
          commune: {
            include: {
              department: {
                include: {
                  region: true,
                  organizations: {
                    where: { type: OrganizationType.ODCAV },
                    take: 1,
                    select: { id: true, name: true, type: true },
                  },
                },
              },
            },
          },
        },
      },
    };
  }
}
