import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateSeasonDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsInt()
  @Min(2000)
  @Max(2100)
  year!: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
