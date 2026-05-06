import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ScopeAccess } from '../common/decorators/scope-access.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Roles(Role.SUPER_ADMIN, Role.ONCAV_ADMIN, Role.ORCAV_ADMIN, Role.ODCAV_ADMIN, Role.ZONE_ADMIN)
  @ScopeAccess({ resource: 'organization' })
  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.list(user);
  }

  @Roles(Role.SUPER_ADMIN, Role.ONCAV_ADMIN, Role.ORCAV_ADMIN, Role.ODCAV_ADMIN, Role.ZONE_ADMIN)
  @ScopeAccess({ resource: 'organization' })
  @Get(':id')
  async getById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getById(id, user);
  }

  @Roles(Role.SUPER_ADMIN)
  @Post()
  async create(@Body() dto: CreateUserDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.usersService.create(dto, actor);
  }

  @Roles(Role.SUPER_ADMIN)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.usersService.update(id, dto, actor);
  }

  @Roles(Role.SUPER_ADMIN)
  @Delete(':id')
  async softDelete(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.usersService.softDelete(id, actor);
  }
}
