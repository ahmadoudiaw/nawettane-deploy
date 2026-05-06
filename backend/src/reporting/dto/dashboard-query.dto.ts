import { IsIn, IsOptional, IsString } from 'class-validator';

const REPORT_TYPES = ['match', 'journee', 'poule', 'zone', 'semaine'] as const;

export class DashboardQueryDto {
  @IsOptional()
  @IsIn(REPORT_TYPES)
  reportType?: (typeof REPORT_TYPES)[number];

  @IsOptional()
  @IsString()
  seasonId?: string;

  @IsOptional()
  @IsString()
  regionId?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  communeId?: string;

  @IsOptional()
  @IsString()
  zoneId?: string;

  @IsOptional()
  @IsString()
  matchId?: string;

  @IsOptional()
  @IsString()
  pool?: string;

  @IsOptional()
  @IsString()
  fromDate?: string;

  @IsOptional()
  @IsString()
  toDate?: string;

  @IsOptional()
  @IsString()
  week?: string;
}
