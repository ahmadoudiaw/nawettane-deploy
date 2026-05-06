import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { AgeCategory, OrganizationStatus } from '@prisma/client';

export class CreateTeamDto {
  @IsString()
  @IsNotEmpty()
  organizationId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsNotEmpty()
  @IsEnum(AgeCategory)
  category!: AgeCategory;

  @IsOptional()
  @IsEnum(OrganizationStatus)
  status?: OrganizationStatus;
}
