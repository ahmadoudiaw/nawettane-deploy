import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AgeCategory, OrganizationStatus } from '@prisma/client';

export class UpdateTeamDto {
  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(AgeCategory)
  category?: AgeCategory;

  @IsOptional()
  @IsEnum(OrganizationStatus)
  status?: OrganizationStatus;
}
