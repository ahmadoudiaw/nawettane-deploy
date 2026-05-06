import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateCommuneDto } from './dto/create-commune.dto';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { CreateRegionDto } from './dto/create-region.dto';
import { UpdateCommuneDto } from './dto/update-commune.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { UpdateRegionDto } from './dto/update-region.dto';
import { TerritoriesService } from './territories.service';

const READ_ROLES = [
  Role.SUPER_ADMIN,
  Role.ONCAV_ADMIN,
  Role.ORCAV_ADMIN,
  Role.ODCAV_ADMIN,
  Role.ZONE_ADMIN,
  Role.AGENT_MAIRIE,
] as const;

const WRITE_ROLES = [Role.SUPER_ADMIN, Role.ONCAV_ADMIN] as const;

@UseGuards(JwtAuthGuard)
@Controller('territories')
export class TerritoriesController {
  constructor(private readonly territoriesService: TerritoriesService) {}

  // ─── Regions ─────────────────────────────────────────────────────────────

  @Roles(...READ_ROLES)
  @Get('regions')
  listRegions() {
    return this.territoriesService.listRegions();
  }

  @Roles(...WRITE_ROLES)
  @Post('regions')
  createRegion(@Body() dto: CreateRegionDto) {
    return this.territoriesService.createRegion(dto);
  }

  @Roles(...WRITE_ROLES)
  @Patch('regions/:id')
  updateRegion(@Param('id') id: string, @Body() dto: UpdateRegionDto) {
    return this.territoriesService.updateRegion(id, dto);
  }

  @Roles(...WRITE_ROLES)
  @Delete('regions/:id')
  deleteRegion(@Param('id') id: string) {
    return this.territoriesService.deleteRegion(id);
  }

  // ─── Departments ─────────────────────────────────────────────────────────

  @Roles(...READ_ROLES)
  @Get('departments')
  listDepartments(@Query('regionId') regionId?: string) {
    return this.territoriesService.listDepartments(regionId);
  }

  @Roles(...WRITE_ROLES)
  @Post('departments')
  createDepartment(@Body() dto: CreateDepartmentDto) {
    return this.territoriesService.createDepartment(dto);
  }

  @Roles(...WRITE_ROLES)
  @Patch('departments/:id')
  updateDepartment(@Param('id') id: string, @Body() dto: UpdateDepartmentDto) {
    return this.territoriesService.updateDepartment(id, dto);
  }

  @Roles(...WRITE_ROLES)
  @Delete('departments/:id')
  deleteDepartment(@Param('id') id: string) {
    return this.territoriesService.deleteDepartment(id);
  }

  // ─── Communes ─────────────────────────────────────────────────────────────

  @Roles(...READ_ROLES)
  @Get('communes')
  listCommunes(@Query('departmentId') departmentId?: string) {
    return this.territoriesService.listCommunes(departmentId);
  }

  @Roles(...WRITE_ROLES)
  @Post('communes')
  createCommune(@Body() dto: CreateCommuneDto) {
    return this.territoriesService.createCommune(dto);
  }

  @Roles(...WRITE_ROLES)
  @Patch('communes/:id')
  updateCommune(@Param('id') id: string, @Body() dto: UpdateCommuneDto) {
    return this.territoriesService.updateCommune(id, dto);
  }

  @Roles(...WRITE_ROLES)
  @Delete('communes/:id')
  deleteCommune(@Param('id') id: string) {
    return this.territoriesService.deleteCommune(id);
  }
}
