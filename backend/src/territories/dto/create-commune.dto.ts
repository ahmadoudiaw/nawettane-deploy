import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCommuneDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsString()
  @IsNotEmpty()
  departmentId!: string;
}
