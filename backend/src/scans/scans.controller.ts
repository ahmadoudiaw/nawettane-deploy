import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ScansService } from './scans.service';
import { ValidateScanDto } from './dto/validate-scan.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { ScopeAccess } from '../common/decorators/scope-access.decorator';

@UseGuards(JwtAuthGuard)
@Controller('scan')
export class ScansController {
  constructor(private readonly scansService: ScansService) {}

  @Roles(Role.SUPER_ADMIN, Role.ZONE_ADMIN, Role.GUICHET_AGENT)
  @ScopeAccess({ resource: 'match' })
  @Post('validate')
  async validate(
    @Body() dto: ValidateScanDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.scansService.validate(dto, user);
  }
}
