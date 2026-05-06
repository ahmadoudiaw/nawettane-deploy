import { IsEnum, IsOptional } from 'class-validator';
import { OrganizationType } from '@prisma/client';

export class ListOrganizationsQueryDto {
  @IsOptional()
  @IsEnum(OrganizationType)
  type?: OrganizationType;
}
