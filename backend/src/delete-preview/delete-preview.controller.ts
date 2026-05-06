import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { DeletePreviewService } from './delete-preview.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard)
@Roles(
  Role.SUPER_ADMIN,
  Role.ONCAV_ADMIN,
  Role.ORCAV_ADMIN,
  Role.ODCAV_ADMIN,
  Role.ZONE_ADMIN,
)
@Controller('admin/delete-preview')
export class DeletePreviewController {
  constructor(private readonly service: DeletePreviewService) {}

  @Get(':entity/:id')
  getPreview(@Param('entity') entity: string, @Param('id') id: string) {
    return this.service.getPreview(entity, id);
  }
}
