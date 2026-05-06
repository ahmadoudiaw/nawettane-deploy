import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ReportingService } from './reporting.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { DashboardQueryDto } from './dto/dashboard-query.dto';
import { ScopeAccess } from '../common/decorators/scope-access.decorator';
import { Response } from 'express';

@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @Roles(
    Role.SUPER_ADMIN,
    Role.ONCAV_ADMIN,
    Role.ORCAV_ADMIN,
    Role.ODCAV_ADMIN,
    Role.ZONE_ADMIN,
    Role.GUICHET_AGENT,
    Role.AGENT_MAIRIE,
  )
  @ScopeAccess({ resource: 'report' })
  @Get('analytics')
  async analytics(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: DashboardQueryDto,
  ) {
    return this.reportingService.getAnalytics(user, query);
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
  @ScopeAccess({ resource: 'report' })
  @Get('dashboard')
  async dashboard(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: DashboardQueryDto,
  ) {
    return this.reportingService.getDashboard(user, query);
  }

  @Roles(
    Role.SUPER_ADMIN,
    Role.ONCAV_ADMIN,
    Role.ORCAV_ADMIN,
    Role.ODCAV_ADMIN,
    Role.ZONE_ADMIN,
    Role.AGENT_MAIRIE,
  )
  @ScopeAccess({ resource: 'report' })
  @Get('exports/matches')
  async exportMatches(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: DashboardQueryDto,
    @Res() res: Response,
  ) {
    const buffer = await this.reportingService.exportMatchesWorkbook(user, query);
    this.sendWorkbook(res, buffer, 'nawettane-matchs.xlsx');
  }

  @Roles(
    Role.SUPER_ADMIN,
    Role.ONCAV_ADMIN,
    Role.ORCAV_ADMIN,
    Role.ODCAV_ADMIN,
    Role.ZONE_ADMIN,
    Role.AGENT_MAIRIE,
  )
  @ScopeAccess({ resource: 'report' })
  @Get('exports/sales-by-match')
  async exportSalesByMatch(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: DashboardQueryDto,
    @Res() res: Response,
  ) {
    const buffer = await this.reportingService.exportSalesByMatchWorkbook(user, query);
    this.sendWorkbook(res, buffer, 'nawettane-ventes-par-match.xlsx');
  }

  @Roles(
    Role.SUPER_ADMIN,
    Role.ONCAV_ADMIN,
    Role.ORCAV_ADMIN,
    Role.ODCAV_ADMIN,
    Role.ZONE_ADMIN,
    Role.AGENT_MAIRIE,
  )
  @ScopeAccess({ resource: 'report' })
  @Get('exports/tickets')
  async exportTickets(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: DashboardQueryDto,
    @Res() res: Response,
  ) {
    const buffer = await this.reportingService.exportTicketsWorkbook(user, query);
    this.sendWorkbook(res, buffer, 'nawettane-tickets-vendus.xlsx');
  }

  @Roles(
    Role.SUPER_ADMIN,
    Role.ONCAV_ADMIN,
    Role.ORCAV_ADMIN,
    Role.ODCAV_ADMIN,
    Role.ZONE_ADMIN,
    Role.AGENT_MAIRIE,
  )
  @ScopeAccess({ resource: 'report' })
  @Get('exports/payments')
  async exportPayments(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: DashboardQueryDto,
    @Res() res: Response,
  ) {
    const buffer = await this.reportingService.exportPaymentsWorkbook(user, query);
    this.sendWorkbook(res, buffer, 'nawettane-paiements.xlsx');
  }

  @Roles(
    Role.SUPER_ADMIN,
    Role.ONCAV_ADMIN,
    Role.ORCAV_ADMIN,
    Role.ODCAV_ADMIN,
    Role.ZONE_ADMIN,
    Role.AGENT_MAIRIE,
  )
  @ScopeAccess({ resource: 'report' })
  @Get('exports/revenue')
  async exportRevenue(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: DashboardQueryDto,
    @Res() res: Response,
  ) {
    const buffer = await this.reportingService.exportRevenueWorkbook(user, query);
    this.sendWorkbook(res, buffer, 'nawettane-recettes.xlsx');
  }

  @Roles(
    Role.SUPER_ADMIN,
    Role.ONCAV_ADMIN,
    Role.ORCAV_ADMIN,
    Role.ODCAV_ADMIN,
    Role.ZONE_ADMIN,
    Role.AGENT_MAIRIE,
  )
  @ScopeAccess({ resource: 'report' })
  @Get('exports/dashboard')
  async exportDashboard(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: DashboardQueryDto,
    @Res() res: Response,
  ) {
    const buffer = await this.reportingService.exportDashboardWorkbook(user, query);
    this.sendWorkbook(res, buffer, 'nawettane-dashboard-global.xlsx');
  }

  private sendWorkbook(res: Response, buffer: Buffer, filename: string) {
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length.toString());
    res.send(buffer);
  }
}
