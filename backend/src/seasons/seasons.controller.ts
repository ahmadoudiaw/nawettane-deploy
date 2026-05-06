import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateSeasonDto } from './dto/create-season.dto';
import { UpdateSeasonDto } from './dto/update-season.dto';
import { SeasonsService } from './seasons.service';

@UseGuards(JwtAuthGuard)
@Controller('seasons')
export class SeasonsController {
  constructor(private readonly seasonsService: SeasonsService) {}

  @Roles(
    Role.SUPER_ADMIN,
    Role.ONCAV_ADMIN,
    Role.ORCAV_ADMIN,
    Role.ODCAV_ADMIN,
    Role.ZONE_ADMIN,
  )
  @Get()
  async list() {
    return this.seasonsService.list();
  }

  @Roles(Role.SUPER_ADMIN, Role.ONCAV_ADMIN)
  @Post()
  async create(@Body() dto: CreateSeasonDto) {
    return this.seasonsService.create(dto);
  }

  @Roles(Role.SUPER_ADMIN, Role.ONCAV_ADMIN)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateSeasonDto) {
    return this.seasonsService.update(id, dto);
  }

  @Roles(Role.SUPER_ADMIN, Role.ONCAV_ADMIN)
  @Post(':id/activate')
  async activate(@Param('id') id: string) {
    return this.seasonsService.activate(id);
  }

  @Roles(Role.SUPER_ADMIN, Role.ONCAV_ADMIN)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.seasonsService.remove(id);
  }
}
