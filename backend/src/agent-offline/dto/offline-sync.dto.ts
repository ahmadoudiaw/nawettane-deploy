import { Type } from 'class-transformer';
import {
  IsArray,
  IsISO8601,
  IsNotEmpty,
  IsString,
  ValidateNested,
} from 'class-validator';

export class OfflineScanItemDto {
  @IsString()
  @IsNotEmpty()
  localScanId!: string;

  @IsString()
  @IsNotEmpty()
  ticketId!: string;

  @IsString()
  @IsNotEmpty()
  ticketCode!: string;

  @IsString()
  @IsNotEmpty()
  matchId!: string;

  @IsISO8601()
  scannedAtLocal!: string;
}

export class OfflineSyncDto {
  @IsString()
  @IsNotEmpty()
  deviceId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OfflineScanItemDto)
  scans!: OfflineScanItemDto[];
}
