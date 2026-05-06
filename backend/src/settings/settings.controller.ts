import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateSuperAdminDto } from './dto/create-super-admin.dto';
import { UpdateAppSettingsDto } from './dto/update-app-settings.dto';
import { UpdatePaymentConfigDto } from './dto/update-payment-config.dto';
import { UpdateSuperAdminDto } from './dto/update-super-admin.dto';
import { SettingsService } from './settings.service';

@UseGuards(JwtAuthGuard)
@Roles(Role.SUPER_ADMIN)
@Controller('admin/settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // ─── Payment config ───────────────────────────────────────────────────────

  @Get('payments')
  getPaymentConfig() {
    return this.settingsService.getPaymentConfig();
  }

  @Put('payments')
  updatePaymentConfig(@Body() dto: UpdatePaymentConfigDto) {
    return this.settingsService.updatePaymentConfig(dto);
  }

  @Post('payments/test')
  testPaymentConfig() {
    return this.settingsService.testPaymentConfig();
  }

  // ─── App settings ────────────────────────────────────────────────────────

  @Get('app')
  getAppSettings() {
    return this.settingsService.getAppSettings();
  }

  @Put('app')
  updateAppSettings(@Body() dto: UpdateAppSettingsDto) {
    return this.settingsService.updateAppSettings(dto);
  }

  // ─── Super admins ─────────────────────────────────────────────────────────

  @Get('super-admins')
  listSuperAdmins() {
    return this.settingsService.listSuperAdmins();
  }

  @Post('super-admins')
  createSuperAdmin(@Body() dto: CreateSuperAdminDto) {
    return this.settingsService.createSuperAdmin(dto);
  }

  @Patch('super-admins/:id')
  updateSuperAdmin(@Param('id') id: string, @Body() dto: UpdateSuperAdminDto) {
    return this.settingsService.updateSuperAdmin(id, dto);
  }

  @Delete('super-admins/:id')
  deactivateSuperAdmin(@Param('id') id: string) {
    return this.settingsService.deactivateSuperAdmin(id);
  }
}
