import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ScopeAccess } from '../common/decorators/scope-access.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreateVenueDto } from './dto/create-venue.dto';
import { UpdateVenueDto } from './dto/update-venue.dto';
import { VenuesService } from './venues.service';

@UseGuards(JwtAuthGuard)
@Controller('venues')
export class VenuesController {
  constructor(private readonly venuesService: VenuesService) {}

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
    return this.venuesService.list(user);
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
    return this.venuesService.getById(id, user);
  }

  @Roles(Role.SUPER_ADMIN, Role.ONCAV_ADMIN, Role.ORCAV_ADMIN, Role.ODCAV_ADMIN, Role.ZONE_ADMIN)
  @ScopeAccess({ resource: 'organization' })
  @Post()
  async create(@Body() dto: CreateVenueDto, @CurrentUser() user: AuthenticatedUser) {
    return this.venuesService.create(dto, user);
  }

  @Roles(Role.SUPER_ADMIN, Role.ONCAV_ADMIN, Role.ORCAV_ADMIN, Role.ODCAV_ADMIN, Role.ZONE_ADMIN)
  @ScopeAccess({ resource: 'organization' })
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateVenueDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.venuesService.update(id, dto, user);
  }

  @Roles(Role.SUPER_ADMIN, Role.ONCAV_ADMIN, Role.ORCAV_ADMIN, Role.ODCAV_ADMIN, Role.ZONE_ADMIN)
  @ScopeAccess({ resource: 'organization' })
  @Delete(':id')
  async softDelete(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.venuesService.softDelete(id, user);
  }
}
