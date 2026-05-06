import { Controller, Get } from '@nestjs/common';
import { SettingsService } from './settings.service';

@Controller('public')
export class PublicSettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('app-settings')
  getAppSettings() {
    return this.settingsService.getAppSettings();
  }
}
