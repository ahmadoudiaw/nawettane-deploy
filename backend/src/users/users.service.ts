import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Role, UserStatus } from '@prisma/client';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { buildScopeContext } from '../common/utils/scope.util';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async list(user: AuthenticatedUser) {
    const scope = user.scope ?? buildScopeContext(user);

    return this.prisma.user.findMany({
      where: this.buildUserScopeWhere(scope),
      include: this.defaultAdminInclude(),
      orderBy: [{ fullName: 'asc' }],
    });
  }

  async getById(id: string, user: AuthenticatedUser) {
    const targetUser = await this.prisma.user.findUnique({
      where: { id },
      include: this.defaultAdminInclude(),
    });

    if (!targetUser) {
      throw new NotFoundException('User not found.');
    }

    const scope = user.scope ?? buildScopeContext(user);

    if (!scope.isGlobal && !this.isUserInScope(targetUser, scope.organizationIds)) {
      throw new ForbiddenException('You cannot access this user.');
    }

    return targetUser;
  }

  async create(dto: CreateUserDto, actor?: AuthenticatedUser) {
    const passwordHash = dto.password ? await bcrypt.hash(dto.password, 10) : undefined;

    const result = await this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        role: dto.role,
        status: dto.status ?? UserStatus.ACTIVE,
        organizationAssignments: dto.organizationIds?.length
          ? {
              create: dto.organizationIds.map((organizationId, index) => ({
                organizationId,
                isPrimary: index === 0,
              })),
            }
          : undefined,
      },
      include: this.defaultAdminInclude(),
    });

    this.auditLogs.log({
      userId: actor?.id ?? null,
      action: 'USER_CREATED',
      entityType: 'User',
      entityId: result.id,
      metadata: { fullName: result.fullName, role: result.role, phone: result.phone },
    });

    return result;
  }

  async update(id: string, dto: UpdateUserDto, actor?: AuthenticatedUser) {
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found.');
    }

    const passwordHash = dto.password ? await bcrypt.hash(dto.password, 10) : undefined;

    const result = await this.prisma.$transaction(async (tx) => {
      if (dto.organizationIds) {
        await tx.userOrganizationAssignment.deleteMany({
          where: { userId: id },
        });
      }

      return tx.user.update({
        where: { id },
        data: {
          fullName: dto.fullName,
          email: dto.email,
          phone: dto.phone,
          passwordHash,
          role: dto.role,
          status: dto.status,
          organizationAssignments: dto.organizationIds
            ? {
                create: dto.organizationIds.map((organizationId, index) => ({
                  organizationId,
                  isPrimary: index === 0,
                })),
              }
            : undefined,
        },
        include: this.defaultAdminInclude(),
      });
    });

    this.auditLogs.log({
      userId: actor?.id ?? null,
      action: 'USER_UPDATED',
      entityType: 'User',
      entityId: id,
      metadata: {
        fullName: existingUser.fullName,
        updatedFields: Object.keys(dto).filter(
          (k) => (dto as Record<string, unknown>)[k] !== undefined,
        ),
      },
    });

    return result;
  }

  async softDelete(id: string, actor?: AuthenticatedUser) {
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found.');
    }

    const result = await this.prisma.user.update({
      where: { id },
      data: { status: UserStatus.INACTIVE },
      include: this.defaultAdminInclude(),
    });

    this.auditLogs.log({
      userId: actor?.id ?? null,
      action: 'USER_DEACTIVATED',
      entityType: 'User',
      entityId: id,
      metadata: {
        fullName: existingUser.fullName,
        phone: existingUser.phone,
        role: existingUser.role,
      },
    });

    return result;
  }

  async findAdminByIdentifier(identifier: string) {
    return this.prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { phone: identifier }],
        role: { not: Role.SUPPORTER },
      },
    });
  }

  async buildAuthenticatedUser(userId: string): Promise<AuthenticatedUser> {
    const [user, organizations] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          organizationAssignments: {
            include: { organization: true },
          },
          zoneAssignments: true,
          matchAssignments: true,
        },
      }),
      this.prisma.organization.findMany({
        select: { id: true, parentId: true },
      }),
    ]);

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const directOrganizationIds = user.organizationAssignments.map(
      (assignment) => assignment.organizationId,
    );
    const descendants = this.collectDescendantOrganizationIds(
      directOrganizationIds,
      organizations,
    );

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      assignments: user.organizationAssignments.map((assignment) => ({
        organizationId: assignment.organizationId,
        organizationType: assignment.organization.type,
      })),
      accessibleOrganizationIds: descendants,
      zoneAssignmentIds: user.zoneAssignments.map((assignment) => assignment.organizationId),
      matchAssignmentIds: user.matchAssignments.map((assignment) => assignment.matchId),
    };
  }

  private collectDescendantOrganizationIds(
    roots: string[],
    organizations: Array<{ id: string; parentId: string | null }>,
  ): string[] {
    const byParentId = new Map<string, string[]>();

    for (const organization of organizations) {
      if (!organization.parentId) continue;
      const children = byParentId.get(organization.parentId) ?? [];
      children.push(organization.id);
      byParentId.set(organization.parentId, children);
    }

    const visited = new Set<string>(roots);
    const queue = [...roots];

    while (queue.length > 0) {
      const currentId = queue.shift();
      if (!currentId) continue;
      for (const childId of byParentId.get(currentId) ?? []) {
        if (visited.has(childId)) continue;
        visited.add(childId);
        queue.push(childId);
      }
    }

    return [...visited];
  }

  private defaultAdminInclude(): Prisma.UserInclude {
    return {
      organizationAssignments: {
        include: { organization: true },
      },
      zoneAssignments: {
        include: { organization: true },
      },
    };
  }

  private buildUserScopeWhere(
    scope: ReturnType<typeof buildScopeContext>,
  ): Prisma.UserWhereInput {
    if (scope.isGlobal) {
      return { role: { not: Role.SUPPORTER } };
    }

    return {
      role: { not: Role.SUPPORTER },
      OR: [
        {
          organizationAssignments: {
            some: { organizationId: { in: scope.organizationIds } },
          },
        },
        {
          zoneAssignments: {
            some: { organizationId: { in: scope.organizationIds } },
          },
        },
      ],
    };
  }

  private isUserInScope(
    targetUser: Prisma.UserGetPayload<{
      include: ReturnType<UsersService['defaultAdminInclude']>;
    }>,
    organizationIds: string[],
  ) {
    return (
      targetUser.organizationAssignments.some((assignment) =>
        organizationIds.includes(assignment.organizationId),
      ) ||
      targetUser.zoneAssignments.some((assignment) =>
        organizationIds.includes(assignment.organizationId),
      )
    );
  }
}
