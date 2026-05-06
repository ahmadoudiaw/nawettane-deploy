import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { AgeCategory } from '@prisma/client';
import { MatchTicketCategoryDto } from './match-ticket-category.dto';

export class CreateMatchDto {
  @IsString()
  @IsNotEmpty()
  seasonId!: string;

  @IsString()
  @IsNotEmpty()
  organizationId!: string;

  @IsString()
  @IsNotEmpty()
  venueId!: string;

  @IsString()
  @IsNotEmpty()
  homeTeamId!: string;

  @IsString()
  @IsNotEmpty()
  awayTeamId!: string;

  @IsString()
  @IsNotEmpty()
  competitionName!: string;

  @IsNotEmpty()
  @IsEnum(AgeCategory)
  category!: AgeCategory;

  @IsString()
  stage?: string;

  @IsDateString()
  matchDate!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  ticketQuota!: number;

  @IsOptional()
  @IsString()
  ticketPrice!: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MatchTicketCategoryDto)
  ticketCategories?: MatchTicketCategoryDto[];
}
