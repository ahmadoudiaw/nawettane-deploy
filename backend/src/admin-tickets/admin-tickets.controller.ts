import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { AdminTicketsService } from './admin-tickets.service';
import { CancelTicketDto } from './dto/cancel-ticket.dto';
import { QueryAdminTicketsDto } from './dto/query-admin-tickets.dto';

@ApiTags('admin-tickets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Roles(
  Role.SUPER_ADMIN,
  Role.ONCAV_ADMIN,
  Role.ORCAV_ADMIN,
  Role.ODCAV_ADMIN,
  Role.ZONE_ADMIN,
)
@Controller('admin/tickets')
export class AdminTicketsController {
  constructor(private readonly adminTicketsService: AdminTicketsService) {}

  @Get()
  findAll(@Query() query: QueryAdminTicketsDto) {
    return this.adminTicketsService.findAll(query);
  }

  @Patch(':id/cancel')
  cancel(
    @Param('id') id: string,
    @Body() dto: CancelTicketDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adminTicketsService.cancel(id, dto, user);
  }
}
