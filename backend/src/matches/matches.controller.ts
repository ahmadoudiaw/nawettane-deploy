import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { MatchesService } from './matches.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ScopeAccess } from '../common/decorators/scope-access.decorator';
import { CreateMatchDto } from './dto/create-match.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { UpdateMatchDto } from './dto/update-match.dto';
import { ListMatchesQueryDto } from './dto/list-matches-query.dto';
import { CheckAvailabilityQueryDto } from './dto/check-availability-query.dto';

@UseGuards(JwtAuthGuard)
@Controller('matches')
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Roles(
    Role.SUPER_ADMIN,
    Role.ONCAV_ADMIN,
    Role.ORCAV_ADMIN,
    Role.ODCAV_ADMIN,
    Role.ZONE_ADMIN,
    Role.GUICHET_AGENT,
    Role.AGENT_MAIRIE,
  )
  @ScopeAccess({ resource: 'match' })
  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListMatchesQueryDto,
  ) {
    return this.matchesService.list(user, query);
  }

  @Roles(Role.SUPER_ADMIN, Role.ZONE_ADMIN)
  @ScopeAccess({ resource: 'match' })
  @Post()
  async create(
    @Body() dto: CreateMatchDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.matchesService.create(dto, user);
  }

  @Roles(
    Role.SUPER_ADMIN,
    Role.ONCAV_ADMIN,
    Role.ORCAV_ADMIN,
    Role.ODCAV_ADMIN,
    Role.ZONE_ADMIN,
    Role.GUICHET_AGENT,
    Role.AGENT_MAIRIE,
  )
  @Get('availability')
  async checkAvailability(@Query() query: CheckAvailabilityQueryDto) {
    return this.matchesService.checkVenueAvailability({
      venueId: query.venueId,
      matchDate: new Date(query.matchDate),
      durationMinutes: query.durationMinutes ? Number(query.durationMinutes) : undefined,
      bufferMinutes: query.bufferMinutes ? Number(query.bufferMinutes) : undefined,
      excludeMatchId: query.excludeMatchId,
    });
  }

  @Roles(
    Role.SUPER_ADMIN,
    Role.ONCAV_ADMIN,
    Role.ORCAV_ADMIN,
    Role.ODCAV_ADMIN,
    Role.ZONE_ADMIN,
    Role.GUICHET_AGENT,
  )
  @ScopeAccess({ resource: 'match' })
  @Get(':id')
  async getById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.matchesService.getById(id, user);
  }

  @Roles(Role.SUPER_ADMIN, Role.ZONE_ADMIN)
  @ScopeAccess({ resource: 'match' })
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateMatchDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.matchesService.update(id, dto, user);
  }

  @Roles(Role.SUPER_ADMIN, Role.ZONE_ADMIN)
  @ScopeAccess({ resource: 'match' })
  @Post(':id/publish')
  async publish(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.matchesService.publish(id, user);
  }

  @Roles(Role.SUPER_ADMIN, Role.ZONE_ADMIN)
  @ScopeAccess({ resource: 'match' })
  @Patch(':id/cancel')
  async deactivate(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.matchesService.deactivate(id, user);
  }

  @Roles(Role.SUPER_ADMIN, Role.ZONE_ADMIN)
  @ScopeAccess({ resource: 'match' })
  @Delete(':id')
  async permanentDelete(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.matchesService.permanentDelete(id, user);
  }
}
