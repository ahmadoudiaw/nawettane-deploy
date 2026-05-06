import { Controller, Get, Post, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { ImportService } from './import.service';

const FILE_OPTS = { limits: { fileSize: 10 * 1024 * 1024 } };

const IMPORT_ROLES = [
  Role.SUPER_ADMIN,
  Role.ONCAV_ADMIN,
  Role.ORCAV_ADMIN,
  Role.ODCAV_ADMIN,
];

@UseGuards(JwtAuthGuard)
@Controller('import')
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  // ── Territorial imports ─────────────────────────────────────────────────

  @Post('regions')
  @Roles(...IMPORT_ROLES)
  @UseInterceptors(FileInterceptor('file', FILE_OPTS))
  importRegions(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: AuthenticatedUser) {
    return this.importService.importRegions(file, user);
  }

  @Post('departments')
  @Roles(...IMPORT_ROLES)
  @UseInterceptors(FileInterceptor('file', FILE_OPTS))
  importDepartments(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: AuthenticatedUser) {
    return this.importService.importDepartments(file, user);
  }

  @Post('communes')
  @Roles(...IMPORT_ROLES)
  @UseInterceptors(FileInterceptor('file', FILE_OPTS))
  importCommunes(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: AuthenticatedUser) {
    return this.importService.importCommunes(file, user);
  }

  @Post('odcav')
  @Roles(...IMPORT_ROLES)
  @UseInterceptors(FileInterceptor('file', FILE_OPTS))
  importOdcav(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: AuthenticatedUser) {
    return this.importService.importOdcav(file, user);
  }

  // ── Existing imports ────────────────────────────────────────────────────

  @Post('zones')
  @Roles(...IMPORT_ROLES)
  @UseInterceptors(FileInterceptor('file', FILE_OPTS))
  importZones(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: AuthenticatedUser) {
    return this.importService.importZones(file, user);
  }

  @Post('venues')
  @Roles(...IMPORT_ROLES)
  @UseInterceptors(FileInterceptor('file', FILE_OPTS))
  importVenues(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: AuthenticatedUser) {
    return this.importService.importVenues(file, user);
  }

  @Post('teams')
  @Roles(...IMPORT_ROLES)
  @UseInterceptors(FileInterceptor('file', FILE_OPTS))
  importTeams(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: AuthenticatedUser) {
    return this.importService.importTeams(file, user);
  }

  // ── Templates territoriaux ──────────────────────────────────────────────

  @Get('templates/regions')
  @Roles(...IMPORT_ROLES)
  async templateRegions(@Res() res: Response) {
    const buffer = await this.importService.generateRegionsTemplate();
    this.sendTemplate(res, buffer, 'modele_import_regions.xlsx');
  }

  @Get('templates/departments')
  @Roles(...IMPORT_ROLES)
  async templateDepartments(@Res() res: Response) {
    const buffer = await this.importService.generateDepartmentsTemplate();
    this.sendTemplate(res, buffer, 'modele_import_departements.xlsx');
  }

  @Get('templates/communes')
  @Roles(...IMPORT_ROLES)
  async templateCommunes(@Res() res: Response) {
    const buffer = await this.importService.generateCommunesTemplate();
    this.sendTemplate(res, buffer, 'modele_import_communes.xlsx');
  }

  @Get('templates/odcav')
  @Roles(...IMPORT_ROLES)
  async templateOdcav(@Res() res: Response) {
    const buffer = await this.importService.generateOdcavTemplate();
    this.sendTemplate(res, buffer, 'modele_import_odcav.xlsx');
  }

  // ── Templates existants ─────────────────────────────────────────────────

  @Get('templates/zones')
  @Roles(...IMPORT_ROLES)
  async templateZones(@Res() res: Response) {
    const buffer = await this.importService.generateZonesTemplate();
    this.sendTemplate(res, buffer, 'modele_import_zones.xlsx');
  }

  @Get('templates/venues')
  @Roles(...IMPORT_ROLES)
  async templateVenues(@Res() res: Response) {
    const buffer = await this.importService.generateVenuesTemplate();
    this.sendTemplate(res, buffer, 'modele_import_stades.xlsx');
  }

  @Get('templates/teams')
  @Roles(...IMPORT_ROLES)
  async templateTeams(@Res() res: Response) {
    const buffer = await this.importService.generateTeamsTemplate();
    this.sendTemplate(res, buffer, 'modele_import_equipes.xlsx');
  }

  private sendTemplate(res: Response, buffer: Buffer, filename: string) {
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length.toString());
    res.send(buffer);
  }
}
