import { IsOptional, IsString } from 'class-validator';

export class UpdateCommuneDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;
}
