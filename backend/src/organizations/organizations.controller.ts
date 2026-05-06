import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ScopeAccess } from '../common/decorators/scope-access.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { ListOrganizationsQueryDto } from './dto/list-organizations-query.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationsService } from './organizations.service';

@UseGuards(JwtAuthGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

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
  async list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListOrganizationsQueryDto) {
    return this.organizationsService.list(user, query.type);
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
  @Get('tree')
  async getTree(@CurrentUser() user: AuthenticatedUser) {
    return this.organizationsService.getTree(user);
  }

  @Roles(Role.SUPER_ADMIN, Role.ONCAV_ADMIN, Role.ORCAV_ADMIN, Role.ODCAV_ADMIN)
  @ScopeAccess({ resource: 'organization' })
  @Post()
  async create(@Body() dto: CreateOrganizationDto, @CurrentUser() user: AuthenticatedUser) {
    return this.organizationsService.create(dto, user);
  }

  @Roles(Role.SUPER_ADMIN, Role.ONCAV_ADMIN, Role.ORCAV_ADMIN, Role.ODCAV_ADMIN)
  @ScopeAccess({ resource: 'organization' })
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.organizationsService.update(id, dto, user);
  }

  @Roles(Role.SUPER_ADMIN, Role.ODCAV_ADMIN)
  @ScopeAccess({ resource: 'organization' })
  @Delete(':id/permanent')
  async permanentDelete(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.organizationsService.permanentDelete(id, user);
  }

  @Roles(Role.SUPER_ADMIN, Role.ONCAV_ADMIN, Role.ORCAV_ADMIN, Role.ODCAV_ADMIN)
  @ScopeAccess({ resource: 'organization' })
  @Delete(':id')
  async softDelete(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.organizationsService.softDelete(id, user);
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
    return this.organizationsService.getById(id, user);
  }
}
