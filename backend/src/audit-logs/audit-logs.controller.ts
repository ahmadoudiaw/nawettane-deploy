import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuditLogsService } from './audit-logs.service';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard)
@Roles(
  Role.SUPER_ADMIN,
  Role.ONCAV_ADMIN,
  Role.ORCAV_ADMIN,
  Role.ODCAV_ADMIN,
  Role.ZONE_ADMIN,
)
@Controller('admin/audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  async findAll(@Query() dto: QueryAuditLogsDto) {
    return this.auditLogsService.findAll(dto);
  }
}
