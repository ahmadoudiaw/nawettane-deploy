import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ScopeAccess } from '../common/decorators/scope-access.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { TeamsService } from './teams.service';

@UseGuards(JwtAuthGuard)
@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Roles(
    Role.SUPER_ADMIN,
    Role.ONCAV_ADMIN,
    Role.ORCAV_ADMIN,
    Role.ODCAV_ADMIN,
    Role.ZONE_ADMIN,
    Role.AGENT_MAIRIE,
  )
  @ScopeAccess({ resource: 'organization' })
  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    return this.teamsService.list(user);
  }

  @Roles(
    Role.SUPER_ADMIN,
    Role.ONCAV_ADMIN,
    Role.ORCAV_ADMIN,
    Role.ODCAV_ADMIN,
    Role.ZONE_ADMIN,
    Role.AGENT_MAIRIE,
  )
  @ScopeAccess({ resource: 'organization' })
  @Get(':id')
  async getById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.teamsService.getById(id, user);
  }

  @Roles(Role.SUPER_ADMIN, Role.ZONE_ADMIN)
  @ScopeAccess({ resource: 'organization' })
  @Post()
  async create(@Body() dto: CreateTeamDto, @CurrentUser() user: AuthenticatedUser) {
    return this.teamsService.create(dto, user);
  }

  @Roles(Role.SUPER_ADMIN, Role.ZONE_ADMIN)
  @ScopeAccess({ resource: 'organization' })
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTeamDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.teamsService.update(id, dto, user);
  }

  @Roles(Role.SUPER_ADMIN, Role.ZONE_ADMIN)
  @ScopeAccess({ resource: 'organization' })
  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.teamsService.delete(id, user);
  }
}
