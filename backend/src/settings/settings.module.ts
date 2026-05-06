import { Module } from '@nestjs/common';
import { PublicSettingsController } from './public-settings.controller';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Module({
  controllers: [SettingsController, PublicSettingsController],
  providers: [SettingsService],
})
export class SettingsModule {}
