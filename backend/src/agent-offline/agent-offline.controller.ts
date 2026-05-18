import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ScopeAccess } from '../common/decorators/scope-access.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { AgentOfflineService } from './agent-offline.service';
import { OfflineSyncDto } from './dto/offline-sync.dto';
import { OfflineTicketsQueryDto } from './dto/offline-tickets-query.dto';

@UseGuards(JwtAuthGuard)
@Controller('agent/offline')
export class AgentOfflineController {
  constructor(private readonly agentOfflineService: AgentOfflineService) {}

  @Roles(Role.SUPER_ADMIN, Role.ZONE_ADMIN, Role.GUICHET_AGENT)
  @ScopeAccess({ resource: 'match' })
  @Get('tickets')
  async getOfflineTickets(
    @Query() query: OfflineTicketsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.agentOfflineService.getOfflineTickets(query.matchId, user);
  }

  @Roles(Role.SUPER_ADMIN, Role.ZONE_ADMIN, Role.GUICHET_AGENT)
  @Post('sync')
  async syncOfflineScans(
    @Body() dto: OfflineSyncDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.agentOfflineService.syncOfflineScans(dto, user);
  }
}
