import { IsHexColor, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class MatchTicketCategoryDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  price!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quota?: number | null;

  @IsHexColor()
  badgeColor!: string;
}
