import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';

@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger(AuditLogsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Fire-and-forget — never throws, never blocks the caller.
  log(data: {
    userId?: string | null;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: Record<string, unknown>;
  }): void {
    this.prisma.auditLog
      .create({
        data: {
          userId: data.userId ?? null,
          action: data.action,
          entityType: data.entityType,
          entityId: data.entityId,
          metadata: (data.metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        },
      })
      .catch((err: unknown) => {
        this.logger.error('Failed to write audit log', err);
      });
  }

  async findAll(dto: QueryAuditLogsDto) {
    const page = Math.max(1, Number(dto.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(dto.limit ?? 50)));

    const where: Prisma.AuditLogWhereInput = {};

    if (dto.userId) where.userId = dto.userId;
    if (dto.entityType) where.entityType = dto.entityType;

    if (dto.action) {
      where.action = { contains: dto.action, mode: 'insensitive' };
    }

    if (dto.q?.trim()) {
      const q = dto.q.trim();
      where.OR = [
        { action: { contains: q, mode: 'insensitive' } },
        { entityType: { contains: q, mode: 'insensitive' } },
        { entityId: { contains: q, mode: 'insensitive' } },
        { user: { fullName: { contains: q, mode: 'insensitive' } } },
      ];
    }

    if (dto.fromDate || dto.toDate) {
      where.createdAt = {
        ...(dto.fromDate ? { gte: new Date(dto.fromDate) } : {}),
        ...(dto.toDate
          ? { lte: new Date(new Date(dto.toDate).setHours(23, 59, 59, 999)) }
          : {}),
      };
    }

    const [total, data] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, fullName: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return { data, total, page, limit };
  }
}
